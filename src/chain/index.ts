import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";

const WETHContractAddress = "0x4200000000000000000000000000000000000006";

const WETHContractABI = [
  {
    constant: true,
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    type: "function",
  },
] as const;

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

export async function verifyProofOnChain() {
  try {
    const totalSupply = await client.readContract({
      address: WETHContractAddress,
      abi: WETHContractABI,
      functionName: "totalSupply",
    });

    console.log(`Total WETH supply: ${totalSupply}`);
    return totalSupply;
  } catch (error) {
    console.error("Error fetching WETH total supply:", error);
    throw error;
  }
}
