import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Create a Supabase client with properly awaited cookies
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Query the nft_collections table
    const { error, count } = await supabase
      .from('nft_collections')
      .select('*' , { count: 'exact', head: true });
    
    if (error) {
      // If the table doesn't exist, suggest running the setup endpoint
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { 
            error: 'NFT collections table does not exist', 
            details: 'The table has not been created yet',
            suggestion: 'Run the /api/collections/setup endpoint first to get table creation instructions' 
          },
          { status: 404 }
        );
      }
      
      console.error('Error querying nft_collections:', error);
      return NextResponse.json(
        { error: 'Failed to query collections table', details: error.message },
        { status: 500 }
      );
    }
    
    // Return the data
    return NextResponse.json({
      success: true,
      count: count || 0,
    });
  } catch (error) {
    console.error('Check error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
} 