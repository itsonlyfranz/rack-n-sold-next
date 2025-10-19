'use client';

// Simplified provider import and usage based on Thirdweb documentation
import { ThirdwebProvider } from "thirdweb/react";
import { MetaMaskProvider } from "@metamask/sdk-react";
import React from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MetaMaskProvider
      sdkOptions={{
        dappMetadata: {
          name: "Rack n Sold",
          url: typeof window !== "undefined" ? window.location.href : "",
        },
        infuraAPIKey: process.env.NEXT_PUBLIC_INFURA_API_KEY,
      }}
    >
      <ThirdwebProvider>
        {children}
      </ThirdwebProvider>
    </MetaMaskProvider>
  );
} 