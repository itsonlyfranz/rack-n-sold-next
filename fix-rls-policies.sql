-- fix-rls-policies.sql
-- Fix for RLS policies and users table structure without admin functionality

-- 1. Add username column to users table if it doesn't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username TEXT;

-- 2. Drop problematic and duplicate policies
DROP POLICY IF EXISTS "Admin can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view their own wallet address" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own wallet address" ON public.users;

-- 3. Create clean, non-recursive policies
-- User view their own data policy
CREATE POLICY "Users can view own data" ON public.users
FOR SELECT
USING (auth.uid() = id);

-- User update their own data policy
CREATE POLICY "Users can update own data" ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. Update existing user records to set username from email if needed
UPDATE public.users 
SET username = SPLIT_PART(email, '@', 1)
WHERE username IS NULL;

-- Done! Your RLS policies should now work without recursion issues. 