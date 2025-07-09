import { Blueprint, BlueprintProps, ListBlueprintsOptions } from "./blueprint";
import { BlueprintGroup } from "./blueprintGroup";
import { Proof } from "./proof";
import { BlueprintGroupProps } from "./types/blueprintGroup";
import { SdkOptions } from "./types/sdk";
import { getStarredBlueprints } from "./user";
import { logger } from "./utils/logger";

// Export Types
export * from "./types/blueprint";
export { Blueprint } from "./blueprint";
export * from "./types/proof";
export { Proof } from "./proof";
export * from "./types/prover";
export * from "./types/gmail";
export type { Auth } from "./types/auth";
export type { ParsedEmail } from "./types/utils";
// Re-Export zod types to avoid version mismatches if package importing this sdk has zod
export type { ValidationErrors } from "./blueprintValidation";

// Exports that don't need initialization or options
export { startJsonFileDownload, getDKIMSelector } from "./utils";
export { logger } from "./utils/logger";
export type { LogLevel, LoggingOptions } from "./types/sdk";
export {
  testDecomposedRegex,
  parseEmail,
  generateProofInputs,
  testBlueprint,
  getMaxEmailBodyLength,
  extractEMLDetails,
} from "./relayerUtils";
export { getLoginWithGithubUrl } from "./auth";
// Re-Export zod class to avoid version mismatches if package importing this sdk has zod
export { ZodError } from "./blueprintValidation";
export { LoginWithGoogle, Gmail } from "./login_for_email/gmail";
export { Outlook, LoginWithMicrosoft } from "./login_for_email/microsoft";

export function initZkEmailSdk(sdkOptions?: SdkOptions) {
  const baseUrl = sdkOptions?.baseUrl || "https://conductor.zk.email";
  
  // Configure logging
  logger.configure(sdkOptions?.logging);
  
  return {
    createBlueprint(props: BlueprintProps) {
      if (!sdkOptions && !sdkOptions!.auth) {
        throw new Error("You need to specify options.auth to use createBlueprint");
      }
      const blueprint = new Blueprint(props, baseUrl, sdkOptions!.auth);
      return blueprint;
    },
    async getBlueprint(slug: string): Promise<Blueprint> {
      return Blueprint.getBlueprintBySlug(slug, baseUrl, sdkOptions?.auth);
    },
    async getBlueprintById(id: string): Promise<Blueprint> {
      return Blueprint.getBlueprintById(id, baseUrl, sdkOptions?.auth);
    },
    async listBlueprints(options?: ListBlueprintsOptions): Promise<Blueprint[]> {
      return Blueprint.listBlueprints(baseUrl, options, sdkOptions?.auth);
    },
    async getProof(id: string): Promise<Proof> {
      return Proof.getProofById(id, baseUrl);
    },
    async getStarredBlueprints(): Promise<string[]> {
      if (!sdkOptions && !sdkOptions!.auth) {
        throw new Error("You need to specify options.auth to use getStarredBlueprints");
      }
      return getStarredBlueprints(baseUrl, sdkOptions!.auth!);
    },
    async unPackProof(packedProof: string): Promise<Proof> {
      return Proof.unPackProof(packedProof, baseUrl);
    },
    createBlueprintGroup(props: BlueprintGroupProps): BlueprintGroup {
      if (!sdkOptions && !sdkOptions!.auth) {
        throw new Error("You need to specify options.auth to use createBlueprintGroup");
      }
      const blueprintGroup = new BlueprintGroup(props, baseUrl, sdkOptions!.auth);
      return blueprintGroup;
    },
    async getBlueprintGroupById(id: string): Promise<BlueprintGroup> {
      return BlueprintGroup.getBlueprintGroupById(id, baseUrl);
    }
  };
}

// Exported sdk, functions that need initialization
// export default (sdkOptions?: SdkOptions) => {
//   return initZkEmailSdk(sdkOptions);
// };
