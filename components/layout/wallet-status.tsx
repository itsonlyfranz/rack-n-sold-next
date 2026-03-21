'use client';

import { useActiveAccount } from "thirdweb/react";

export function WalletStatus() {
  const activeAccount = useActiveAccount();
  
  if (!activeAccount) {
    return null;
  }

  return (
    <span className="text-xs text-green-400">
      {activeAccount.address.slice(0, 6)}...{activeAccount.address.slice(-4)}
    </span>
  );
}

export function WalletStatusFull() {
  const activeAccount = useActiveAccount();
  
  if (!activeAccount) {
    return null;
  }

  return (
    <div className="text-xs text-gray-400 mt-1">
      Wallet: <span className="text-green-400">{activeAccount.address.slice(0, 8)}...{activeAccount.address.slice(-6)}</span>
    </div>
  );
}

