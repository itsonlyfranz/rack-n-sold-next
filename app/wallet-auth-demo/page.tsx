'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConnectButton } from "thirdweb/react";
import { useActiveAccount, useActiveWallet, useDisconnect } from "thirdweb/react";
import { thirdwebClient } from "@/lib/thirdweb-client";

export default function WalletAuthDemo() {
  const [message, setMessage] = useState<string>("");
  const activeAccount = useActiveAccount();
  const activeWallet = useActiveWallet();
  const { disconnect } = useDisconnect();

  const address = activeAccount?.address;

  const handleVerify = async () => {
    if (!activeAccount || !address) {
      setMessage("Please connect your wallet first");
      return;
    }

    try {
      // Use the correct object format for signMessage
      const signature = await activeAccount.signMessage({
        message: "Hello from Rack-n-Sold!"
      });
      
      if (signature) {
        setMessage(`Signature verified for address: ${address}`);
      } else {
        setMessage("Signature verification failed");
      }
    } catch (error) {
      console.error("Error during verification:", error);
      setMessage(`Error: ${(error as Error).message}`);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8">Wallet Authentication Demo</h1>
      
      <div className="bg-gray-50 p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Connect Your Wallet</h2>
        <div className="flex flex-col md:flex-row gap-4 items-start">
          <ConnectButton client={thirdwebClient} />
          
          {address && activeWallet && (
            <Button 
              variant="outline" 
              onClick={() => disconnect(activeWallet)}
              className="ml-0 md:ml-4"
            >
              Disconnect
            </Button>
          )}
        </div>
        
        {address && (
          <div className="mt-4 p-4 bg-white rounded border">
            <p className="text-sm font-medium">Connected Address:</p>
            <p className="text-xs break-all font-mono">{address}</p>
          </div>
        )}
      </div>
      
      {address && (
        <div className="bg-gray-50 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Verify Ownership</h2>
          <p className="mb-4 text-gray-600">
            Sign a message to verify that you own this wallet address.
          </p>
          <Button onClick={handleVerify}>Verify Wallet</Button>
          
          {message && (
            <div className="mt-4 p-4 bg-white rounded border">
              <p className="text-sm">{message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 