// This script helps set up your Supabase project programmatically
// Run with: node setup-supabase.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Create a Supabase client with the service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupSupabase() {
  console.log('Setting up Supabase project...');

  try {
    // 1. Check for existing storage buckets
    console.log('Checking storage buckets...');
    
    // Check artworks bucket
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }
    
    const artworksBucketExists = existingBuckets.some(bucket => bucket.name === 'artworks');
    const artworkImagesBucketExists = existingBuckets.some(bucket => bucket.name === 'artwork_images');
    const profilesBucketExists = existingBuckets.some(bucket => bucket.name === 'profiles');
    
    // Create artworks bucket if it doesn't exist
    if (!artworksBucketExists) {
      console.log('Creating artworks bucket...');
      const { error: artworksError } = await supabase.storage.createBucket('artworks', {
        public: true,
      });
      
      if (artworksError) {
        console.error('Error creating artworks bucket:', artworksError);
      } else {
        console.log('Created artworks bucket successfully');
      }
    } else {
      console.log('Artworks bucket already exists');
    }

    if (!artworkImagesBucketExists) {
      console.log('Creating artwork_images bucket...');
      const { error: artworkImagesError } = await supabase.storage.createBucket('artwork_images', {
        public: true,
      });
      
      if (artworkImagesError) {
        console.error('Error creating artwork_images bucket:', artworkImagesError);
      } else {
        console.log('Created artwork_images bucket successfully');
      }
    } else {
      console.log('Artwork images bucket already exists');
    }
    
    // Create profiles bucket if it doesn't exist
    if (!profilesBucketExists) {
      console.log('Creating profiles bucket...');
      const { error: profilesError } = await supabase.storage.createBucket('profiles', {
        public: true,
      });
      
      if (profilesError) {
        console.error('Error creating profiles bucket:', profilesError);
      } else {
        console.log('Created profiles bucket successfully');
      }
    } else {
      console.log('Profiles bucket already exists');
    }
    
    // 2. Storage policies are maintained in SQL migrations.
    console.log('Storage policies are managed by supabase/migrations/*_harden_auth_rls_storage.sql');

    // 3. Run SQL setup
    console.log('Running SQL setup...');
    const sqlContent = fs.readFileSync('./setup-supabase.sql', 'utf8');
    
    // You may need to modify this depending on how your Supabase instance handles SQL execution
    try {
      const { error: sqlError } = await supabase.rpc('exec_sql', { query: sqlContent });
      
      if (sqlError) {
        console.error('Error running SQL setup through RPC:', sqlError);
        console.log('Note: You may need to run the SQL manually in the Supabase dashboard SQL editor');
      } else {
        console.log('SQL setup completed successfully');
      }
    } catch (sqlExecError) {
      console.error('Failed to execute SQL via RPC:', sqlExecError);
      console.log('This is common if the exec_sql function is not available.');
      console.log('Please run the SQL manually in the Supabase dashboard SQL editor.');
    }

    console.log('Supabase setup completed. Some steps may require manual intervention.');
    console.log('Check the logs above for any errors that need to be addressed.');
    
  } catch (error) {
    console.error('Setup failed:', error);
  }
}

setupSupabase(); 