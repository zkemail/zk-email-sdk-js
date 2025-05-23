import { Proof } from "./proof";
import { ZkFramework } from "./blueprint";
import { hexToUint8Array, verifyPubKey } from "./utils";
// @ts-ignore Ignore missing types
import * as snarkjs from "@zk-email/snarkjs";
import { verifySp1Proof } from "./relayerUtils";
import { GenerateProofOptions, HashingAlgorithm, NoirWasm } from "./types";
import { UltraHonkBackend } from "@aztec/bb.js";

type VerifyProofDataProps = {
  publicOutputs: string;
  proofData: string;
  senderDomain: string;
  vkey: string;
};

export async function verifyProofData({
  publicOutputs,
  proofData,
  senderDomain,
  vkey,
}: VerifyProofDataProps): Promise<boolean> {
  const parsedPublicOutputs = JSON.parse(publicOutputs);
  try {
    const pubKeyHash = parsedPublicOutputs[0];
    const validPubKey = await verifyPubKey(senderDomain, pubKeyHash, ZkFramework.Circom);

    if (!validPubKey) {
      console.warn(
        "Public key of proof is invalid. The domains of blueprint and proof don't match"
      );
      return false;
    }
  } catch (err) {
    console.warn("Failed to verify proofs public key");
    return false;
  }

  try {
    const verified = await snarkjs.groth16.verify(
      JSON.parse(vkey),
      parsedPublicOutputs,
      JSON.parse(proofData)
    );
    return verified;
  } catch (err) {
    console.log("Failed to verify proof: ", err);
  }
  return false;
}

export async function verifyProof(proof: Proof, options?: GenerateProofOptions) {
  if (proof.props.blueprintId !== proof.blueprint.props.id) {
    throw Error(`The proof was generated using a different blueprint: ${proof.props.blueprintId}`);
  }

  try {
    const pubKeyHash = await proof.getPubKeyHash();

    const validPubKey = await verifyPubKey(
      proof.blueprint.props.senderDomain!,
      pubKeyHash,
      proof.props.zkFramework
    );
    if (!validPubKey) {
      console.warn(
        "Public key of proof is invalid. The domains of blueprint and proof don't match"
      );
      if (!validPubKey) {
        console.warn(
          "Public key of proof is invalid. The domains of blueprint and proof don't match"
        );
        return false;
      }
    }
  } catch (err) {
    console.warn("Failed to verify proofs public key: ", err);
    return false;
  }

  try {
    if (proof.props.zkFramework === ZkFramework.Circom) {
      const vkey = await proof.blueprint.getVkey();
      const verified = await snarkjs.groth16.verify(
        JSON.parse(vkey),
        proof.props.publicOutputs,
        proof.props.proofData
      );
      return verified;
    } else if (proof.props.zkFramework === ZkFramework.Sp1) {
      // @ts-ignore
      const verified = await verifySp1Proof(
        // @ts-ignore
        proof.props.proofData.hex,
        // @ts-ignore
        proof.props.publicOutputs.outputs_hex,
        proof.props.sp1VkeyHash!
      );
      console.log("sp1 proof verified: ", verified);
      return verified;
    } else if (proof.props.zkFramework === ZkFramework.Noir) {
      if (!options || !options.noirWasm) {
        throw new Error("You must pass initialized noirWasm to the options");
      }
      const circuit = await proof.blueprint.getNoirCircuit();
      const proofDataHex = proof.props.proofData!;
      return await verifyNoirProof(
        proofDataHex,
        proof.props.publicOutputs! as string[],
        circuit,
        options.noirWasm
      );
    }
  } catch (err) {
    console.warn("Failed to verify proof: ", err);
  }
  return false;
}

export async function verifyNoirProof(
  proofDataHex: string,
  publicOutputs: string[],
  circuit: any,
  noirWasm: NoirWasm
): Promise<boolean> {
  const { UltraHonkBackend } = noirWasm;

  const threads = window.navigator.hardwareConcurrency;
  const backend = new UltraHonkBackend(circuit.bytecode, {
    threads,
  });

  const proofParsed = hexToUint8Array(proofDataHex);

  const noirProof = {
    proof: proofParsed,
    publicInputs: publicOutputs,
  };

  const isValid = await backend.verifyProof(noirProof);
  return isValid;
}
