import { generateEmailVerifierInputs } from "@zk-email/zkemail-nr";
import { AbstractProver, IProver } from "..";
import { Proof } from "../../proof";
import { ExternalInputInput, ZkFramework } from "../../types";
import { Buffer } from "buffer";
import { UltraHonkBackend } from "@aztec/bb.js";
import { Noir } from "@noir-lang/noir_js";
import { initNoirWasm } from "./initNoirWasm";

export class NoirProver extends AbstractProver implements IProver {
  async generateLocalProof(eml: string, externalInputs: ExternalInputInput[] = []): Promise<Proof> {
    const startedAt = new Date();
    await initNoirWasm();
    console.log("generating local noir proof");

    if (this.blueprint.props.externalInputs?.length && !externalInputs.length) {
      throw new Error(
        `The ${this.blueprint.props.slug} blueprint requires external inputs: ${this.blueprint.props.externalInputs}`
      );
    }

    const circuit = await this.blueprint.getNoirCircuit();

    const circuitInputs = await generateEmailVerifierInputs(Buffer.from(eml), {
      maxHeadersLength: 512,
      ignoreBodyHashCheck: true,
    });

    console.log("circuitInputs: ", circuitInputs);

    if (!circuitInputs) {
      throw new Error("Could not generate circuit inputs for noir");
    }

    const compiledProgram = circuit as any;

    const threads = window.navigator.hardwareConcurrency;
    const noir = new Noir(compiledProgram);
    console.log("init noir");
    const backend = new UltraHonkBackend(compiledProgram.bytecode, {
      threads,
    });

    console.log("initialized backend");

    const { witness } = await noir.execute({
      header: circuitInputs.header,
      pubkey: circuitInputs.pubkey,
      signature: circuitInputs.signature,
    });

    console.log("witness: ", witness);

    const proof = await backend.generateProof(witness);
    console.log("proof: ", proof);
    const isValid = await backend.verifyProof(proof);
    console.log("isValid: ", isValid);

    this._incNumLocalProofs().catch((err) =>
      console.warn("Failed to increase num of local proofs")
    );

    return new Proof(this.blueprint, {
      id: crypto.randomUUID(),
      blueprintId: this.blueprint.props.id!,
      input: JSON.stringify(circuitInputs),
      proofData: JSON.stringify(proof.proof),
      publicOutputs: proof.publicInputs,
      isLocal: true,
      startedAt,
      provedAt: new Date(),
    });
  }
}
