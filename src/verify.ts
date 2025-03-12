import { Proof } from "./proof";
import { Blueprint, ZkFramework } from "./blueprint";
import { verifyPubKey } from "./utils";
import * as snarkjs from "@zk-email/snarkjs";
import { verifySp1Proof } from "./relayerUtils";

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
    const validPubKey = await verifyPubKey(senderDomain, pubKeyHash);

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

export async function verifyProof(proof: Proof) {
  if (proof.props.blueprintId !== proof.blueprint.props.id) {
    throw Error(`The proof was generated using a different blueprint: ${proof.props.blueprintId}`);
  }

  try {
    const pubKeyHash = proof.getPubKeyHash();
    console.log("pubKeyHash: ", pubKeyHash);
    const validPubKey = await verifyPubKey(proof.blueprint.props.senderDomain!, pubKeyHash);
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
      console.log("verifying sp1 proof: ", proof.props);
      console.log("type of proofData: ", typeof proof.props.proofData);
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
    } else {
      console.warn(`ZkFramework ${proof.blueprint.props.zkFramework} is not supported`);
      return false;
    }
  } catch (err) {
    console.warn("Failed to verify proof: ", err);
  }
  return false;
}
