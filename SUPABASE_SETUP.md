# Rack n Sold - Supabase Setup Guide

This guide will help you set up your Supabase project to work with the Rack n Sold application.

## 1. Supabase Project Setup

1. Sign in to your [Supabase Dashboard](https://app.supabase.com)
2. Create a new project if you haven't already (the free tier is sufficient for development)
3. Take note of your project URL and anon key, which should already be in your `.env.local` file

## 2. Database Setup

Run the SQL commands from `setup-supabase.sql` in the Supabase SQL Editor. This will:
- Create the necessary tables (users, artworks, cart_items)
- Set up Row Level Security policies
- Create triggers for automatic timestamp updates

### Alternative Manual Setup

If you prefer to set up the tables manually:

1. Go to your Supabase dashboard → SQL Editor
2. Copy the contents of `setup-supabase.sql` 
3. Paste into the SQL Editor and run the commands

## 3. Storage Bucket Setup

1. Go to Storage in your Supabase dashboard
2. Create two new buckets:
   - `artworks` - for storing artwork images
   - `profiles` - for storing user profile images

3. For each bucket, set bucket permissions from the "Policies" tab:
   - Create a policy for anonymous reads (if you want public images)
   - Create a policy for authenticated uploads

Example policy for artworks bucket:
- Policy name: "Anyone can view artwork images"
- For operation: SELECT
- Using expression: true

- Policy name: "Authenticated users can upload artwork images"
- For operation: INSERT
- Using expression: auth.role() = 'authenticated'

## 4. Authentication Setup

The authentication setup should already be working with the current configuration. The login functionality uses Supabase Auth with email/password authentication.

1. Go to Authentication → Providers in your Supabase dashboard
2. Ensure Email provider is enabled
3. Configure additional providers as needed (e.g., OAuth providers)

## 5. Testing

Create a test user through the sign-up process. You should be able to:
1. Register a new account
2. Log in with the account
3. Access the artists page to upload artwork
4. View your uploaded artworks

## Troubleshooting

- If login doesn't work, check browser console for errors
- Verify your environment variables in `.env.local` match your Supabase project
- Ensure all tables have been created with the correct schema
- Check that storage buckets exist and have the right permissions 