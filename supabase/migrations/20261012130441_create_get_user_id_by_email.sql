/*
# Create get_user_id_by_email helper function

1. New Functions
- `get_user_id_by_email`: SECURITY DEFINER function that looks up a user UUID by email.
  Used by the lygos-webhook edge function to resolve customer emails to user IDs.
*/

CREATE OR REPLACE FUNCTION get_user_id_by_email(user_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_uuid uuid;
BEGIN
  SELECT id INTO user_uuid FROM auth.users WHERE email = user_email LIMIT 1;
  RETURN user_uuid;
END;
$$;
