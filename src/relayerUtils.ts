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

  console.log("maxLength: ", maxLength);

  await relayerUtilsInit;
  const privateResult = extractSubstr(inputStr, inputDecomposedRegex, false);

  console.log("privateResult : ", privateResult);

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
