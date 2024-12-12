const PUBLIC_SDK_KEY = "pk_live_51NXwT8cHf0vYAjQK9LzB3pM6R8gWx2F";

import { Auth } from "./types/auth";
import { getTokenFromAuth } from "./auth";

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
