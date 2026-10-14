# Scripts d'Automatisation & Correction

## Quick Fixes - Commandes Immédiates

### 1. Nettoyer Duplicate Component

```bash
# Vérifier les deux composants
ls -la src/components/Datauploader.tsx src/components/ui/DataUploader.tsx

# Voir quoi garder (La version ui/DataUploader est meilleure)
wc -l src/components/Datauploader.tsx src/components/ui/DataUploader.tsx

# Supprimer l'ancien
rm src/components/Datauploader.tsx

# Vérifier qu'il n'y a pas de references
grep -r "Datauploader" src/ --exclude-dir=node_modules

# Vérifier l'import correct
grep -r "DataUploader" src/ --exclude-dir=node_modules
# Devrait voir: src/components/data/DataManager.tsx
# et src/pages/DataPage.tsx
```

### 2. Nettoyer les migrations vides

```bash
# Voir les migrations vides
wc -l supabase/migrations/*.sql

# Supprimer les petites:
# - 20250406135829_foggy_lab.sql (0 bytes)
# - 20250406135901_super_block.sql (0 bytes)  
# - 20250406135906_orange_dust.sql (0 bytes)

for file in supabase/migrations/20250406135829_foggy_lab.sql \
            supabase/migrations/20250406135901_super_block.sql \
            supabase/migrations/20250406135906_orange_dust.sql; do
  if [ -f "$file" ] && [ ! -s "$file" ]; then
    rm "$file"
    echo "Removed: $file"
  fi
done
```

### 3. Cleanup Environment

```bash
# Créer .env.example
cat > .env.example << 'EOF'
# Supabase Configuration (PUBLIC - safe to commit)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Note: PRIVATE keys should be set via CI/CD environment variables:
# - SUPABASE_SERVICE_ROLE_KEY
# - LYGOS_API_KEY
# - LYGOS_WEBHOOK_SECRET
EOF

# Update .gitignore
echo ".env.local" >> .gitignore
echo "*.env" >> .gitignore
echo ".env" >> .gitignore
echo "!.env.example" >> .gitignore

# Verify
git check-ignore .env
```

---

## Code Quality Scripts

### 1. ESLint Fix

```bash
# Fix all auto-fixable issues
npm run lint -- --fix

# Check remaining issues
npm run lint
```

### 2. Check for Common Issues

```bash
# Find `any` types
grep -r ": any" src/ --include="*.tsx" --include="*.ts" | wc -l

# Find untyped functions
grep -r "function.*)" src/ --include="*.tsx" | head -5

# Find console.logs in production
grep -r "console\." src/ --include="*.tsx" --include="*.ts" | grep -v "__tests__"

# Find TODO/FIXME comments
grep -rn "TODO\|FIXME" src/
```

### 3. Bundle Size Analysis

```bash
# Build et analyser
npm run build

# Voir le résumé
# dist/assets/index-*.js    1,040.47 kB │ gzip: 306.29 kB

# Détailler avec visualizer
npm install --save-dev rollup-plugin-visualizer
```

---

## Database Scripts

### 1. Validate RLS Policies

```sql
-- Check all tables with RLS enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE rowsecurity = true;

-- Check all policies on a table
SELECT policyname, permissive, qual, with_check
FROM pg_policies 
WHERE tablename = 'historical_data';

-- Find tables WITHOUT RLS
SELECT schemaname, tablename 
FROM pg_tables 
WHERE rowsecurity = false 
AND schemaname = 'public';

-- Find tables WITHOUT any policies
SELECT table_name 
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
AND NOT EXISTS (
  SELECT 1 FROM pg_policies p 
  WHERE p.tablename = t.table_name
);
```

### 2. Add Missing Indexes

```sql
-- Check existing indexes
SELECT indexname, tablename, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public';

-- Add performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_historical_data_user_timestamp
ON historical_data(user_id, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_backtest_results_user_created
ON backtest_results(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_subscriptions_user_id
ON user_subscriptions(user_id);
```

### 3. Audit Queries

```sql
-- Check slow queries
SELECT query_id, query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Row counts
SELECT tablename, n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
```

---

## Performance Profiling

### 1. Lighthouse Check (if deployed)

```bash
npm install -g @lhci/cli@latest

# Run lighthouse
lhci autorun

# Config: .lighthouserc.json
cat > .lighthouserc.json << 'EOF'
{
  "ci": {
    "collect": {
      "url": ["https://your-app.com"]
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.8 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }]
      }
    }
  }
}
EOF
```

### 2. Bundle Analysis

```bash
# Vite built-in stats
npm run build -- --ssrManifest

# Check import sizes
npm install -D import-cost

# Or use esbuild analyzer
npm install -D esbuild-visualizer
```

### 3. React DevTools Profiler

```javascript
// In browser console when app loads
import React from 'react';
React.Profiler.onRender = (id, phase, actualDuration) => {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
};
```

---

## Testing Setup Scripts

### 1. Initialize Vitest

```bash
# Install dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom

# Create config
cat > vitest.config.ts << 'EOF'
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
EOF

# Create setup file
mkdir -p src/__tests__
cat > src/__tests__/setup.ts << 'EOF'
import '@testing-library/jest-dom';
EOF

# Update package.json scripts
npm set-script test "vitest"
npm set-script test:ui "vitest --ui"
npm set-script test:coverage "vitest --coverage"
```

### 2. Create Test Template

```bash
cat > src/__tests__/components/AuthForm.test.tsx << 'EOF'
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthForm } from '@/components/auth/AuthForm';

describe('AuthForm', () => {
  const renderWithRouter = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        {component}
      </BrowserRouter>
    );
  };

  it('should render login form by default', () => {
    renderWithRouter(<AuthForm />);
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/mot de passe/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /connexion/i })).toBeInTheDocument();
  });

  it('should switch to signup form when toggled', async () => {
    renderWithRouter(<AuthForm />);
    const toggleButton = screen.getByText(/pas encore de compte/i);
    
    fireEvent.click(toggleButton);
    
    expect(screen.getByRole('button', { name: /inscrire/i })).toBeInTheDocument();
  });

  it('should show error with empty fields', async () => {
    renderWithRouter(<AuthForm />);
    const submitButton = screen.getByRole('button', { name: /connexion/i });
    
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /connexion/i })).toBeDisabled();
    });
  });
});
EOF

# Run tests
npm test
npm test:ui
npm test:coverage
```

---

## Security Audit Scripts

### 1. Dependency Audit

```bash
# Check for known vulnerabilities
npm audit

# Fix automatically where possible
npm audit fix

# See what would be fixed
npm audit fix --dry-run

# Check specific packages
npm outdated
```

### 2. Secret Scanning

```bash
# Install secret scanner
npm install -D @leakscan/cli

# Scan repo
npx @leakscan/cli scan .

# Or use Gitleaks
brew install gitleaks
gitleaks detect --source . --verbose
```

### 3. SAST Scanning

```bash
# Use SonarQube locally
npm install -D sonarqube-scanner

# Create sonar-project.properties
cat > sonar-project.properties << 'EOF'
sonar.projectKey=nexfund
sonar.projectName=NexFund
sonar.sources=src
sonar.exclusions=node_modules/**,**/*.test.ts
EOF
```

---

## Deployment Scripts

### 1. Pre-deployment Checklist

```bash
#!/bin/bash
# pre-deploy.sh

set -e

echo "🔍 Running pre-deployment checks..."

# Check environment variables
echo "✓ Checking environment variables..."
required_vars=("VITE_SUPABASE_URL" "VITE_SUPABASE_ANON_KEY")
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing environment variable: $var"
    exit 1
  fi
done

# Run linter
echo "✓ Running linter..."
npm run lint || exit 1

# Run tests
echo "✓ Running tests..."
npm test -- --run || exit 1

# Build
echo "✓ Building..."
npm run build || exit 1

# Check bundle size
echo "✓ Checking bundle size..."
BUNDLE_SIZE=$(du -sh dist/ | awk '{print $1}')
echo "  Bundle size: $BUNDLE_SIZE"

echo ""
echo "✅ All checks passed! Ready to deploy."
```

### 2. CI/CD GitHub Actions

```yaml
# .github/workflows/test-and-deploy.yml
name: Test & Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Run tests
        run: npm test -- --run

      - name: Build
        run: npm run build

      - name: Check bundle size
        run: npx bundlesize

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        run: npm run deploy
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

### 3. Environment Variable Setup

```bash
# Create secure env file for production
cat > .env.production << 'EOF'
# These come from CI/CD secrets
VITE_SUPABASE_URL=$VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
EOF

# Configure in Vercel/Netlify UI:
# Settings → Environment Variables
# Add: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
# Add PRIVATE: SUPABASE_SERVICE_ROLE_KEY, LYGOS_API_KEY
```

---

## Monitoring & Logging

### 1. Setup Error Tracking (Sentry)

```bash
npm install --save @sentry/react @sentry/tracing

# In main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

### 2. Setup Analytics (PostHog)

```bash
npm install posthog-js

# In main.tsx
import posthog from 'posthog-js';

posthog.init(
  import.meta.env.VITE_POSTHOG_KEY,
  {
    api_host: import.meta.env.VITE_POSTHOG_HOST,
  }
);
```

### 3. Setup Logging

```bash
npm install winston

# Create logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

export default logger;
```

---

## Maintenance Scripts

### 1. Weekly Audit

```bash
#!/bin/bash
# weekly-audit.sh

echo "📋 Weekly Maintenance Report"
echo "=============================="
echo ""

# Dependencies
echo "🔄 Checking outdated dependencies..."
npm outdated

# Security
echo ""
echo "🔒 Security audit..."
npm audit --audit-level=moderate

# Tests
echo ""
echo "✓ Running test suite..."
npm test -- --run

# Size
echo ""
echo "📦 Bundle size check..."
npm run build | tail -5

echo ""
echo "✅ Weekly audit complete!"
```

### 2. Database Maintenance

```sql
-- Run monthly
VACUUM ANALYZE;
REINDEX DATABASE postgres;

-- Check table bloat
SELECT schemaname, tablename, 
  round(100.0 * (CASE WHEN otta > 0 
    THEN sml.relpages - otta 
    ELSE 0.0 END) / sml.relpages, 2) as table_waste_ratio
FROM pg_class sml
WHERE sml.relname = 'historical_data';

-- Clean old test data
DELETE FROM backtest_results 
WHERE created_at < NOW() - INTERVAL '90 days'
AND user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@test.com'
);
```

---

## Documentation Generation

### 1. Generate API Docs

```bash
npm install -D typedoc

# Create typedoc.json
cat > typedoc.json << 'EOF'
{
  "entryPoints": ["src/lib/**/*.ts"],
  "out": "docs/api",
  "documentation": [
    {
      "name": "Library",
      "children": ["supabase", "types", "utils"]
    }
  ]
}
EOF

# Generate
npx typedoc
```

### 2. Generate Component Docs

```bash
npm install -D storybook @storybook/react

# Initialize Storybook
npx storybook@latest init --type react
```

---

## Useful Commands Summary

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run preview         # Preview production build
npm run lint            # Check code quality
npm test                # Run tests
npm test:ui             # Run tests with UI
npm test:coverage       # Generate coverage report

# Database
npm run db:migrate      # Apply migrations (if script exists)
npm run db:reset        # Reset database (DEV ONLY)

# Security
npm audit               # Check for vulnerabilities
npm audit fix           # Fix vulnerabilities automatically

# Performance
npm run analyze         # Analyze bundle size
npm run lighthouse      # Run Lighthouse audit

# Deployment
npm run build           # Build for production
npm run deploy          # Deploy to production
```

---

**🎯 Use these scripts as part of your CI/CD pipeline for automated quality assurance!**