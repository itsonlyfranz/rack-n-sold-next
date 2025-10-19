import { cookies } from 'next/headers'; // Keep for potential future use or consistency
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js'; // Use standard client

// Use public URL and Anon key for schema checks
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(req: NextRequest) {
  // Ensure environment variables are set
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Supabase URL or Anon Key is missing from environment variables.');
    return NextResponse.json(
      { error: 'Server configuration error' }, 
      { status: 500 }
    );
  }

  try {
    // Create a standard Supabase client with public anon key
    // No need for auth context just to check if a table exists
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Check if the table exists by attempting to query it
    const { error: checkError, count } = await supabase
      .from('nft_collections')
      .select('*' , { count: 'exact', head: true })
      .limit(1);

    // If the table doesn't exist, return instructions to create it
    if (checkError && checkError.code === 'PGRST116') {
      console.log('Table nft_collections does not exist');
      
      const createTableSQL = `
-- Run this SQL in your Supabase SQL Editor
CREATE TABLE IF NOT EXISTS nft_collections (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT,
  description TEXT,
  verified BOOLEAN DEFAULT false,
  floor_price DECIMAL,
  total_volume DECIMAL,
  market_cap DECIMAL,
  num_owners INTEGER,
  total_supply INTEGER,
  last_fetched TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE nft_collections ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view collections
CREATE POLICY "Anyone can view NFT collections" 
  ON nft_collections FOR SELECT 
  USING (true);

-- Allow authenticated users to manage collections
CREATE POLICY "Authenticated users can manage NFT collections" 
  ON nft_collections FOR ALL 
  USING (auth.role() = 'authenticated');
`;

      return NextResponse.json({ 
        success: false, 
        message: 'NFT collections table does not exist',
        error: 'Table not found',
        instructions: 'Please create the table using the SQL provided in the response',
        sql: createTableSQL
      }, { status: 404 });
    } else if (checkError) {
      console.error('Unknown error checking collections table:', checkError);
      return NextResponse.json({
        success: false,
        message: 'Failed to check if NFT collections table exists',
        error: checkError
      }, { status: 500 });
    }
    
    // If we made it here, the table exists
    const { data: collections, error: fetchError } = await supabase
      .from('nft_collections')
      .select('slug, name')
      .limit(10);
      
    if (fetchError) {
      return NextResponse.json({ 
        success: false, 
        message: 'Error fetching collections',
        error: fetchError
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'NFT collections table exists',
      collections: collections || []
    });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to set up NFT collections database', 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 