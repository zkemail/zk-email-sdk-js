import { Auth } from "./types";
import { get } from "./utils";

/**
 * @returns An array of slugs that the user starred
 */
export async function getStarredBlueprints(baseUrl: string, auth: Auth): Promise<string[]> {
  const { slugs } = await get<{ slugs: string[] }>(`${baseUrl}/blueprint/starred`, null, auth);
  return slugs;
}
