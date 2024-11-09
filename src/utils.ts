const PUBLIC_SDK_KEY = "pk_live_51NXwT8cHf0vYAjQK9LzB3pM6R8gWx2F";

import {
  DecomposedRegex,
  DecomposedRegexJson,
  DecomposedRegexPart,
  DecomposedRegexPartJson,
} from "./blueprint";
import { Auth } from "./types/auth";
import { getTokenFromAuth } from "./auth";
import type * as NodeUtils from "@dimidumo/relayer-utils/node";
import type * as WebUtils from "@dimidumo/relayer-utils/web";
import {
  ExternalInput,
  GenerateProofInputsParams,
  GenerateProofInputsParamsInternal,
} from "./types";

type RelayerUtilsType = typeof NodeUtils | typeof WebUtils;

let relayerUtilsResolver: (value: any) => void;
const relayerUtils: Promise<RelayerUtilsType> = new Promise((resolve) => {
  relayerUtilsResolver = resolve;
});

// @ts-ignore
// if (typeof window === "undefined" || typeof Deno !== "undefined") {
if (false) {
  console.warn("Relayer utils won't work when used server side");
  // console.log("Initializing for node");
  // import("@dimidumo/relayer-utils/node")
  //   .then((rl) => {
  //     relayerUtilsResolver(rl);
  //   })
  //   .catch((err) => console.log("failed to init WASM on node: ", err));
} else {
  console.log("frontend wasm");
  try {
    import("@dimidumo/relayer-utils/web")
      .then(async (rl) => {
        // @ts-ignore
        await rl.default();
        relayerUtilsResolver(rl);
      })
      .catch((err) => {
        console.log("Failed to init WASM: ", err);
      });
  } catch (err) {}
}

export async function post<T>(url: string, data?: object | null, auth?: Auth): Promise<T> {
  try {
    const request: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": PUBLIC_SDK_KEY,
        ...(!auth ? {} : { Authorization: await getTokenFromAuth(auth) }),
      },
    };

    if (data) {
      request.body = JSON.stringify(data);
    }

    const response = await fetch(url, request);

    const body = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}, message: ${body}`);
    }

    return body;
  } catch (error) {
    // TODO: Handle token expired
    console.error("POST Error:", error);
    throw error;
  }
}

export async function patch<T>(url: string, data?: object | null, auth?: Auth): Promise<T> {
  try {
    const request: RequestInit = {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": PUBLIC_SDK_KEY,
        ...(!auth ? {} : { Authorization: await getTokenFromAuth(auth) }),
      },
    };

    if (data) {
      request.body = JSON.stringify(data);
    }

    const response = await fetch(url, request);

    const body = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}, message: ${body}`);
    }

    return body;
  } catch (error) {
    console.error("PATCH Error:", error);
    throw error;
  }
}

export async function get<T>(url: string, queryParams?: object | null, auth?: Auth): Promise<T> {
  try {
    let fullUrl = url;
    if (queryParams) {
      const searchParams = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value) {
          searchParams.append(key, String(value));
        }
      });
      if (searchParams.size > 0) {
        fullUrl += `?${searchParams.toString()}`;
      }
    }

    const response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": PUBLIC_SDK_KEY,
        ...(!auth ? {} : { Authorization: await getTokenFromAuth(auth) }),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("GET Error:", error);
    throw error;
  }
}

// Provisional type, delete once libary types
type ParsedEmail = {
  canonicalized_header: string;
  canonicalized_body: string;
  signature: number[];
  public_key: any[];
  cleaned_body: string;
  headers: Map<string, string[]>;
};

export async function parseEmail(eml: string): Promise<ParsedEmail> {
  try {
    const utils = await relayerUtils;
    const parsedEmail = await utils.parseEmail(eml);
    return parsedEmail as ParsedEmail;
  } catch (err) {
    console.error("Failed to parse email: ", err);
    throw err;
  }
}

export async function testDecomposedRegex(
  eml: string,
  decomposedRegex: DecomposedRegex | DecomposedRegexJson,
  revealPrivate = false
): Promise<string[]> {
  const parsedEmail = await parseEmail(eml);

  const inputDecomposedRegex = {
    parts: decomposedRegex.parts.map((p: DecomposedRegexPart | DecomposedRegexPartJson) => ({
      is_public: "isPublic" in p ? p.isPublic : p.is_public,
      regex_def: "regexDef" in p ? p.regexDef : p.regex_def,
    })),
  };

  let inputStr: string;
  if (decomposedRegex.location === "body") {
    inputStr = parsedEmail.canonicalized_body;
  } else if (decomposedRegex.location === "header") {
    inputStr = parsedEmail.canonicalized_header;
  } else {
    throw Error(`Unsupported location ${decomposedRegex.location}`);
  }

  // const maxLength =
  //   "maxLength" in decomposedRegex ? decomposedRegex.maxLength : decomposedRegex.max_length;
  // if (inputStr.length > maxLength) {
  //   throw new Error(`Max length of ${maxLength} was exceeded`);
  // }

  const utils = await relayerUtils;
  const result = utils.extractSubstr(inputStr, inputDecomposedRegex, revealPrivate);
  return result;
}

export async function generateProofInputs(
  eml: string,
  decomposedRegexes: DecomposedRegex[],
  externalInputs: ExternalInput[],
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

    const utils = await relayerUtils;
    console.log("got relayer utils");
    console.log("actually creating proof inputs with params: ", internalParams);

    const decomposedRegexesCleaned = decomposedRegexes.map((dcr) => {
      return {
        ...dcr,
        parts: dcr.parts.map((p) => ({
          // @ts-ignore
          is_public: p.isPublic || p.is_public,
          // @ts-ignore
          regex_def: p.regexDef || p.regex_def,
        })),
      };
    });

    console.log("calling generateCircuitInputsWithDecomposedRegexesAndExternalInputs with");
    console.log("eml: ", eml);
    console.log("decomposedRegex: ", decomposedRegexesCleaned);
    console.log("externalInputs: ", externalInputs);
    console.log("params: ", params);

    const inputs = await utils.generateCircuitInputsWithDecomposedRegexesAndExternalInputs(
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

export function startJsonFileDownload(json: string, name = "data") {
  if (!window && !document) {
    throw Error("startFilesDownload can only be used in a browser");
  }

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
