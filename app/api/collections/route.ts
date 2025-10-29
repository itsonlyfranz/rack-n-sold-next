import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidateTag } from 'next/cache';

// Define typing for NFT collection data
interface NFTCollection {
  slug: string;
  name: string;
  image_url: string;
  description: string | null;
  verified: boolean;
  floor_price: number | null;
  total_volume: number | null;
  market_cap: number | null;
  num_owners: number | null;
  total_supply: number | null;
}

export async function GET(req: NextRequest) {
  try {
    // Create Supabase client with properly awaited cookies
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const slug = searchParams.get('slug');
    const refreshCache = searchParams.get('refresh') === 'true';
    
    // Initialize response data
    let responseData: { collection?: NFTCollection, error?: string, cached?: boolean } = {};
    
    // If no slug is provided, return an error
    if (!slug) {
      return NextResponse.json({ error: 'Collection slug is required' }, { status: 400 });
    }
    
    // Check if we need to create the table
    try {
      // Check if the table exists by attempting to query it
      const { error: checkError } = await supabase
        .from('nft_collections')
        .select('*' , { count: 'exact', head: true })
        .limit(1);

      // If the table doesn't exist, try to access the setup endpoint
      if (checkError && checkError.code === 'PGRST116') {
        console.log('Table nft_collections does not exist, accessing setup endpoint');
        
        // Get the current host from the request
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        const host = req.headers.get('host') || 'localhost:3000';
        const baseUrl = `${protocol}://${host}`;
        
        await fetch(`${baseUrl}/api/collections/setup`);
      }
    } catch (error) {
      console.log('Failed to check or create collection table:', error);
      // Continue anyway - we'll handle any errors later
    }
    
    // Check if collection exists in database and isn't too old (30 days)
    const { data: cachedCollection, error: cacheError } = await supabase
      .from('nft_collections')
      .select('*')
      .eq('slug', slug)
      .single();
    
    // If collection exists and isn't stale, return it unless refresh is requested
    if (cachedCollection && !refreshCache) {
      const cacheDate = new Date(cachedCollection.last_fetched);
      const now = new Date();
      const cacheAgeInDays = Math.floor((now.getTime() - cacheDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Use cache if it's less than 30 days old
      if (cacheAgeInDays < 30) {
        return NextResponse.json({
          collection: {
            slug: cachedCollection.slug,
            name: cachedCollection.name,
            image_url: cachedCollection.image_url,
            description: cachedCollection.description,
            verified: cachedCollection.verified,
            floor_price: cachedCollection.floor_price,
            total_volume: cachedCollection.total_volume,
            market_cap: cachedCollection.market_cap,
            num_owners: cachedCollection.num_owners,
            total_supply: cachedCollection.total_supply
          },
          cached: true
        });
      }
    }
    
    // If we got here, we need to fetch from OpenSea
    // Get the current host from the request
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = req.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;
    
    const openseaResponse = await fetch(`${baseUrl}/api/opensea/collections?slugs=${slug}`);
    
    if (!openseaResponse.ok) {
      // If OpenSea fetch fails but we have cached data, return that
      if (cachedCollection) {
        return NextResponse.json({
          collection: {
            slug: cachedCollection.slug,
            name: cachedCollection.name,
            image_url: cachedCollection.image_url,
            description: cachedCollection.description,
            verified: cachedCollection.verified,
            floor_price: cachedCollection.floor_price,
            total_volume: cachedCollection.total_volume,
            market_cap: cachedCollection.market_cap,
            num_owners: cachedCollection.num_owners,
            total_supply: cachedCollection.total_supply
          },
          cached: true,
          warning: 'OpenSea fetch failed, using cached data'
        });
      }
      
      // If no cache and OpenSea fails, return an error
      const errorData = await openseaResponse.json();
      return NextResponse.json(
        { error: errorData.details || 'Failed to fetch collection from OpenSea' },
        { status: 502 }
      );
    }
    
    // Parse the OpenSea response
    const openseaData = await openseaResponse.json();
    
    if (!openseaData.collections || openseaData.collections.length === 0) {
      return NextResponse.json(
        { error: 'Collection not found on OpenSea' },
        { status: 404 }
      );
    }
    
    // Get the collection data
    const collection = openseaData.collections[0];
    
    // Store the collection in the database
    const { error: upsertError } = await supabase
      .from('nft_collections')
      .upsert({
        slug: collection.slug,
        name: collection.name,
        image_url: collection.image_url,
        description: collection.description || null,
        verified: collection.verified || false,
        floor_price: collection.stats?.floor_price || null,
        total_volume: collection.stats?.total_volume || null,
        market_cap: collection.stats?.market_cap || null,
        num_owners: collection.stats?.num_owners || null,
        total_supply: collection.stats?.total_supply || null,
        last_fetched: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'slug'
      });
    
    if (upsertError) {
      console.error('Failed to update collection cache:', upsertError);
    }
    
    // Revalidate cache for this collection to ensure fresh data on next read
    await revalidateTag(`collection-${slug}`, 'high');
    
    // Return the collection data
    return NextResponse.json({
      collection: {
        slug: collection.slug,
        name: collection.name,
        image_url: collection.image_url,
        description: collection.description,
        verified: collection.verified,
        floor_price: collection.stats?.floor_price,
        total_volume: collection.stats?.total_volume,
        market_cap: collection.stats?.market_cap,
        num_owners: collection.stats?.num_owners,
        total_supply: collection.stats?.total_supply
      },
      cached: false
    });
    
  } catch (error) {
    console.error('Collection API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Create Supabase client with properly awaited cookies
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const body = await req.json();
    
    // Validate required fields
    if (!body.slug || !body.name) {
      return NextResponse.json(
        { error: 'Slug and name are required' },
        { status: 400 }
      );
    }
    
    // Check if we need to create the table
    try {
      // Check if the table exists by attempting to query it
      const { error: checkError } = await supabase
        .from('nft_collections')
        .select('*' , { count: 'exact', head: true })
        .limit(1);

      // If the table doesn't exist, try to access the setup endpoint
      if (checkError && checkError.code === 'PGRST116') {
        console.log('Table nft_collections does not exist, accessing setup endpoint');
        
        // Get the current host from the request
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        const host = req.headers.get('host') || 'localhost:3000';
        const baseUrl = `${protocol}://${host}`;
        
        const setupResponse = await fetch(`${baseUrl}/api/collections/setup`);
        if (!setupResponse.ok) {
          return NextResponse.json(
            { error: 'NFT collections table does not exist and could not be created' },
            { status: 500 }
          );
        }
      }
    } catch (error) {
      console.log('Failed to check or create collection table:', error);
      // Continue anyway - we'll handle any errors later
    }
    
    // Store the collection
    const { data, error } = await supabase
      .from('nft_collections')
      .upsert({
        slug: body.slug,
        name: body.name,
        image_url: body.image_url || null,
        description: body.description || null,
        verified: body.verified || false,
        floor_price: body.floor_price || null,
        total_volume: body.total_volume || null,
        market_cap: body.market_cap || null,
        num_owners: body.num_owners || null,
        total_supply: body.total_supply || null,
        last_fetched: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'slug'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Failed to store collection:', error);
      return NextResponse.json(
        { error: 'Failed to store collection' },
        { status: 500 }
      );
    }
    
    // Revalidate cache for this specific collection with high priority
    await revalidateTag(`collection-${body.slug}`, 'high');
    
    return NextResponse.json({ success: true, collection: data });
  } catch (error) {
    console.error('Collection API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 