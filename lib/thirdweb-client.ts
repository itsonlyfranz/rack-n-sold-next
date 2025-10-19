import { createThirdwebClient } from "thirdweb";

// Create a client that will handle client/server environments automatically
// clientId is used on client, secretKey on server (if available)
const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "";
const secretKey = process.env.THIRDWEB_SECRET_KEY; 

export const thirdwebClient = createThirdwebClient({
  clientId,
  ...(secretKey ? { secretKey } : {}),
}); 