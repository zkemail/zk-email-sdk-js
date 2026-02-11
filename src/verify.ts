import { Proof } from "./proof";
import { ZkFramework } from "./blueprint";
import { hexToUint8Array, verifyPubKey } from "./utils";
// @ts-ignore Ignore missing types
import * as snarkjs from "@zk-email/snarkjs";
import { verifySp1Proof } from "./relayerUtils";
import { GenerateProofOptions, NoirWasm } from "./types";
import { logger } from "./utils/logger";
import { VerificationError } from "./errors";

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
      logger.warn(
        "Public key of proof is invalid. The domains of blueprint and proof don't match"
      );
      return false;
    }
  } catch (err) {
    logger.error("Failed to verify proof's public key: ", err);
    throw new VerificationError("Failed to verify proof's public key", {
      cause: err instanceof Error ? err : new Error(String(err)),
    });
  }

  try {
    const verified = await snarkjs.groth16.verify(
      JSON.parse(vkey),
      parsedPublicOutputs,
      JSON.parse(proofData)
    );
    return verified;
  } catch (err) {
    logger.error("Failed to verify proof: ", err);
    throw new VerificationError("Failed to verify proof", {
      cause: err instanceof Error ? err : new Error(String(err)),
    });
  }
}

export async function verifyProof(proof: Proof, options?: GenerateProofOptions): Promise<boolean> {
  if (proof.props.blueprintId !== proof.blueprint.props.id) {
    throw new Error(`The proof was generated using a different blueprint: ${proof.props.blueprintId}`);
  }

  try {
    const pubKeyHash = await proof.getPubKeyHash();

    const validPubKey = await verifyPubKey(
      proof.blueprint.props.senderDomain!,
      pubKeyHash,
      proof.props.zkFramework
    );
    if (!validPubKey) {
      logger.warn(
        "Public key of proof is invalid. The domains of blueprint and proof don't match"
      );
      return false;
    }
  } catch (err) {
    logger.error("Failed to verify proof's public key: ", err);
    throw new VerificationError("Failed to verify proof's public key", {
      cause: err instanceof Error ? err : new Error(String(err)),
    });
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
      logger.debug("sp1 proof verified: ", verified);
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
    // Re-throw VerificationError and other expected errors
    if (err instanceof VerificationError || err instanceof Error && err.message.includes("noirWasm")) {
      throw err;
    }
    logger.error("Failed to verify proof: ", err);
    throw new VerificationError("Failed to verify proof", {
      cause: err instanceof Error ? err : new Error(String(err)),
    });
  }

  throw new Error(`Unsupported zkFramework: ${proof.props.zkFramework}`);
}

export async function verifyNoirProof(
  proofDataHex: string,
  publicOutputs: string[],
  circuit: any,
  noirWasm: NoirWasm
): Promise<boolean> {
  const { UltraHonkBackend } = noirWasm;

  // TODO: we can use threads here, although not defining threads is the same speed
  // const backend = new UltraHonkBackend(circuit.bytecode, threads ? { threads } : {});
  const backend = new UltraHonkBackend(circuit.bytecode);

  const proofParsed = hexToUint8Array(proofDataHex);

  const noirProof = {
    proof: proofParsed,
    publicInputs: publicOutputs,
  };

  try {
    const isValid = await backend.verifyProof(noirProof);
    return isValid;
  } catch (err) {
    logger.error("Error in noir backend.verifyProof: ", err);
    throw new VerificationError("Failed to verify Noir proof", {
      cause: err instanceof Error ? err : new Error(String(err)),
    });
  }
}
