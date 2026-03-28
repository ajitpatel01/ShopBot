-- User profile mirror of auth.users for analytics and guest tracking.
-- Run in Supabase SQL Editor after prior migrations.
--
-- Also enable Anonymous sign-ins: Supabase Dashboard → Authentication → Providers → Anonymous.

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  is_guest boolean DEFAULT false,
  last_login_at timestamptz DEFAULT now(),
  login_count int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Select / insert / update only own row
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Increment login_count for existing profile (caller must own row via RLS)
CREATE OR REPLACE FUNCTION public.increment_login_count(user_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  new_count int;
BEGIN
  UPDATE public.profiles
  SET
    login_count = login_count + 1,
    last_login_at = now()
  WHERE id = user_id
  RETURNING login_count INTO new_count;
  RETURN COALESCE(new_count, 0);
END;
$$;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_login_count(uuid) TO authenticated;
