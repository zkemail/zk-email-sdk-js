const PUBLIC_SDK_KEY = "pk_live_51NXwT8cHf0vYAjQK9LzB3pM6R8gWx2F";
import { poseidonLarge } from "./hash";
// @ts-ignore no types available
import RSAKey from "rsa-key";
import JSZip from "jszip";
import { Buffer } from "buffer";
import * as NoirBignum from "@mach-34/noir-bignum-paramgen";
import { hashRSAPublicKey } from "@zk-email/zkemail-nr";

import { Auth } from "../types/auth";
import { getTokenFromAuth } from "../auth";
import { DkimRecord, HashingAlgorithm, ZkFramework } from "../types";
import { Crypto } from "@peculiar/webcrypto";

const crypto = new Crypto();

export async function post<T>(url: string, data?: object | null, auth?: Auth): Promise<T> {
  let authToken: string | null = null;
  if (auth) {
    try {
      authToken = await getTokenFromAuth(auth);
    } catch (err) {
      console.error("Could not get token from auth", err);
    }
  }

  try {
    const request: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": PUBLIC_SDK_KEY,
        ...(!authToken ? {} : { Authorization: authToken }),
      },
    };

    if (data) {
      request.body = JSON.stringify(data);
    }

    const response = await fetch(url, request);

    const body = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        auth!.onTokenExpired();
      }
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
  let authToken: string | null = null;
  if (auth) {
    try {
      authToken = await getTokenFromAuth(auth);
    } catch (err) {
      console.warn("Could not get token from auth", err);
    }
  }

  try {
    const request: RequestInit = {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": PUBLIC_SDK_KEY,
        ...(!authToken ? {} : { Authorization: authToken }),
      },
    };

    if (data) {
      request.body = JSON.stringify(data);
    }

    const response = await fetch(url, request);

    const body = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        auth!.onTokenExpired();
      }
      throw new Error(`HTTP error! status: ${response.status}, message: ${body}`);
    }

    return body;
  } catch (error) {
    console.error("PATCH Error:", error);
    throw error;
  }
}

export async function get<T>(url: string, queryParams?: object | null, auth?: Auth): Promise<T> {
  let authToken: string | null = null;
  if (auth) {
    try {
      authToken = await getTokenFromAuth(auth);
    } catch (err) {
      console.warn("Could not get token from auth", err);
    }
  }

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
        ...(!authToken ? {} : { Authorization: authToken }),
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        auth!.onTokenExpired();
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("GET Error:", error);
    throw error;
  }
}

export async function del<T>(url: string, data?: object | null, auth?: Auth): Promise<T> {
  let authToken: string | null = null;
  if (auth) {
    try {
      authToken = await getTokenFromAuth(auth);
    } catch (err) {
      console.error("Could not get token from auth", err);
    }
  }

  try {
    const request: RequestInit = {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": PUBLIC_SDK_KEY,
        ...(!authToken ? {} : { Authorization: authToken }),
      },
    };

    if (data) {
      request.body = JSON.stringify(data);
    }

    const response = await fetch(url, request);

    const body = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        auth!.onTokenExpired();
      }
      throw new Error(`HTTP error! status: ${response.status}, message: ${body}`);
    }

    return body;
  } catch (error) {
    // TODO: Handle token expired
    console.error("DELETE Error:", error);
    throw error;
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

export function getDKIMSelector(emlContent: string): string | null {
  const headerLines: string[] = [];
  const lines = emlContent.split("\n");
  for (const line of lines) {
    if (line.trim() === "") break;
    // If line starts with whitespace, it's a continuation of previous header
    if (line.startsWith(" ") || line.startsWith("\t")) {
      headerLines[headerLines.length - 1] += line.trim();
    } else {
      headerLines.push(line);
    }
  }

  // Then look for DKIM-Signature in the joined headers
  for (const line of headerLines) {
    if (line.includes("DKIM-Signature")) {
      const match = line.match(/s=([^;]+)/);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  }
  return null;
}

/**
 * Verifies if a hashed pubkey matches the given sender domain.
 * @param senderDomain - The sender domain, e.g. spotify.com
 * @param hashedPublicKey - The hashed public key, a BigIng as string
 * @returns Returns true if the verification was successfull, false if it failed.
 */
export async function verifyPubKey(
  senderDomain: string,
  hashedPublicKey: string,
  zkFramework: ZkFramework
): Promise<boolean> {
  const pKeys = await getPKeys(senderDomain);

  if (zkFramework === ZkFramework.Sp1) {
    for (const pKey of pKeys) {
      const key = new RSAKey(pKey);
      let pkcs1Key = key.exportKey("pkcs1", "der");
      const pkcs1Buffer = Buffer.from(pkcs1Key);
      const hashBuffer = await crypto.subtle.digest("SHA-256", pkcs1Buffer);
      const hash = new Uint8Array(hashBuffer);
      if (hash.toString() === hashedPublicKey) {
        return true;
      }
    }
    return false;
  }

  if (zkFramework === ZkFramework.Circom) {
    for (const pKey of pKeys) {
      const jwt = await importPEMPublicKey(pKey);

      // Make sure the key has an 'n' property
      if (!jwt.n) continue;

      const modulusBigInt = base64UrlToBigInt(jwt.n);
      const poseidonHash = await poseidonLarge(modulusBigInt, 9, 242);

      if (poseidonHash.toString() === hashedPublicKey) {
        return true;
      }
    }
    return false;
  }

  if (zkFramework === ZkFramework.Noir) {
    for (const pKey of pKeys) {
      const jwt = await importPEMPublicKey(pKey);

      // Make sure the key has an 'n' property
      if (!jwt.n) continue;

      const modulusBigInt = base64UrlToBigInt(jwt.n); // pubkey
      const modulus = NoirBignum.bnToLimbStrArray(modulusBigInt, 2048).map((limb: string) =>
        BigInt(limb)
      );
      const redc = NoirBignum.bnToRedcLimbStrArray(modulusBigInt, 2048).map((limb: string) =>
        BigInt(limb)
      );

      const pubKeyHash = (await hashRSAPublicKey(modulus, redc)).toString();

      if (pubKeyHash === hashedPublicKey) {
        return true;
      }
    }
    return false;
  }

  throw new Error("Unknown Hashing Algorithm");
}

async function getPKeys(senderDomain: string): Promise<string[]> {
  let response: Response;
  try {
    response = await fetch(`https://archive.zk.email/api/key?domain=${senderDomain}`, {
      method: "GET",
    });
  } catch (err) {
    console.error("Failed to get pubkey records from archive", err);
    return [];
  }

  const records = (await response.json()) as DkimRecord[];

  return records
    .filter((record) => record.domain === senderDomain)
    .flatMap((record) => extractPValues(record.value));
}

function extractPValues(input: string): string[] {
  // Match p= followed by any characters until a semicolon or end of string
  // Using positive lookbehind (?<=p=) to exclude the p= from the match
  // Using negative lookahead (?!.*p=) to ensure we don't match partial values
  const regex = /(?<=p=)([^;]+)(?=;|$)/g;

  // Find all matches
  const matches = input.match(regex);

  // Return matches or empty array if no matches found
  return matches || [];
}

async function importPEMPublicKey(pemKey: string): Promise<JsonWebKey> {
  // Remove header/footer and whitespace to extract the pure base64 key content
  // (Assuming your input is already formatted as needed.)
  const binaryDer = Uint8Array.from(atob(pemKey), (c) => c.charCodeAt(0)).buffer as ArrayBuffer;

  // Import the public key using the Web Crypto API
  const cryptoKey = await crypto.subtle.importKey(
    "spki",
    binaryDer,
    {
      name: "RSA-OAEP",
      hash: { name: "SHA-256" },
    },
    true,
    ["encrypt"]
  );

  // Export the key as a JWK, which gives you an object with properties like `n` and `e`
  return await crypto.subtle.exportKey("jwk", cryptoKey);
}

function base64UrlToBigInt(base64Url: string): bigint {
  // Convert base64url to standard base64
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  // Add padding if necessary
  const pad = base64.length % 4;
  if (pad) {
    base64 += "=".repeat(4 - pad);
  }
  // Decode base64 string to binary string
  const binaryStr = atob(base64);
  // Convert binary string to a hex string
  let hex = "";
  for (let i = 0; i < binaryStr.length; i++) {
    let h = binaryStr.charCodeAt(i).toString(16);
    if (h.length === 1) h = "0" + h;
    hex += h;
  }
  return BigInt("0x" + hex);
}

export async function downloadJsonFromUrl<T>(url: string): Promise<T> {
  // Download and parse the JSON from circuitUrl
  let data;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data from url: ${response.statusText}`);
    }
    data = await response.json();
  } catch (error) {
    console.error("Error downloading or parsing response data:", error);
    throw new Error("Failed to download or parse the response data");
  }
  console.log("returning downloaded data: ", data);
  return data;
}

export async function downloadAndUnzipFile(url: string): Promise<Record<string, any>> {
  try {
    // Fetch the file
    const response = await fetch(url);

    // Check if the request was successful
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Get the response as an ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();

    // Create a new JSZip instance
    const zip = new JSZip();

    // Load the zip file content
    const zipContent = await zip.loadAsync(arrayBuffer);

    // Process the zip contents
    const files: Record<string, any> = {};

    // Iterate over each file in the zip
    const filePromises = Object.keys(zipContent.files).map(async (filename) => {
      const file = zipContent.files[filename];

      // Skip directories
      if (file.dir) return;

      // Get the file content as text, blob, arrayBuffer, etc.
      // depending on what you need
      // For text files:
      const content = await file.async("text");
      files[filename] = content;

      // For JSON files:
      if (filename.endsWith(".json")) {
        try {
          files[filename] = JSON.parse(content);
        } catch (e) {
          console.error(`Error parsing JSON in ${filename}`, e);
        }
      }
    });

    // Wait for all files to be processed
    await Promise.all(filePromises);

    return files;
  } catch (error) {
    console.error("Error downloading or unzipping the file:", error);
    throw error;
  }
}

export function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}
