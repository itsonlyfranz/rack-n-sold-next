/**
 * Custom hook for interacting with OpenSea Stream API
 * Provides real-time updates for NFT events on the marketplace
 */
import { useState, useEffect, useRef } from 'react';
import { OpenSeaStreamClient, EventType } from '@opensea/stream-js';
import { useWeb3React } from '@web3-react/core';

// Event types from Stream API
export enum StreamEventType {
  ITEM_LISTED = 'item_listed',
  ITEM_SOLD = 'item_sold',
  ITEM_TRANSFERRED = 'item_transferred',
  ITEM_METADATA_UPDATE = 'item_metadata_update',
  ITEM_CANCELLED = 'item_cancelled',
  ITEM_RECEIVED_OFFER = 'item_received_offer',
  ITEM_RECEIVED_BID = 'item_received_bid',
  COLLECTION_OFFER = 'collection_offer',
  TRAIT_OFFER = 'trait_offer',
  ORDER_INVALIDATE = 'order_invalidate',
  ORDER_REVALIDATE = 'order_revalidate'
}

// Common interface for all events
export interface StreamEvent {
  event_type: StreamEventType;
  payload: any;
  sent_at: string;
}

/**
 * Hook for listening to OpenSea Stream API events
 * @param collections - Optional array of collection slugs to filter events
 * @param eventTypes - Optional array of event types to filter
 * @returns Object containing events, connection status, and error state
 */
export function useOpenSeaStream(
  collections?: string[],
  eventTypes?: StreamEventType[]
) {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { chainId } = useWeb3React();
  const clientRef = useRef<OpenSeaStreamClient | null>(null);

  useEffect(() => {
    // Only initialize if API key is available
    const apiKey = process.env.OPENSEA_API_KEY;
    if (!apiKey) {
      setError(new Error('OpenSea API key not found'));
      return;
    }

    // Check if on Polygon network (137 = mainnet, 80001 = Mumbai testnet)
    const isPolygonNetwork = chainId === 137 || chainId === 80001;
    if (chainId && !isPolygonNetwork) {
      setError(new Error("Please connect to Polygon network for Stream API"));
      return;
    }

    // Create Stream client
    try {
      clientRef.current = new OpenSeaStreamClient({
        token: apiKey,
        // Use simplified options to avoid type errors
        connectOptions: {}
      });

      setIsConnected(true);
      setError(null);
    } catch (err) {
      console.error("Error initializing OpenSea Stream client:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsConnected(false);
      return;
    }

    const client = clientRef.current;

    // Subscribe to events based on provided filters
    const setupSubscriptions = () => {
      if (!client) return;

      // Helper function to add event to state
      const addEvent = (event: any) => {
        setEvents(prev => [event, ...prev].slice(0, 100)); // Keep last 100 events
      };

      try {
        // Setup collection-specific handlers if collections provided
        if (collections && collections.length > 0) {
          // For the Stream API v2+, we need to handle collections differently
          const collectionString = collections.join(',');
          
          // Setup specific event handlers if eventTypes provided
          if (eventTypes && eventTypes.length > 0) {
            eventTypes.forEach(type => {
              switch (type) {
                case StreamEventType.ITEM_LISTED:
                  client.onItemListed(collectionString, addEvent);
                  break;
                case StreamEventType.ITEM_SOLD:
                  client.onItemSold(collectionString, addEvent);
                  break;
                case StreamEventType.ITEM_TRANSFERRED:
                  client.onItemTransferred(collectionString, addEvent);
                  break;
                case StreamEventType.ITEM_METADATA_UPDATE:
                  client.onItemMetadataUpdated(collectionString, addEvent);
                  break;
                case StreamEventType.ITEM_CANCELLED:
                  client.onItemCancelled(collectionString, addEvent);
                  break;
                case StreamEventType.ITEM_RECEIVED_OFFER:
                  client.onItemReceivedOffer(collectionString, addEvent);
                  break;
                case StreamEventType.ITEM_RECEIVED_BID:
                  client.onItemReceivedBid(collectionString, addEvent);
                  break;
                // Add other specific event types as needed
              }
            });
          } else {
            // Subscribe to all events for collections
            // Convert StreamEventType[] to EventType[]
            client.onEvents(collectionString, [], addEvent);
          }
        } else {
          // If no collections specified, subscribe to all events globally
          client.onEvents('', [], addEvent);
        }
      } catch (err) {
        console.error("Error setting up event subscriptions:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    };

    // Setup subscriptions
    setupSubscriptions();

    // Cleanup function
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
      setIsConnected(false);
    };
  }, [collections, eventTypes, chainId]);

  /**
   * Clear the events history
   */
  const clearEvents = () => {
    setEvents([]);
  };

  return { 
    events, 
    isConnected, 
    error,
    clearEvents
  };
} 