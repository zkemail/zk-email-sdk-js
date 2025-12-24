import { Auth } from "./types/auth";
import { logger } from "./utils/logger";

// Default GitHub OAuth configuration
export const DEFAULT_GITHUB_CLIENT_ID = "Ov23li0KABFCUsxBEQkn";
export const DEFAULT_GITHUB_SCOPE = "user:email";
export const DEFAULT_GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";

/**
 * Configuration options for GitHub OAuth login
 */
export type GitHubLoginConfig = {
  clientId?: string;
  scope?: string;
  authorizeUrl?: string;
};

/**
 * Generates a GitHub OAuth authorization URL
 * @param callbackUrl - The URL to redirect to after authentication
 * @param configOrClientId - Either a GitHubLoginConfig object or a client ID string (for backward compatibility)
 * @returns The GitHub OAuth authorization URL
 */
export function getLoginWithGithubUrl(
  callbackUrl: string,
  configOrClientId?: GitHubLoginConfig | string
): string {
  // Handle backward compatibility: if second param is a string, treat it as clientId
  let config: GitHubLoginConfig | undefined;
  if (typeof configOrClientId === "string") {
    config = { clientId: configOrClientId };
  } else {
    config = configOrClientId;
  }

  const clientId = config?.clientId || DEFAULT_GITHUB_CLIENT_ID;
  const scope = config?.scope || DEFAULT_GITHUB_SCOPE;
  const authorizeUrl = config?.authorizeUrl || DEFAULT_GITHUB_AUTHORIZE_URL;

  const state = encodeURIComponent(callbackUrl);
  return `${authorizeUrl}?client_id=${clientId}&scope=${scope}&state=${state}`;
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
    logger.error("Failed to get token from auth");
    throw err;
  }
}
