import { Proof } from "./proof";
import { ZkFramework } from "./blueprint";
import { hexToUint8Array, verifyPubKey } from "./utils";
// @ts-ignore Ignore missing types
import * as snarkjs from "@zk-email/snarkjs";
import { parsePublicSignals, verifySp1Proof } from "./relayerUtils";
import { GenerateProofOptions, NoirWasm } from "./types";
import { logger } from "./utils/logger";
import {
  canonicalPublicOutputs,
  decodeNoirRegexOutputs,
  noirRegexOutputsStart,
  publicDataMatches,
} from "./utils/publicOutputs";

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
  let parsedPublicOutputs: string[];
  try {
    // REASON: see verifyProof; verify one canonical copy of the outputs.
    parsedPublicOutputs = canonicalPublicOutputs(JSON.parse(publicOutputs), "decimal");
  } catch (err) {
    logger.warn("Proof has malformed public outputs: ", err);
    return false;
  }
  try {
    const pubKeyHash = parsedPublicOutputs[0];
    const validPubKey = await verifyPubKey(senderDomain, pubKeyHash, ZkFramework.Circom);

    if (!validPubKey) {
      logger.warn("Public key of proof is invalid. The domains of blueprint and proof don't match");
      return false;
    }
  } catch (err) {
    logger.warn("Failed to verify proofs public key");
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
    logger.error("Failed to verify proof: ", err);
  }
  return false;
}

export async function verifyProof(proof: Proof, options?: GenerateProofOptions) {
  if (proof.props.blueprintId !== proof.blueprint.props.id) {
    throw Error(`The proof was generated using a different blueprint: ${proof.props.blueprintId}`);
  }

  // REASON: verify and decode ONE canonical copy of the public outputs (utils/publicOutputs.ts).
  // Non-canonical spellings are rejected instead of being verified one way and displayed another.
  let outputs: string[] | undefined;
  if (
    proof.props.zkFramework === ZkFramework.Circom ||
    proof.props.zkFramework === ZkFramework.Noir
  ) {
    try {
      outputs = canonicalPublicOutputs(
        proof.props.publicOutputs,
        proof.props.zkFramework === ZkFramework.Noir ? "hex" : "decimal"
      );
    } catch (err) {
      logger.warn("Proof has malformed public outputs: ", err);
      return false;
    }
  }

  try {
    const pubKeyHash = outputs
      ? proof.props.zkFramework === ZkFramework.Noir
        ? BigInt(outputs[0]).toString()
        : outputs[0]
      : await proof.getPubKeyHash();

    const validPubKey = await verifyPubKey(
      proof.blueprint.props.senderDomain!,
      pubKeyHash,
      proof.props.zkFramework
    );
    if (!validPubKey) {
      logger.warn("Public key of proof is invalid. The domains of blueprint and proof don't match");
      return false;
    }
  } catch (err) {
    console.warn("Failed to verify proofs public key: ", err);
    return false;
  }

  try {
    let verified = false;
    if (proof.props.zkFramework === ZkFramework.Circom) {
      const vkey = await proof.blueprint.getVkey();
      verified = await snarkjs.groth16.verify(JSON.parse(vkey), outputs, proof.props.proofData);
    } else if (proof.props.zkFramework === ZkFramework.Sp1) {
      // @ts-ignore
      const sp1Verified = await verifySp1Proof(
        // @ts-ignore
        proof.props.proofData.hex,
        // @ts-ignore
        proof.props.publicOutputs.outputs_hex,
        proof.props.sp1VkeyHash!
      );
      logger.debug("sp1 proof verified: ", sp1Verified);
      return sp1Verified;
    } else if (proof.props.zkFramework === ZkFramework.Noir) {
      if (!options || !options.noirWasm) {
        throw new Error("You must pass initialized noirWasm to the options");
      }
      const circuit = await proof.blueprint.getNoirCircuit(proof.props.dkimKeyBits);
      const proofDataHex = proof.props.proofData!;
      verified = await verifyNoirProof(proofDataHex, outputs!, circuit, options.noirWasm);
    }
    return verified && publicDataIsProven(proof, outputs!);
  } catch (err) {
    logger.warn("Failed to verify proof: ", err);
  }
  return false;
}

/**
 * True if the proof's `publicData` (the decoded regex parts shown to users) is exactly what its
 * verified outputs decode to.
 *
 * REASON: publicData travels next to the proof (e.g. packProof() -> server -> unPackProof()) and
 * is not covered by the proof system. Without this check, verify() returned true for a valid
 * proof whose publicData had been edited, and callers then read the edited values.
 */
export function publicDataIsProven(proof: Proof, outputs: string[]): boolean {
  const { decomposedRegexes = [], externalInputs = [] } = proof.blueprint.props;
  let decoded: { [name: string]: string[] };
  try {
    decoded =
      proof.props.zkFramework === ZkFramework.Noir
        ? decodeNoirRegexOutputs(outputs, decomposedRegexes, noirRegexOutputsStart(externalInputs))
        : parsePublicSignals(outputs, decomposedRegexes);
  } catch (err) {
    logger.warn("Could not decode the proof's public outputs: ", err);
    return false;
  }
  if (!publicDataMatches(proof.props.publicData, decoded)) {
    logger.warn("The proof's publicData does not match its verified public outputs");
    return false;
  }
  return true;
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
    const isValid = await backend.verifyProof(noirProof, { keccak: true });
    return isValid;
  } catch (err) {
    logger.error("err for noir backend.verifyProof: ", err);
    return false;
  }
}
