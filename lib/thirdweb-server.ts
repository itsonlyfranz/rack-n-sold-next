import { createThirdwebClient } from "thirdweb";

/**
 * Create a server-side Thirdweb client using the secret key
 * This should only be used in server components or API routes
 */
export const thirdwebServer = createThirdwebClient({
  secretKey: process.env.THIRDWEB_SECRET_KEY,
});

/**
 * Create a client-side Thirdweb client using the client ID
 * This can be used in both client and server components
 */
export const thirdwebClient = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

/**
 * Utility function to get the appropriate client based on environment
 * Uses the server client if available (when in server context), otherwise uses client ID
 */
export const getThirdwebClient = () => {
  // Check if we're in a server environment
  if (typeof window === 'undefined' && process.env.THIRDWEB_SECRET_KEY) {
    return thirdwebServer;
  }
  // Otherwise use the client ID for client-side
  return thirdwebClient;
}; 