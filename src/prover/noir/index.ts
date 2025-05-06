import { AbstractProver, IProver } from "..";
import { Proof } from "../../proof";
import { ExternalInputInput, GenerateProofOptions } from "../../types";
import { type Noir } from "@noir-lang/noir_js";
import { type UltraHonkBackend } from "@aztec/bb.js";
import {
  parseEmail,
  generateNoirCircuitInputsWithRegexesAndExternalInputs,
} from "@zk-email/relayer-utils";
import {
  generateEmailVerifierInputsFromDKIMResult,
  verifyDKIMSignature,
  type InputGenerationArgs,
} from "@zk-email/zkemail-nr";
import { log } from "console";

type NoirParams = {
  Noir: typeof Noir;
  UltraHonkBackend: typeof UltraHonkBackend;
};

export class NoirProver extends AbstractProver implements IProver {
  // async generateLocalProofWebpack(
  //   eml: string,
  //   externalInputs: ExternalInputInput[] = [],
  //   noirParams: NoirParams
  // ) {
  //   console.log("Generating proof with webpack");
  //   return await this._generateLocalProof(eml, externalInputs, noirParams);
  // }

  // async generateLocalProof(eml: string, externalInputs: ExternalInputInput[] = []) {
  //   const noirParams = await (await import(/* @vite-ignore */ "./initNoirWasm")).initNoirWasm();
  //   return await this._generateLocalProof(eml, externalInputs, noirParams);
  // }

  async generateLocalProof(
    eml: string,
    externalInputs: ExternalInputInput[] = [],
    options?: GenerateProofOptions
  ): Promise<Proof> {
    console.log("got options in generateLocalProof for noir: ", options);
    if (!options || !options.noirWasm) {
      throw new Error("You must pass initialized noirWasm to the options");
    }

    const parsedEmail = await parseEmail(eml);

    const { Noir, UltraHonkBackend } = options.noirWasm;

    const startedAt = new Date();

    // const { Noir, UltraHonkBackend } = await initNoirWasm();

    if (this.blueprint.props.externalInputs?.length && !externalInputs.length) {
      throw new Error(
        `The ${this.blueprint.props.slug} blueprint requires external inputs: ${this.blueprint.props.externalInputs}`
      );
    }

    const circuit = await this.blueprint.getNoirCircuit();
    console.log("got the circuit: ", !!circuit);
    console.log("got the circuit type: ", typeof circuit);
    const regexGraphs = await this.blueprint.getNoirRegexGraphs();

    console.log("regexGraphs: ", regexGraphs);

    const regexInputs = this.blueprint.props.decomposedRegexes.map((dr) => {
      const regexGraph = regexGraphs[`${dr.name}_regex.json`];
      if (!regexGraph) {
        throw new Error(`No regexGraph was compiled for decomposedRegexe ${dr.name}`);
      }

      const haystack =
        dr.location === "header" ? parsedEmail.canonicalizedHeader : parsedEmail.cleanedBody;

      // return {
      //   name: dr.name,
      //   regexGraphJson: regexGraph,
      //   haystack,
      //   maxHaystackLength: dr.maxLength,
      //   maxMatchLength: dr.maxLength,
      //   // TODO: what type exectly to use here?
      //   provingFramework: "Noir",
      // };

      const maxHaystackLength =
        dr.location === "header"
          ? this.blueprint.props.emailHeaderMaxLength
          : this.blueprint.props.emailBodyMaxLength;

      return {
        name: dr.name,
        regex_graph_json: JSON.stringify(regexGraph),
        haystack,
        max_haystack_length: maxHaystackLength,
        max_match_length: dr.maxLength,
        // TODO: what type exectly to use here?
        proving_framework: "noir",
      };
    });

    console.log("regexInputs: ", regexInputs);

    const noirParams = {
      maxHeaderLength: this.blueprint.props.emailHeaderMaxLength || 512,
      maxBodyLength: this.blueprint.props.emailBodyMaxLength || 0,
      ignoreBodyHashCheck: this.blueprint.props.ignoreBodyHashCheck || false,
      removeSoftLineBreaks: this.blueprint.props.removeSoftLinebreaks || false,
      shaPrecomputeSelector: this.blueprint.props.shaPrecomputeSelector,
      proverEthAddress: "0x0000000000000000000000000000000000000000",
    };

    // const noirParams = {
    //   maxHeaderLength: this.blueprint.props.emailHeaderMaxLength,
    //   ignoreBodyHashCheck: this.blueprint.props.ignoreBodyHashCheck,
    // };

    console.log("generating inputs regexInputs: ", regexInputs);
    console.log("generating inputs externalInputs: ", externalInputs);
    console.log("generating inputs noirParams: ", noirParams);

    const circuitInputs = await generateNoirCircuitInputsWithRegexesAndExternalInputs(
      eml,
      regexInputs,
      externalInputs || [],
      noirParams
    );

    console.log("circuitInputs: ", circuitInputs);

    if (!circuitInputs) {
      throw new Error("Could not generate circuit inputs for noir");
    }

    const compiledProgram = circuit as any;

    const threads = window.navigator.hardwareConcurrency;
    // @ts-ignore
    const noir = new Noir(compiledProgram);
    console.log("init noir");
    // @ts-ignore
    const backend = new UltraHonkBackend(compiledProgram.bytecode, {
      threads,
    });

    console.log("initialized backend");

    const circuitInputsObject = {};
    for (const [key, value] of circuitInputs) {
      if (value && typeof value === "object" && value instanceof Map) {
        circuitInputsObject[key] = Object.fromEntries(value);
      } else if (value && typeof value === "object") {
        circuitInputsObject[key] = value;
      } else if (value) {
        circuitInputsObject[key] = value;
      }
    }

    // const { witness } = await noir.execute(circuitInputs);
    // const circtuitInputsObject = Object.fromEntries(circuitInputs);
    console.log("circtuitInputsObject: ", circuitInputsObject);
    const { witness } = await noir.execute(circuitInputsObject);

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

// type CircuitInputs = {
//   [key: string]: any;
// };

// type RegexInput = {
//   name: string;
//   regexGraphJson: string;
//   haystack: string;
//   maxHaystackLength: number;
//   maxMatchLength: number;
//   provingFramework: ProvingFramework;
// };

// type ExternalInput = {
//   name: string;
//   value?: [string];
//   maxLength: number;
// };

// type NoirCircuitInputWithDecomposedRegexesAndExternalInputsParams = {
//   proverEthAddress: string;
//   maxHeadersLength: number;
//   maxBodyLength: number;
//   ignoreBodyHashCheck: boolean;
//   removeSoftLineBreaks: boolean;
//   shaPrecomputeSelector: string;
// };

// /*
//  haystack = body or header
// RegexInput = RegexGraphs of decomposed by name
// proverEth address to figure out
// */

// async function generateNoirCircuitInputsWithDecomposedRegexesAndExternalInputs(
//   email: string,
//   regexInputs: RegexInput[],
//   externalInputs: ExternalInput[],
//   params: NoirCircuitInputWithDecomposedRegexesAndExternalInputsParams
// ) {
//   let emailCircuitParams: InputGenerationArgs = {
//     maxHeadersLength: params.maxHeadersLength,
//     maxBodyLength: params.maxBodyLength,
//     ignoreBodyHashCheck: params.ignoreBodyHashCheck,
//     removeSoftLineBreaks: params.removeSoftLineBreaks,
//     shaPrecomputeSelector: params.shaPrecomputeSelector,
//   };

//   let dkimResult = await verifyDKIMSignature(email);
//   let circuitInputs: CircuitInputs = generateEmailVerifierInputsFromDKIMResult(
//     dkimResult,
//     emailCircuitParams
//   );

//   // Process external inputs
//   circuitInputs["prover_eth_address"] = [params.proverEthAddress];
//   for (let externalInput of externalInputs) {
//     circuitInputs[externalInput.name] = externalInput.value;
//   }

//   // Process each regex input
//   for (let regexInput of regexInputs) {
//     const regexResult = JSON.parse(
//       genCircuitInputs(
//         regexInput.regexGraphJson,
//         regexInput.haystack,
//         regexInput.maxHaystackLength,
//         regexInput.maxMatchLength,
//         regexInput.provingFramework
//       )
//     );

//     // Prefix the fields with regex name as in the tera template
//     circuitInputs[`${regexInput.name}_match_start`] = regexResult.match_start;
//     circuitInputs[`${regexInput.name}_match_length`] = regexResult.match_length;
//     circuitInputs[`${regexInput.name}_current_states`] = regexResult.curr_states;
//     circuitInputs[`${regexInput.name}_next_states`] = regexResult.next_states;

//     // Add capture group fields if they exist
//     if (regexResult.capture_group_ids) {
//       circuitInputs[`${regexInput.name}_capture_groups_ids`] = regexResult.capture_group_ids;
//       circuitInputs[`${regexInput.name}_capture_groups_starts`] = regexResult.capture_group_starts;
//       circuitInputs[`${regexInput.name}_capture_groups_indices`] =
//         regexResult.capture_group_start_indices;
//     }
//   }
// }
