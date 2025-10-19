// Script to check Supabase connection and table structure
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function checkSupabaseConnection() {
  console.log('Checking Supabase connection...')
  
  // Create Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  
  try {
    // Check users table
    console.log('\nChecking users table...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    
    if (usersError) {
      console.error('Error querying users table:', usersError)
    } else {
      console.log(`✅ Users table accessible. Found ${users.length} records.`)
      if (users.length > 0) {
        console.log('Sample user structure:', Object.keys(users[0]))
      }
    }
    
    // Check artworks table
    console.log('\nChecking artworks table...')
    const { data: artworks, error: artworksError } = await supabase
      .from('artworks')
      .select('*')
      .limit(1)
    
    if (artworksError) {
      console.error('Error querying artworks table:', artworksError)
    } else {
      console.log(`✅ Artworks table accessible. Found ${artworks.length} records.`)
      if (artworks.length > 0) {
        console.log('Sample artwork structure:', Object.keys(artworks[0]))
      }
    }
    
    // Check cart_items table
    console.log('\nChecking cart_items table...')
    const { data: cartItems, error: cartItemsError } = await supabase
      .from('cart_items')
      .select('*')
      .limit(1)
    
    if (cartItemsError) {
      console.error('Error querying cart_items table:', cartItemsError)
    } else {
      console.log(`✅ Cart items table accessible. Found ${cartItems.length} records.`)
      if (cartItems.length > 0) {
        console.log('Sample cart item structure:', Object.keys(cartItems[0]))
      }
    }
    
    // Check join query
    console.log('\nChecking join query (artworks with users)...')
    const { data: artworksWithUsers, error: joinError } = await supabase
      .from('artworks')
      .select(`
        *,
        user:user_id (
          id,
          email
        )
      `)
      .limit(1)
    
    if (joinError) {
      console.error('Error with join query:', joinError)
    } else {
      console.log('✅ Join query successful')
      if (artworksWithUsers.length > 0) {
        console.log('Sample joined data structure:', 
          JSON.stringify({
            ...Object.keys(artworksWithUsers[0]).reduce((acc, key) => {
              if (key !== 'user') acc[key] = typeof artworksWithUsers[0][key]
              return acc
            }, {}),
            user: artworksWithUsers[0].user ? 
              Object.keys(artworksWithUsers[0].user).reduce((acc, key) => {
                acc[key] = typeof artworksWithUsers[0].user[key]
                return acc
              }, {}) : null
          }, null, 2)
        )
      }
    }
    
    console.log('\nDatabase check complete!')
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

checkSupabaseConnection() 