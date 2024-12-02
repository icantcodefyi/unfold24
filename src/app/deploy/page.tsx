"use client";

import { deployContract } from "thirdweb/deploys";
import { useActiveAccount } from "thirdweb/react";
import { client } from "@/components/thirdweb/client";
import { ConnectButton } from "thirdweb/react";
import { useState } from "react";
import { avalancheFuji, polygonAmoy, baseSepolia } from "thirdweb/chains";

export default function DeployPage() {
  const account = useActiveAccount();
  const [deployedAddress, setDeployedAddress] = useState<string>("");
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string>("");
  const [selectedChain, setSelectedChain] = useState(polygonAmoy);

  const chains = [
    { name: "Polygon Amoy", chain: polygonAmoy },
    { name: "Avalanche Fuji", chain: avalancheFuji },
    { name: "Base Sepolia", chain: baseSepolia },
  ];

  const handleDeploy = async () => {
    if (!account) {
      setError("Please connect your wallet first");
      return;
    }

    setIsDeploying(true);
    setError("");

    try {
      const contractAddress = await deployContract({
        client,
        account,
        chain: {
          rpc: selectedChain.rpc,
          id: selectedChain.id,
        },
        abi: [{ "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "owner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "spender", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "Approval", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "from", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "Burn", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "to", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "Mint", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "from", "type": "address" }, { "indexed": true, "internalType": "address", "name": "to", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "Transfer", "type": "event" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }, { "internalType": "address", "name": "", "type": "address" }], "name": "allowance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_spender", "type": "address" }, { "internalType": "uint256", "name": "_value", "type": "uint256" }], "name": "approve", "outputs": [{ "internalType": "bool", "name": "success", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "_amount", "type": "uint256" }], "name": "burn", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "decimals", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_to", "type": "address" }, { "internalType": "uint256", "name": "_amount", "type": "uint256" }], "name": "mint", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "name", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "symbol", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "totalSupply", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_to", "type": "address" }, { "internalType": "uint256", "name": "_value", "type": "uint256" }], "name": "transfer", "outputs": [{ "internalType": "bool", "name": "success", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_from", "type": "address" }, { "internalType": "address", "name": "_to", "type": "address" }, { "internalType": "uint256", "name": "_value", "type": "uint256" }], "name": "transferFrom", "outputs": [{ "internalType": "bool", "name": "success", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }],
        bytecode: "0x60806040526040518060400160405280600b81526020017f437573746f6d546f6b656e0000000000000000000000000000000000000000008152505f908162000049919062000323565b506040518060400160405280600381526020017f43544b00000000000000000000000000000000000000000000000000000000008152506001908162000090919062000323565b50601260025f6101000a81548160ff021916908360ff160217905550348015620000b8575f80fd5b5062000407565b5f81519050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b5f60028204905060018216806200013b57607f821691505b602082108103620001515762000150620000f6565b5b50919050565b5f819050815f5260205f209050919050565b5f6020601f8301049050919050565b5f82821b905092915050565b5f60088302620001b57fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8262000178565b620001c1868362000178565b95508019841693508086168417925050509392505050565b5f819050919050565b5f819050919050565b5f6200020b62000205620001ff84620001d9565b620001e2565b620001d9565b9050919050565b5f819050919050565b6200022683620001eb565b6200023e620002358262000212565b84845462000184565b825550505050565b5f90565b6200025462000246565b620002618184846200021b565b505050565b5b8181101562000288576200027c5f826200024a565b60018101905062000267565b5050565b601f821115620002d757620002a18162000157565b620002ac8462000169565b81016020851015620002bc578190505b620002d4620002cb8562000169565b83018262000266565b50505b505050565b5f82821c905092915050565b5f620002f95f1984600802620002dc565b1980831691505092915050565b5f620003138383620002e8565b9150826002028217905092915050565b6200032e82620000bf565b67ffffffffffffffff8111156200034a5762000349620000c9565b5b62000356825462000123565b620003638282856200028c565b5f60209050601f83116001811462000399575f841562000384578287015190505b62000390858262000306565b865550620003ff565b601f198416620003a98662000157565b5f5b82811015620003d257848901518255600182019150602085019450602081019050620003ab565b86831015620003f25784890151620003ee601f891682620002e8565b8355505b60016002880201885550505b505050505050565b6112df80620004155f395ff3fe608060405234801561000f575f80fd5b50600436106100a7575f3560e01c806340c10f191161006f57806340c10f191461016557806342966c681461018157806370a082311461019d57806395d89b41146101cd578063a9059cbb146101eb578063dd62ed3e1461021b576100a7565b806306fdde03146100ab578063095ea7b3146100c957806318160ddd146100f957806323b872dd14610117578063313ce56714610147575b5f80fd5b6100b361024b565b6040516100c09190610e1f565b60405180910390f35b6100e360048036038101906100de9190610ed0565b6102d6565b6040516100f09190610f28565b60405180910390f35b610101610433565b60405161010e9190610f50565b60405180910390f35b610131600480360381019061012c9190610f69565b610439565b60405161013e9190610f28565b60405180910390f35b61014f610789565b60405161015c9190610fd4565b60405180910390f35b61017f600480360381019061017a9190610ed0565b61079b565b005b61019b60048036038101906101969190610fed565b61092d565b005b6101b760048036038101906101b29190611018565b610ace565b6040516101c49190610f50565b60405180910390f35b6101d5610ae3565b6040516101e29190610e1f565b60405180910390f35b61020560048036038101906102009190610ed0565b610b6f565b6040516102129190610f28565b60405180910390f35b61023560048036038101906102309190611043565b610d75565b6040516102429190610f50565b60405180910390f35b5f8054610257906110ae565b80601f0160208091040260200160405190810160405280929190818152602001828054610283906110ae565b80156102ce5780601f106102a5576101008083540402835291602001916102ce565b820191905f5260205f20905b8154815290600101906020018083116102b157829003601f168201915b505050505081565b5f825f73ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1603610346576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161033d90611128565b60405180910390fd5b8260055f3373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20819055508373ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925856040516104209190610f50565b60405180910390a3600191505092915050565b60035481565b5f825f73ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff16036104a9576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016104a090611128565b60405180910390fd5b60045f8673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2054831115610529576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161052090611190565b60405180910390fd5b60055f8673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f3373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20548311156105e4576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016105db906111f8565b60405180910390fd5b8260045f8773ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8282546106309190611243565b925050819055508260045f8673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8282546106839190611276565b925050819055508260055f8773ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f3373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8282546107119190611243565b925050819055508373ffffffffffffffffffffffffffffffffffffffff168573ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef856040516107759190610f50565b60405180910390a360019150509392505050565b60025f9054906101000a900460ff1681565b815f73ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff160361080a576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161080190611128565b60405180910390fd5b8160035f82825461081b9190611276565b925050819055508160045f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f82825461086e9190611276565b925050819055508273ffffffffffffffffffffffffffffffffffffffff167f0f6798a560793a54c3bcfe86a93cde1e73087d944c0ea20544137d4121396885836040516108bb9190610f50565b60405180910390a28273ffffffffffffffffffffffffffffffffffffffff165f73ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef846040516109209190610f50565b60405180910390a3505050565b8060045f3373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f828254610a119190611243565b925050819055503373ffffffffffffffffffffffffffffffffffffffff167fcc16f5dbb4873280815c1ee09dbd06736cffcc184412cf7a71a0fdb75d397ca582604051610a5e9190610f50565b60405180910390a25f73ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef83604051610ac39190610f50565b60405180910390a350565b6004602052805f5260405f205f915090505481565b60018054610af0906110ae565b80601f0160208091040260200160405190810160405280929190818152602001828054610b1c906110ae565b8015610b675780601f10610b3e57610100808354040283529160200191610b67565b820191905f5260205f20905b815481529060010190602001808311610b4a57829003601f168201915b505050505081565b5f825f73ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1603610bdf576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610bd690611128565b60405180910390fd5b8260045f3373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20541015610c5f576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610c5690611190565b60405180910390fd5b8260045f3373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f828254610cab9190611243565b925050819055508260045f8673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f828254610cfe9190611276565b925050819055508373ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef85604051610d629190610f50565b60405180910390a3600191505092915050565b6005602052815f5260405f20602052805f5260405f205f91509150505481565b5f81519050919050565b5f82825260208201905092915050565b5f5b83811015610dcc578082015181840152602081019050610db1565b5f8484015250505050565b5f601f19601f8301169050919050565b5f610df182610d95565b610dfb8185610d9f565b9350610e0b818560208601610daf565b610e1481610dd7565b840191505092915050565b5f6020820190508181035f830152610e378184610de7565b905092915050565b5f80fd5b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f610e6c82610e43565b9050919050565b610e7c81610e62565b8114610e86575f80fd5b50565b5f81359050610e9781610e73565b92915050565b5f819050919050565b610eaf81610e9d565b8114610eb9575f80fd5b50565b5f81359050610eca81610ea6565b92915050565b5f8060408385031215610ee657610ee5610e3f565b5b5f610ef385828601610e89565b9250506020610f0485828601610ebc565b9150509250929050565b5f8115159050919050565b610f2281610f0e565b82525050565b5f602082019050610f3b5f830184610f19565b92915050565b610f4a81610e9d565b82525050565b5f602082019050610f635f830184610f41565b92915050565b5f805f60608486031215610f8057610f7f610e3f565b5b5f610f8d86828701610e89565b9350506020610f9e86828701610e89565b9250506040610faf86828701610ebc565b9150509250925092565b5f60ff82169050919050565b610fce81610fb9565b82525050565b5f602082019050610fe75f830184610fc5565b92915050565b5f6020828403121561100257611001610e3f565b5b5f61100f84828501610ebc565b91505092915050565b5f6020828403121561102d5761102c610e3f565b5b5f61103a84828501610e89565b91505092915050565b5f806040838503121561105957611058610e3f565b5b5f61106685828601610e89565b925050602061107785828601610e89565b9150509250929050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b5f60028204905060018216806110c557607f821691505b6020821081036110d8576110d7611081565b5b50919050565b7f496e76616c6964206164647265737300000000000000000000000000000000005f82015250565b5f611112600f83610d9f565b915061111d826110de565b602082019050919050565b5f6020820190508181035f83015261113f81611106565b9050919050565b7f496e73756666696369656e742062616c616e63650000000000000000000000005f82015250565b5f61117a601483610d9f565b915061118582611146565b602082019050919050565b5f6020820190508181035f8301526111a78161116e565b9050919050565b7f496e73756666696369656e7420616c6c6f77616e6365000000000000000000005f82015250565b5f6111e2601683610d9f565b91506111ed826111ae565b602082019050919050565b5f6020820190508181035f83015261120f816111d6565b9050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f61124d82610e9d565b915061125883610e9d565b92508282039050818111156112705761126f611216565b5b92915050565b5f61128082610e9d565b915061128b83610e9d565b92508282019050808211156112a3576112a2611216565b5b9291505056fea2646970667358221220ef34127d0ba2c3845b58daa224829946e556100f05d4263088cfecda45811b8664736f6c63430008140033",
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
        <h1 className="text-4xl font-bold mb-8">Deploy your contract</h1>

        <div className="mb-8">
          <ConnectButton client={client} />
        </div>

        {account && (
          <>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Select Chain</label>
              <select
                value={selectedChain.id}
                onChange={(e) => setSelectedChain(chains.find(c => c.chain.id === Number(e.target.value))?.chain || polygonAmoy)}
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500"
              >
                {chains.map((c) => (
                  <option key={c.chain.id} value={c.chain.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleDeploy}
              disabled={isDeploying}
              className={`px-6 py-3 rounded-lg font-medium ${isDeploying
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
                }`}
            >
              {isDeploying ? "Deploying..." : "Deploy ERC20 Token"}
            </button>
          </>
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
                href={`${selectedChain.blockExplorers![0]!.url}/address/${deployedAddress}`}
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
