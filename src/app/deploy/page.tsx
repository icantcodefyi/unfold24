"use client";

import { deployERC20Contract } from "thirdweb/deploys";
import { useActiveAccount } from "thirdweb/react";
import { client } from "@/components/thirdweb/client";
import { ConnectButton } from "thirdweb/react";
import { useState } from "react";
import { polygon } from "thirdweb/chains";

// Create Amoy testnet configuration
const amoy = {
  ...polygon,
  id: 80002,
  name: "Polygon Amoy",
  rpc: "https://rpc-amoy.polygon.technology",
  nativeCurrency: {
    name: "MATIC",
    symbol: "MATIC",
    decimals: 18,
  },
  blockExplorers: {
    default: {
      name: "OKLink",
      url: "https://www.oklink.com/amoy",
    },
  },
  testnet: true,
};

export default function DeployPage() {
  const account = useActiveAccount();
  const [deployedAddress, setDeployedAddress] = useState<string>("");
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string>("");

  const handleDeploy = async () => {
    if (!account) {
      setError("Please connect your wallet first");
      return;
    }

    setIsDeploying(true);
    setError("");
    
    try {
      const contractAddress = await deployERC20Contract({
        client,
        account,
        chain: amoy,
        type: "TokenERC20",
        params: {
          name: "Test Token",
          symbol: "TEST",
          description: "A test token deployed on Polygon Amoy",
        },
      });

      setDeployedAddress(contractAddress);
    } catch (err) {
      console.error("Deploy error:", err);
      setError(err instanceof Error ? err.message : "Failed to deploy contract");
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Deploy ERC20 Token</h1>
        
        <div className="mb-8">
          <ConnectButton client={client} />
        </div>

        {account && (
          <button
            onClick={handleDeploy}
            disabled={isDeploying}
            className={`px-6 py-3 rounded-lg font-medium ${
              isDeploying 
                ? "bg-gray-600 cursor-not-allowed" 
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isDeploying ? "Deploying..." : "Deploy ERC20 Token"}
          </button>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {deployedAddress && (
          <div className="mt-8 p-6 bg-green-900/20 border border-green-500 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Contract Deployed!</h2>
            <p className="text-gray-300 mb-2">Contract Address:</p>
            <code className="block p-3 bg-black/50 rounded border border-gray-700 break-all">
              {deployedAddress}
            </code>
            <div className="mt-4">
              <a
                href={`https://www.oklink.com/amoy/address/${deployedAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                View on Explorer
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
