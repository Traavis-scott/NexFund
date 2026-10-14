# FIXES PRIORITAIRES - Action Plan

## TIER 1: CRITIQUES (This Week)

### 1. Sécuriser les secrets

**Status**: 🔴 BLOCKER  
**Effort**: 30 minutes  

```bash
# 1. Retirer .env du tracking
git rm --cached .env
git commit -m "Remove secrets from repo"

# 2. Créer .gitignore.local
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore

# 3. Régénérer les clés
# - Aller sur Supabase Dashboard
# - Regenerate Anon Key
# - Regenerate Service Role Key
# - Update LYGOS_API_KEY

# 4. Créer .env.example
cat > .env.example << 'EOF'
# Public (safe)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Private (use environment variables in CI/CD)
# SUPABASE_SERVICE_ROLE_KEY=set-in-CI
# LYGOS_API_KEY=set-in-CI
EOF
```

---

### 2. Fix RLS Policies

**Status**: 🔴 BLOCKER  
**File**: `supabase/migrations/20250406144048_little_surf.sql`  
**Effort**: 1 hour

Create new migration:

```sql
/*
  # Add missing RLS policies for DELETE and UPDATE
  
  1. Add DELETE policies for data cleanup
  2. Add UPDATE policies for subscription management
  3. Allow users to manage their own data
*/

-- Add DELETE policy for historical_data
CREATE POLICY "Users can delete their own historical data"
  ON historical_data
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add DELETE policy for backtest_results
CREATE POLICY "Users can delete their own backtest results"
  ON backtest_results
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add UPDATE policy for user_subscriptions (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_subscriptions' 
    AND policyname = 'Users can update their own subscription'
  ) THEN
    CREATE POLICY "Users can update their own subscription"
      ON user_subscriptions
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
```

---

### 3. Fix Webhook Signature Validation

**Status**: 🔴 BLOCKER  
**File**: `supabase/functions/lygos-webhook/index.ts`  
**Effort**: 2 hours

```typescript
import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

async function verifyLygosSignature(
  payload: string,
  signature: string
): Promise<boolean> {
  const secret = Deno.env.get("LYGOS_WEBHOOK_SECRET");
  if (!secret) {
    console.error("LYGOS_WEBHOOK_SECRET not configured");
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signatureBuffer = new Uint8Array(
      signature.match(/[\da-f]{2}/gi)!.map((x) => parseInt(x, 16))
    );
    const payloadBuffer = encoder.encode(payload);

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBuffer,
      payloadBuffer
    );

    return isValid;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("Lygos-Signature");
    if (!signature) {
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.text();
    const isValid = await verifyLygosSignature(body, signature);

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const event = JSON.parse(body);
    const eventType = event.type;
    const customerEmail = event.data.object.customer_email;

    if (eventType === "checkout.session.completed") {
      // Get user via RPC function (safer than direct auth.users access)
      const { data: { user_id }, error: userError } = await supabase
        .rpc("get_user_id_by_email", { email: customerEmail });

      if (userError || !user_id) {
        throw new Error("User not found");
      }

      const { error: subscriptionError } = await supabase
        .from("user_subscriptions")
        .update({
          stripe_customer_id: event.data.object.customer,
          stripe_subscription_id: event.data.object.subscription,
          current_period_end: new Date(
            event.data.object.current_period_end * 1000
          ).toISOString(),
          cancel_at_period_end: false,
        })
        .eq("user_id", user_id);

      if (subscriptionError) throw subscriptionError;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

Add RPC function to migrations:
```sql
CREATE OR REPLACE FUNCTION get_user_id_by_email(email text)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = email;
  RETURN user_id;
END;
$$;
```

---

### 4. Add Input Validation (Zod)

**Status**: 🔴 BLOCKER  
**Files**: All edge functions  
**Effort**: 3 hours

First, add to dependencies in each edge function:

```typescript
import { z } from "npm:zod@3.22.4";

// In upload-data/index.ts
const RecordSchema = z.object({
  timestamp: z.string().datetime(),
  instrument: z.string().min(1).max(50),
  open: z.coerce.number().positive("Open price must be positive"),
  high: z.coerce.number().positive("High price must be positive"),
  low: z.coerce.number().positive("Low price must be positive"),
  close: z.coerce.number().positive("Close price must be positive"),
  volume: z.coerce.number().min(0, "Volume cannot be negative"),
});

const validateRecords = z.array(RecordSchema);

// Usage:
const validated = validateRecords.parse(records); // Throws if invalid
```

---

### 5. Add Rate Limiting

**Status**: 🔴 BLOCKER  
**Effort**: 2 hours

Create `supabase/functions/_shared/rate-limiter.ts`:

```typescript
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function createRateLimiter(maxRequests: number, windowSeconds: number) {
  return function checkRateLimit(identifier: string): {
    allowed: boolean;
    remaining: number;
    resetIn: number;
  } {
    const now = Date.now();
    let record = rateLimitStore.get(identifier);

    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + windowSeconds * 1000 };
    }

    const remaining = maxRequests - record.count;

    if (record.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: Math.ceil((record.resetTime - now) / 1000),
      };
    }

    record.count++;
    rateLimitStore.set(identifier, record);

    return {
      allowed: true,
      remaining: remaining - 1,
      resetIn: Math.ceil((record.resetTime - now) / 1000),
    };
  };
}
```

Usage in edge functions:

```typescript
import { createRateLimiter } from "../_shared/rate-limiter.ts";

const limiter = createRateLimiter(10, 60); // 10 requests per 60 seconds

Deno.serve(async (req) => {
  const userId = req.headers.get("X-User-Id");
  const { allowed, remaining, resetIn } = limiter(userId);

  if (!allowed) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded", resetIn }),
      { status: 429 }
    );
  }

  // ... rest of function
});
```

---

### 6. Fix Mock Data Issue

**Status**: 🔴 BLOCKER  
**File**: `supabase/functions/train-model/index.ts`  
**Effort**: Depends on approach

Choose one:

**Option A: Label as Demo (Quick Fix)**
```typescript
return new Response(
  JSON.stringify({
    success: true,
    isDemoMode: true, // ← Clear flag
    warning: "These are simulated results for demonstration purposes",
    results: { ... }
  }),
  { headers: ... }
);
```

**Option B: Implement Simple Backtest (Better)**
```typescript
// Simplified backtest logic
function simpleBacktest(data: any[], parameters: any) {
  let trades = 0;
  let wins = 0;
  let totalPL = 0;

  for (let i = parameters.lookback; i < data.length; i++) {
    const slice = data.slice(i - parameters.lookback, i);
    const avgPrice = slice.reduce((sum, d) => sum + d.close_price, 0) / slice.length;
    const current = data[i].close_price;

    if (current > avgPrice * (1 + parameters.threshold)) {
      // Buy signal
      if (i + 1 < data.length) {
        const nextPrice = data[i + 1].close_price;
        const pl = nextPrice - current;
        totalPL += pl;
        if (pl > 0) wins++;
        trades++;
      }
    }
  }

  return {
    win_rate: trades > 0 ? wins / trades : 0,
    profit_loss: (totalPL / data[0].close_price) * 100,
    total_trades: trades,
    sharpe_ratio: calculateSharpe(/* ... */),
    max_drawdown: calculateDrawdown(/* ... */)
  };
}
```

---

## TIER 2: MAJORS (Week 2)

### 7. Remove Duplicate Component

```bash
rm src/components/Datauploader.tsx
```

Update imports if needed.

---

### 8. Implement Error Boundaries

**File**: `src/App.tsx`  
**Effort**: 2 hours

```typescript
import { useState } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('Error caught:', error);
    // Send to error tracking service (Sentry)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-red-500 mb-2">Oops!</h1>
            <p className="text-foreground/60 mb-4">
              Une erreur est survenue. Veuillez rafraîchir la page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
            >
              Rafraîchir
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        {/* Routes */}
      </Router>
    </ErrorBoundary>
  );
}
```

---

### 9. Create AuthContext

**File**: `src/lib/AuthContext.tsx`  
**Effort**: 2 hours

```typescript
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  user: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription?.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, user: session?.user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

Then update all components to use `useAuth()` instead of calling `getSession()`.

---

### 10. Add Tests

**File**: `src/__tests__/` directory  
**Effort**: 8 hours

Install test dependencies:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @vitest/ui
```

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.ts',
  },
});
```

Example tests:

```typescript
// src/__tests__/components/AuthForm.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthForm } from '@/components/auth/AuthForm';

describe('AuthForm', () => {
  it('renders login form', () => {
    render(<AuthForm />);
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
  });

  it('shows error when fields are empty', async () => {
    render(<AuthForm />);
    fireEvent.click(screen.getByText(/connexion/i));
    // Assert error shown
  });
});
```

---

## TIER 3: NICE-TO-HAVE (Week 3+)

### 11. Code Splitting

```typescript
// src/pages/index.tsx
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const DataPage = lazy(() => import('./DataPage'));
const HistoryPage = lazy(() => import('./HistoryPage'));

export function App() {
  return (
    <Routes>
      <Route
        path="/data"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <DataPage />
          </Suspense>
        }
      />
    </Routes>
  );
}
```

### 12. CORS Restrictions

Update all edge functions:

```typescript
const ALLOWED_ORIGINS = [
  "https://nexfund.com",
  "https://app.nexfund.com",
  Deno.env.get("FRONTEND_URL"),
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";

  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin)
      ? origin
      : "",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Client-Info, Apikey",
    "Access-Control-Max-Age": "86400",
  };
}

Deno.serve(async (req) => {
  const headers = getCorsHeaders(req);
  // ... rest
});
```

---

## Implementation Checklist

- [ ] Tier 1 - Security (This week)
  - [ ] Secure secrets
  - [ ] Fix RLS policies
  - [ ] Fix webhook signature
  - [ ] Add validation (Zod)
  - [ ] Add rate limiting
  - [ ] Fix mock data

- [ ] Tier 2 - Quality (Week 2)
  - [ ] Remove duplicate component
  - [ ] Add error boundaries
  - [ ] Create AuthContext
  - [ ] Add 30+ tests
  - [ ] Add API documentation

- [ ] Tier 3 - Performance (Week 3+)
  - [ ] Code splitting
  - [ ] CORS restrictions
  - [ ] Loading skeletons
  - [ ] Analytics
  - [ ] Monitoring

---

**Total Estimated Time**: 30-40 hours  
**Critical Path**: Tier 1 + Tier 2 = 2 weeks before production