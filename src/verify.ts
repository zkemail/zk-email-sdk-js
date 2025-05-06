import { Proof } from "./proof";
import { ZkFramework } from "./blueprint";
import { verifyPubKey } from "./utils";
// @ts-ignore Ignore missing types
import * as snarkjs from "@zk-email/snarkjs";
import { verifySp1Proof } from "./relayerUtils";
import { GenerateProofOptions, HashingAlgorithm } from "./types";
import { UltraHonkBackend } from "@aztec/bb.js";
// import { initNoirWasm } from "./prover/noir/initNoirWasm";
// import { initNoirWasm } from "./prover/noir/initNoirWasm";
// import { verifyNoirProof } from "./prover/noir/verifyNoirProof";

const zkFrameworkHashingAlgo = {
  [ZkFramework.Noir]: HashingAlgorithm.Poseidon,
  [ZkFramework.Circom]: HashingAlgorithm.Poseidon,
  [ZkFramework.Sp1]: HashingAlgorithm.Sha256,
  [ZkFramework.None]: HashingAlgorithm.None,
};

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
}: VerifyProofDataProps) {
  const parsedPublicOutputs = JSON.parse(publicOutputs);
  try {
    const pubKeyHash = parsedPublicOutputs[0];
    const validPubKey = await verifyPubKey(senderDomain, pubKeyHash, HashingAlgorithm.Poseidon);

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
    const pubKeyHash = proof.getPubKeyHash();

    const validPubKey = await verifyPubKey(
      proof.blueprint.props.senderDomain!,
      pubKeyHash,
      zkFrameworkHashingAlgo[proof.blueprint.props.zkFramework!]
    );
    if (!validPubKey) {
      console.warn(
        "Public key of proof is invalid. The domains of blueprint and proof don't match"
      );
      return false;
    }
  } catch (err) {
    console.warn("Failed to verify proofs public key: ", err);
    return false;
  }

  try {
    if (proof.blueprint.props.zkFramework === ZkFramework.Circom) {
      const vkey = await proof.blueprint.getVkey();
      const verified = await snarkjs.groth16.verify(
        JSON.parse(vkey),
        proof.props.publicOutputs,
        proof.props.proofData
      );
      return verified;
    } else if (proof.blueprint.props.zkFramework === ZkFramework.Sp1) {
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
    } else if (proof.blueprint.props.zkFramework === ZkFramework.Noir) {
      if (!options || !options.noirWasm) {
        throw new Error("You must pass initialized noirWasm to the options");
      }

      const { UltraHonkBackend } = options.noirWasm;

      const threads = window.navigator.hardwareConcurrency;
      const circuit = await proof.blueprint.getNoirCircuit();
      const backend = new UltraHonkBackend(circuit.bytecode, {
        threads,
      });

      const proofStr = proof.props.proofData;
      const encoder = new TextEncoder();
      const proofData = encoder.encode(proofStr);

      const isValid = await backend.verifyProof({
        proof: proofData,
        publicInputs: proof.props.publicOutputs as string[],
      });

      return isValid;
    } else {
      console.warn(`ZkFramework ${proof.blueprint.props.zkFramework} is not supported`);
      return false;
    }
  } catch (err) {
    console.warn("Failed to verify proof: ", err);
  }
  return false;
}
