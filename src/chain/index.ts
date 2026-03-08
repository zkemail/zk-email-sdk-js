import { createPublicClient, http, encodeAbiParameters, parseAbiParameters, toHex, defineChain } from "viem";
import { sepolia } from "viem/chains";
import type { Chain } from "viem";
import { Proof } from "../proof";
import { logger } from "../utils/logger";

const paseoTestnet = defineChain({
  id: 420420417,
  name: "Polkadot Hub Testnet",
  nativeCurrency: { name: "PAS", symbol: "PAS", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://services.polkadothub-rpc.com/testnet"] },
  },
});

const CHAIN_MAP: Record<number, Chain> = {
  11155111: sepolia,
  420420417: paseoTestnet,
};

const VERIFIER_ABI = [
  {
    type: "function",
    name: "verify",
    inputs: [
      { name: "proof", type: "bytes" },
      { name: "publicInputs", type: "bytes32[]" },
    ],
    outputs: [],
    stateMutability: "view",
  },
] as const;

export async function verifyProofOnChain(proof: Proof): Promise<boolean> {
  logger.debug("verifierContract: ", proof.blueprint.props.verifierContract);

  const { chain: chainId, address } = proof.blueprint.props.verifierContract ?? {};

  if (!chainId || !address) {
    throw new Error("No verifier contract deployed for the blueprint of this proof");
  }

  if (!proof.props.proofData || !proof.props.publicOutputs) {
    throw new Error("No proof data generated yet");
  }

  // @ts-ignore
  if (!proof.props.publicOutputs || !proof.props.publicOutputs.length) {
    throw new Error("Not a correct proof type");
  }

  const chain = CHAIN_MAP[chainId];
  if (!chain) {
    throw new Error(`Unsupported chain id: ${chainId}`);
  }

  const client = createPublicClient({
    chain,
    transport: http(),
  });

  // TODO: this is parsed when getting the data from the backend,
  // add proper typing from the start
  // @ts-ignore
  const proofData = proof.props.proofData as {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
  };

  const pA: [bigint, bigint] = [BigInt(proofData.pi_a[0]), BigInt(proofData.pi_a[1])];
  const pB: [[bigint, bigint], [bigint, bigint]] = [
    [BigInt(proofData.pi_b[0][1]), BigInt(proofData.pi_b[0][0])], // swap coordinates
    [BigInt(proofData.pi_b[1][1]), BigInt(proofData.pi_b[1][0])], // swap coordinates
  ];
  const pC: [bigint, bigint] = [BigInt(proofData.pi_c[0]), BigInt(proofData.pi_c[1])];

  // ABI-encode (pA, pB, pC) into bytes
  const proofBytes = encodeAbiParameters(
    parseAbiParameters("uint256[2], uint256[2][2], uint256[2]"),
    [pA, pB, pC]
  );

  // Convert each public output to bytes32 (left-padded, matching uint256 layout)
  // @ts-ignore
  const publicInputs = (proof.props.publicOutputs as string[]).map(
    (o) => toHex(BigInt(o), { size: 32 })
  );

  try {
    await client.readContract({
      address: address as `0x${string}`,
      abi: VERIFIER_ABI,
      functionName: "verify",
      args: [proofBytes, publicInputs],
    });
    return true;
  } catch (error) {
    logger.error("Error verifying proof on chain:", error);
    return false;
  }
}
