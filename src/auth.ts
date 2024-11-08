import { Auth } from "./types/auth";

// prod
const GITHUB_CLIENT_ID = "Ov23li0KABFCUsxBEQkn";

// const GITHUB_CLIENT_ID = "Ov23liUVyAeZK1bxoAkh";

export function getLoginWithGithubUrl(
  callbackUrl: string,
  githubClientId = GITHUB_CLIENT_ID
): string {
  const state = encodeURIComponent(callbackUrl);
  return `https://github.com/login/oauth/authorize?client_id=${githubClientId}&scope=user:email&state=${state}`;
}

export async function getTokenFromAuth(auth: Auth): Promise<string> {
  try {
    let token = await auth.getToken();

    if (!token) {
      await auth.onTokenExpired();
      token = await auth.getToken();
    }

    if (!token) {
      throw new Error("Failed to get new token");
    }

    return `Bearer ${token}`;
  } catch (err) {
    console.error("Failed to get token from auth");
    throw err;
  }
}
