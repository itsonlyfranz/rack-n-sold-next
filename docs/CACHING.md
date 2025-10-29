# Next.js 16 Caching Guide

This guide explains how Next.js 16's new caching features are implemented in the Rack N Sold NFT marketplace.

## Table of Contents

- [Overview](#overview)
- [Features Implemented](#features-implemented)
- [How It Works](#how-it-works)
- [Usage Examples](#usage-examples)
- [Cache Tags](#cache-tags)
- [Cache Life Profiles](#cache-life-profiles)
- [Best Practices](#best-practices)

## Overview

Next.js 16 introduces explicit caching control through:

1. **`"use cache"` directive** - Opt-in caching for pages, components, and API routes
2. **`revalidateTag()`** - Background revalidation with stale-while-revalidate (SWR)
3. **`updateTag()`** - Immediate cache invalidation with read-your-writes semantics
4. **Cache Tags** - Tag-based cache management

## Features Implemented

### 1. API Routes with Explicit Caching

All data-fetching API routes now use the `"use cache"` directive and `unstable_cache`:

- `/api/opensea/assets` - NFT asset fetches from OpenSea
- `/api/opensea/collections` - Collection data from OpenSea
- `/api/alchemy/nfts` - Wallet NFT fetches from Alchemy
- `/api/alchemy/asset` - Single NFT metadata from Alchemy

### 2. Cache Tags

Tags are used to group related cached data:

```typescript
tags: ['opensea', 'collection-coolcats', 'nfts']
```

Common tags:
- `opensea` - All OpenSea data
- `alchemy` - All Alchemy data
- `nfts` - All NFT data
- `collection-{slug}` - Specific collection
- `wallet-{address}` - Specific wallet
- `contract-{address}` - Specific contract

### 3. Revalidation Strategies

Different revalidation times for different data types:

- **NFT Assets**: 1 hour (3600s)
- **Collections**: 1 hour (3600s)
- **Wallet NFTs**: 30 minutes (1800s)
- **Single NFTs**: 1 hour (3600s)

## How It Works

### "use cache" Directive

When you add `"use cache"` to a file, Next.js will:
1. Cache the output of that function
2. Serve cached data on subsequent requests
3. Revalidate based on the revalidation time specified

### RevalidateTag

Used for **background revalidation** - serves stale data immediately while fetching fresh data:

```typescript
import { revalidateTag } from 'next/cache';

// Revalidate with a cache life profile
await revalidateTag('nfts', 'high');
```

### Immediate Cache Invalidation

For **read-your-writes** scenarios, use `revalidateTag` with `'high'` priority to force immediate refresh:

```typescript
import { revalidateTag } from 'next/cache';

// Immediately revalidate this collection's cache with high priority
await revalidateTag(`collection-${slug}`, 'high');
```

## Usage Examples

### Example 1: Caching an API Route

```typescript
"use cache";

import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';

export async function GET(request: Request) {
  const apiUrl = `https://api.example.com/data`;
  
  // Wrap the fetch in unstable_cache
  const fetchWithCache = unstable_cache(
    async () => {
      return await fetch(apiUrl, {
        headers: { "Authorization": `Bearer ${token}` }
      });
    },
    ['data-key'], // Unique cache key
    {
      tags: ['data', 'source-api'],
      revalidate: 3600 // Cache for 1 hour
    }
  );
  
  const response = await fetchWithCache();
  const data = await response.json();
  
  return NextResponse.json(data);
}
```

### Example 2: Invalidating Cache After Update

```typescript
import { revalidateTag } from 'next/cache';

export async function POST(request: Request) {
  const { slug } = await request.json();
  
  // Update data in database
  await supabase
    .from('collections')
    .update({ floor_price: newPrice })
    .eq('slug', slug);
  
  // Immediately revalidate cache for this collection with high priority
  await revalidateTag(`collection-${slug}`, 'high');
  
  return NextResponse.json({ success: true });
}
```

### Example 3: Revalidating Multiple Tags

```typescript
import { revalidateTag } from 'next/cache';

// Revalidate all OpenSea data with high priority
await revalidateTag('opensea', 'high');

// Revalidate specific collection
await revalidateTag(`collection-${slug}`, 'medium');
```

### Example 4: Using Cache Utilities

```typescript
import { 
  revalidateOpenSeaAssets, 
  updateOpenSeaCollection 
} from '@/lib/utils/cache-utils';

// Background revalidation
await revalidateOpenSeaAssets('coolcats', 'high');

// Immediate invalidation with high priority
await updateOpenSeaCollection('coolcats');
```

## Cache Tags

### OpenSea Tags

| Tag | Description |
|-----|-------------|
| `opensea` | All OpenSea API data |
| `collection-{slug}` | Specific collection |
| `nfts` | All NFT data |

### Alchemy Tags

| Tag | Description |
|-----|-------------|
| `alchemy` | All Alchemy API data |
| `wallet-{address}` | Specific wallet's NFTs |
| `contract-{address}` | Specific contract |
| `token-{id}` | Specific token |

## Cache Life Profiles

Used with `revalidateTag()`:

| Profile | Priority | Use Case |
|---------|----------|----------|
| `max` | Highest | Critical data, rarely changes |
| `high` | High | Important data, changes occasionally |
| `medium` | Medium | Regular data updates |
| `low` | Low | Frequently changing data |

## Best Practices

### 1. Use Appropriate Revalidation Times

- **Stable data** (collections, metadata): 1+ hours
- **Semi-stable data** (prices, stats): 30 minutes
- **Dynamic data** (listings, transactions): 5-15 minutes

### 2. Tag Strategically

Tag your cache entries to enable:
- Selective invalidation
- Batch revalidation
- Better cache management

### 3. Use revalidateTag with High Priority for User Actions

When a user creates/updates data, use `revalidateTag()` with `'high'` priority for immediate updates:

```typescript
// After creating an NFT listing
await revalidateTag(`contract-${contractAddress}`, 'high');
```

### 4. Use revalidateTag for Scheduled Updates

For background jobs or scheduled tasks, use `revalidateTag()`:

```typescript
// Scheduled job to refresh all collections
await revalidateTag('opensea', 'medium');
```

### 5. Handle Cache Misses Gracefully

Always provide fallbacks when cache is unavailable:

```typescript
const data = await fetchWithCache().catch(() => {
  // Fallback to database or default data
  return fetchFromDatabase();
});
```

## Testing Cache Behavior

### Check Cache Status

```typescript
console.log('Cache hit/miss can be monitored in logs');
```

### Clear All Cache

```typescript
import { revalidateTag } from 'next/cache';

// Revalidate all tags
await revalidateTag('opensea', 'max');
await revalidateTag('alchemy', 'max');
```

### Debug Cache Issues

Enable verbose logging:

```typescript
console.log('Cache key:', cacheKey);
console.log('Cache tags:', tags);
```

## Performance Impact

### Expected Improvements

- **API Rate Limit Reduction**: 70-80% fewer external API calls
- **Page Load Speed**: 2-3x faster for cached pages
- **Database Load**: Reduced by 60-70% for frequently accessed data

### Monitoring

Track cache performance in:
- Next.js Analytics (production)
- Vercel Dashboard
- Application logs

## Troubleshooting

### Cache Not Working

1. Verify `"use cache"` directive is present
2. Check cache tags are properly set
3. Ensure revalidate times are appropriate
4. Check for cache key collisions

### Stale Data Issues

1. Use `revalidateTag()` with `'high'` priority for immediate updates
2. Adjust revalidation times
3. Verify cache tags match between read and write

### Memory Issues

1. Reduce cache revalidation times
2. Use more specific cache keys
3. Implement cache size limits

## References

- [Next.js 16 Caching Docs](https://nextjs.org/docs/app/building-your-application/caching)
- [unstable_cache API](https://nextjs.org/docs/app/api-reference/functions/unstable-cache)
- [revalidateTag API](https://nextjs.org/docs/app/api-reference/functions/revalidateTag)

