import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { Proof } from "../proof";
import { ProofData } from "../types";
// @ts-ignore Does not provide types
import * as snarkjs from "snarkjs";
import { logger } from "../utils/logger";

function getVerifierContractAbi(signalLength: number) {
  return [
    {
      type: "function",
      name: "verify",
      inputs: [
        {
          name: "proofType",
          type: "uint8",
          internalType: "ProofType",
        },
        {
          name: "a",
          type: "uint256[2]",
          internalType: "uint256[2]",
        },
        {
          name: "b",
          type: "uint256[2][2]",
          internalType: "uint256[2][2]",
        },
        {
          name: "c",
          type: "uint256[2]",
          internalType: "uint256[2]",
        },
        {
          name: "signals",
          type: `uint256[${signalLength}]`,
          internalType: `uint256[${signalLength}]`,
        },
      ],
      outputs: [],
      stateMutability: "view",
    },
  ];
}

export async function verifyProofOnChain(proof: Proof): Promise<boolean> {
  logger.debug("verifierContract: ", proof.blueprint.props.verifierContract);
  if (
    !proof.blueprint.props.verifierContract?.chain ||
    !proof.blueprint.props.verifierContract?.address
  ) {
    throw new Error("No verifier contract deployed for the blueprint of this proof");
  }

  if (!proof.props.proofData || !proof.props.publicOutputs) {
    throw new Error("No proof data generated yet");
  }

  // @ts-ignore
  if (!proof.props.publicOutputs || !proof.props.publicOutputs.length) {
    throw new Error("Not a correct proof type");
  }

  // Create public client for Base Sepolia
  const client = createPublicClient({
    chain: base,
    transport: http("https://sepolia.base.org"),
  });

  // TODO: this is parsed when getting the data from the backend,
  // add propper typing from the start
  // @ts-ignore
  const proofData = proof.props.proofData as ProofData;

  const args = [
    [BigInt(proofData.pi_a[0]), BigInt(proofData.pi_a[1])],
    [
      [
        BigInt(proofData.pi_b[0][1]), // swap coordinates
        BigInt(proofData.pi_b[0][0]),
      ],
      [
        BigInt(proofData.pi_b[1][1]), // swap coordinates
        BigInt(proofData.pi_b[1][0]),
      ],
    ],
    [BigInt(proofData.pi_c[0]), BigInt(proofData.pi_c[1])],
    // TODO: this is parsed when getting the data from the backend,
    // add propper typing from the start
    // @ts-ignore
    proof.props.publicOutputs.map((output) => BigInt(output)),
  ] as const;

  let calldata = await snarkjs.groth16.exportSolidityCallData(proofData, proof.props.publicOutputs);
  calldata = JSON.parse(`[${calldata}]`);

  try {
    await client.readContract({
      address: proof.blueprint.props.verifierContract.address as `0x${string}`,
      // TODO: this is parsed when getting the data from the backend,
      // add propper typing from the start
      // @ts-ignore
      abi: getVerifierContractAbi(proof.props.publicOutputs.length),
      functionName: "verify",
      args: [1, ...calldata],
    });
    return true;
  } catch (error) {
    logger.error("Error verifying proof on chain:", error);
    return false;
  }
}
