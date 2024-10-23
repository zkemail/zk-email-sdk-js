const PUBLIC_SDK_KEY = "pk_live_51NXwT8cHf0vYAjQK9LzB3pM6R8gWx2F";
import initWasm, { parseEmail as zkEamilParseEmail, extractSubstr } from "@zk-email/relayer-utils";
import { DecomposedRegexPart } from "./blueprint";

initWasm()
  .then(() => console.log("wasm initialized"))
  .catch((err) => {
    console.log("Failed to init wasm: ", err);
  });

export async function post<T>(url: string, data?: object): Promise<T> {
  try {
    const request: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": PUBLIC_SDK_KEY,
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
    console.error("POST Error:", error);
    throw error;
  }
}

export async function patch<T>(url: string, data?: object): Promise<T> {
  try {
    const request: RequestInit = {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": PUBLIC_SDK_KEY,
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

export async function get<T>(url: string, queryParams?: object): Promise<T> {
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
    const parsedEmail = await zkEamilParseEmail(eml);
    return parsedEmail as ParsedEmail;
  } catch (err) {
    console.error("Failed to parse email: ", err);
    throw err;
  }
}

// TODO: Should take maxLength and location into consideration
export function testDecomposedRegex(
  eml: string,
  decomposedRegex: any,
  revealPrivate = false
): string[] {
  const inputDecomposedRegex = {
    parts: decomposedRegex.parts.map((p: DecomposedRegexPart) => ({
      is_public: p.isPublic,
      regex_def: p.regexDef,
    })),
  };

  const result = extractSubstr(eml, inputDecomposedRegex, revealPrivate);
  return result;
}
