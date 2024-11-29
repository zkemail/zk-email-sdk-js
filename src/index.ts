import { Blueprint, BlueprintProps, ListBlueprintsOptions } from "./blueprint";
import { Proof } from "./proof";
import { SdkOptions } from "./types/sdk";

// Export Types
export * from "./types/blueprint";
export { Blueprint } from "./blueprint";
export * from "./types/proof";
export { Proof } from "./proof";
export * from "./types/prover";
export type { Auth } from "./types/auth";
export type { ParsedEmail } from "./types/utils";

// Exports that don't need initialization or options
export {
  testDecomposedRegex,
  parseEmail,
  startJsonFileDownload,
  generateProofInputs,
  testBlueprint,
} from "./utils";
export { getLoginWithGithubUrl } from "./auth";

// Exported sdk, functions that need initialization
export default (sdkOptions?: SdkOptions) => {
  const baseUrl = sdkOptions?.baseUrl || "https://conductor.zk.email";
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
  };
};
