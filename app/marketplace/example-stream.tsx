'use client';

import { useState, useEffect } from 'react';
import { useOpenSeaStream, StreamEventType, StreamEvent } from '@/lib/hooks/useOpenSeaStream';

export default function OpenSeaStreamExample() {
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [collectionInput, setCollectionInput] = useState('');
  const [selectedEventTypes, setSelectedEventTypes] = useState<StreamEventType[]>([
    StreamEventType.ITEM_LISTED,
    StreamEventType.ITEM_SOLD
  ]);

  // Initialize stream with selected collections and event types
  const { 
    isConnected, 
    error
  } = useOpenSeaStream(selectedCollections, selectedEventTypes);

  // Add collection to filter
  const addCollection = () => {
    if (collectionInput && !selectedCollections.includes(collectionInput)) {
      setSelectedCollections([...selectedCollections, collectionInput]);
      setCollectionInput('');
    }
  };

  // Remove collection from filter
  const removeCollection = (collection: string) => {
    setSelectedCollections(selectedCollections.filter(c => c !== collection));
  };

  // Toggle event type selection
  const toggleEventType = (eventType: StreamEventType) => {
    if (selectedEventTypes.includes(eventType)) {
      setSelectedEventTypes(selectedEventTypes.filter(type => type !== eventType));
    } else {
      setSelectedEventTypes([...selectedEventTypes, eventType]);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">OpenSea Stream API Configuration</h1>
      
      {/* Connection status */}
      <div className="mb-6">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>{isConnected ? 'Connected to Stream API' : 'Disconnected'}</span>
        </div>
        {error && (
          <div className="mt-2 text-red-500">
            Error: {error.message}
          </div>
        )}
      </div>
      
      {/* Collection filter */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Collection Filters</h2>
        <div className="flex mb-2">
          <input
            type="text"
            value={collectionInput}
            onChange={(e) => setCollectionInput(e.target.value)}
            placeholder="Collection slug (e.g., azuki)"
            className="flex-1 p-2 border rounded-l-md"
          />
          <button
            onClick={addCollection}
            className="bg-violet-600 text-white px-4 py-2 rounded-r-md hover:bg-violet-700"
          >
            Add
          </button>
        </div>
        
        {selectedCollections.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedCollections.map(collection => (
              <div key={collection} className="bg-gray-200 px-3 py-1 rounded-full flex items-center">
                <span>{collection}</span>
                <button 
                  onClick={() => removeCollection(collection)}
                  className="ml-2 text-gray-600 hover:text-gray-800"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No collections selected. Listening to all collections.</p>
        )}
      </div>
      
      {/* Event type filter */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Event Types</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {Object.values(StreamEventType).map(eventType => (
            <div key={eventType} className="flex items-center">
              <input
                type="checkbox"
                id={`event-${eventType}`}
                checked={selectedEventTypes.includes(eventType)}
                onChange={() => toggleEventType(eventType)}
                className="mr-2"
              />
              <label htmlFor={`event-${eventType}`}>{eventType}</label>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-gray-100 p-4 rounded-md mt-8">
        <p className="text-sm text-gray-600">
          The OpenSea Stream API is configured to listen for the selected event types on the specified collections.
          The API will automatically subscribe to these events and handle them in the background.
        </p>
      </div>
    </div>
  );
} 