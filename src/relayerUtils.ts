import {
  DecomposedRegex,
  DecomposedRegexJson,
  DecomposedRegexPart,
  DecomposedRegexPartJson,
} from "./blueprint";
import {
  BlueprintProps,
  GenerateProofInputsParams,
  GenerateProofInputsParamsInternal,
  ParsedEmail,
  ExternalInputInput,
  PublicProofData,
} from "./types";
import {
  init,
  parseEmail as parseEmailUtils,
  sha256Pad,
  extractSubstr,
  generateCircuitInputsWithDecomposedRegexesAndExternalInputs,
} from "@zk-email/relayer-utils";

let relayerUtilsResolver: (value: any) => void;
const relayerUtilsInit: Promise<void> = new Promise((resolve) => {
  relayerUtilsResolver = resolve;
});

init()
  .then(() => {
    relayerUtilsResolver(null);
  })
  .catch((err) => {
    console.log("Failed to initialize wasm for relayer-utils: ", err);
  });

export async function parseEmail(eml: string): Promise<ParsedEmail> {
  try {
    await relayerUtilsInit;
    const parsedEmail = await parseEmailUtils(eml);
    return parsedEmail as ParsedEmail;
  } catch (err) {
    console.error("Failed to parse email: ", err);
    throw err;
  }
}

// TODO: move out functionality to testDecomposedRegex so it can used seperately
export async function testBlueprint(
  eml: string,
  blueprint: BlueprintProps,
  revealPrivate = false
): Promise<string[][]> {
  const parsedEmail = await parseEmail(eml);

  if (
    (blueprint.emailBodyMaxLength === undefined && !blueprint.ignoreBodyHashCheck) ||
    blueprint.emailHeaderMaxLength === undefined
  ) {
    throw new Error("emailBodyMaxLength and emailHeaderMaxLength must be provided");
  }

  let body = parsedEmail.cleanedBody;
  if (blueprint.shaPrecomputeSelector) {
    const splitEmail = body.split(blueprint.shaPrecomputeSelector)[1];
    if (!splitEmail) {
      throw new Error(
        `Precompute selector was not found in email, selector: ${blueprint.shaPrecomputeSelector}`
      );
    }
    body = splitEmail;
  }

  const header = parsedEmail.canonicalizedHeader;

  await checkInputLengths(header, body, blueprint);

  const output = await Promise.all(
    blueprint.decomposedRegexes.map((dcr: DecomposedRegex) =>
      testDecomposedRegex(body, header, dcr, revealPrivate)
    )
  );

  return output;
}

async function checkInputLengths(header: string, body: string, blueprint: BlueprintProps) {
  await relayerUtilsInit;
  const encoder = new TextEncoder();
  const headerData = encoder.encode(header);
  const headerLength = (await sha256Pad(headerData, blueprint.emailHeaderMaxLength!)).get(
    "messageLength"
  );
  if (headerLength > blueprint.emailHeaderMaxLength!) {
    throw new Error(`emailHeaderMaxLength of ${blueprint.emailHeaderMaxLength} was exceeded`);
  }

  if (!blueprint.ignoreBodyHashCheck) {
    const bodyData = encoder.encode(body);

    const bodyShaLength = ((body.length + 63 + 65) / 64) * 64;

    const maxShaBytes = Math.max(bodyShaLength, blueprint.emailBodyMaxLength!);

    const bodyLength = (await sha256Pad(bodyData, maxShaBytes)).get("messageLength");

    if (bodyLength > blueprint.emailBodyMaxLength!) {
      throw new Error(`emailBodyMaxLength of ${blueprint.emailBodyMaxLength} was exceeded`);
    }
  }
}

export async function testDecomposedRegex(
  body: string,
  header: string,
  decomposedRegex: DecomposedRegex | DecomposedRegexJson,
  revealPrivate = false
): Promise<string[]> {
  const inputDecomposedRegex = {
    parts: decomposedRegex.parts.map((p: DecomposedRegexPart | DecomposedRegexPartJson) => ({
      is_public: "isPublic" in p ? p.isPublic : p.is_public,
      regex_def: "regexDef" in p ? p.regexDef : p.regex_def,
    })),
  };

  let inputStr: string;
  if (decomposedRegex.location === "body") {
    inputStr = body;
  } else if (decomposedRegex.location === "header") {
    inputStr = header;
  } else {
    throw Error(`Unsupported location ${decomposedRegex.location}`);
  }

  const maxLength =
    "maxLength" in decomposedRegex ? decomposedRegex.maxLength : decomposedRegex.max_length;

  await relayerUtilsInit;
  const privateResult = extractSubstr(inputStr, inputDecomposedRegex, false);

  if (privateResult[0].length > maxLength) {
    throw new Error(
      `Max length of ${maxLength} of extracted result was exceeded for decomposed regex ${decomposedRegex.name}`
    );
  }

  if (!revealPrivate) {
    return privateResult;
  }

  const result = extractSubstr(inputStr, inputDecomposedRegex, revealPrivate);
  return result;
}

export async function generateProofInputs(
  eml: string,
  decomposedRegexes: DecomposedRegex[],
  externalInputs: ExternalInputInput[],
  params: GenerateProofInputsParams
): Promise<string> {
  try {
    const internalParams: GenerateProofInputsParamsInternal = {
      maxHeaderLength: params.emailHeaderMaxLength,
      maxBodyLength: params.emailBodyMaxLength,
      ignoreBodyHashCheck: params.ignoreBodyHashCheck,
      removeSoftLinesBreaks: params.removeSoftLinebreaks,
      shaPrecomputeSelector: params.shaPrecomputeSelector,
    };

    await relayerUtilsInit;

    const decomposedRegexesCleaned = decomposedRegexes.map((dcr) => {
      return {
        ...dcr,
        parts: dcr.parts.map((p) => ({
          // @ts-ignore
          is_public: p.isPublic || !!p.is_public,
          // @ts-ignore
          regex_def: p.regexDef || !!p.regex_def,
        })),
      };
    });

    const inputs = await generateCircuitInputsWithDecomposedRegexesAndExternalInputs(
      eml,
      decomposedRegexesCleaned,
      externalInputs,
      internalParams
    );

    return JSON.stringify(Object.fromEntries(inputs));
  } catch (err) {
    console.error("Failed to generate inputs for proof");
    throw err;
  }
}

export async function getMaxEmailBodyLength(emlContent: string, shaPrecomputeSelector: string) {
  const parsedEmail = await parseEmail(emlContent);

  const body = parsedEmail.cleanedBody;
  const index = body.indexOf(shaPrecomputeSelector);

  if (index === -1) {
    return body.length;
  }

  return body.length - index - shaPrecomputeSelector.length;
}

export async function extractEMLDetails(emlContent: string) {
  const headers: Record<string, string> = {};
  const lines = emlContent.split("\n");

  let headerPart = true;
  let headerLines = [];

  // Parse headers
  for (let line of lines) {
    if (headerPart) {
      if (line.trim() === "") {
        headerPart = false; // End of headers
      } else {
        headerLines.push(line);
      }
    }
  }

  // Join multi-line headers and split into key-value pairs
  const joinedHeaders = headerLines
    .map((line) =>
      line.startsWith(" ") || line.startsWith("\t") ? line.trim() : `\n${line.trim()}`
    )
    .join("")
    .split("\n");

  joinedHeaders.forEach((line) => {
    const [key, ...value] = line.split(":");
    if (key) headers[key.trim()] = value.join(":").trim();
  });

  // Extract details
  const senderDomain =
    headers["Return-Path"]
      ?.match(/@([^\s>]+)/)?.[1]
      ?.split(".")
      .slice(-2)
      .join(".") || null;
  const emailQuery = `from:${senderDomain}`;
  const parsedEmail = await parseEmail(emlContent);
  console.log(parsedEmail.canonicalizedBody, "parsedEmail");
  const emailBodyMaxLength = parsedEmail.cleanedBody.length;
  const headerLength = parsedEmail.canonicalizedHeader.length;

  return { senderDomain, headerLength, emailQuery, emailBodyMaxLength };
}

// Parses public signals from a proof to readable outputs
// Translated from our existing go code internal/temporal/workflows/circom_workflows.go
export function parsePublicSignals(
  publicSignals: string[],
  decomposedRegexes: DecomposedRegex[]
): PublicProofData {
  let publicOutputIterator = 1; // like publicOutputIterator in Go
  const publicStruct: { [key: string]: string[] } = {};

  decomposedRegexes.forEach((decomposedRegex) => {
    const signalLength = Math.ceil(decomposedRegex.maxLength / 31);

    const partOutputs: string[] = [];

    decomposedRegex.parts.forEach((part) => {
      if (part.isPublic) {
        // Slice out the relevant subset from publicSignals
        const publicOutputsSlice = publicSignals.slice(
          publicOutputIterator,
          publicOutputIterator + signalLength
        );

        // Decode using the replicated Go logic
        const output = processIntegers(publicOutputsSlice);

        // Store the decoded result
        partOutputs.push(output);

        // Advance the iterator
        publicOutputIterator += signalLength;
      }
    });

    // Collect all part outputs for this decomposedRegex
    publicStruct[decomposedRegex.name] = partOutputs;
  });

  // Combine part outputs into final object
  return publicStruct;
}

function decodePublicOutputs(outputs: { [key: string]: string[] }): { [key: string]: string } {
  const decodedOutputs: { [key: string]: string } = {};
  for (const [key, values] of Object.entries(outputs)) {
    decodedOutputs[key] = values.join(""); // Concatenate everything for that key
  }
  return decodedOutputs;
}

function processIntegers(integers: string[]): string {
  let result = "";

  for (const numStr of integers) {
    // 1. Convert string to BigInt
    let n: bigint;
    try {
      n = BigInt(numStr);
    } catch (err) {
      console.warn("Failed to parse integer:", numStr, err);
      continue;
    }

    if (n === 0n) continue;

    // 2. Convert BigInt to hex, ensure even length
    let hexStr = n.toString(16);
    if (hexStr.length % 2 !== 0) {
      hexStr = "0" + hexStr;
    }

    // 3. Decode hex -> bytes
    const bytes: number[] = [];
    for (let i = 0; i < hexStr.length; i += 2) {
      bytes.push(parseInt(hexStr.slice(i, i + 2), 16));
    }

    // 4. *** Reverse the bytes array (NOT the final string) ***
    for (let i = 0, j = bytes.length - 1; i < j; i++, j--) {
      const tmp = bytes[i];
      bytes[i] = bytes[j];
      bytes[j] = tmp;
    }

    // 5. Decode reversed bytes to UTF-8
    const decodedString = new TextDecoder().decode(new Uint8Array(bytes));

    // 6. Concatenate to result
    result += decodedString;
  }

  return result;
}
