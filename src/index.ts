import { Blueprint, BlueprintProps, ListBlueprintsOptions } from "./blueprint";
import { Auth } from "./types/auth";
import { SdkOptions } from "./types/sdk";

// Export Types
export * from "./types/blueprint";
export { Blueprint } from "./blueprint";
export * from "./types/proof";
export { Proof } from "./proof";

// Exports that don't need initialization or options
export { testDecomposedRegex, parseEmail } from "./utils";
export { getLoginWithGithubUrl } from "./auth";

// Exported sdk, functions that need initialization
export default (options?: SdkOptions) => {
  return {
    createBlueprint(props: BlueprintProps) {
      if (!options && !options!.auth) {
        throw new Error("You need to specify options.auth to use createBlueprint");
      }
      const blueprint = new Blueprint(props, options!.auth);
      return blueprint;
    },
    async getBlueprint(id: string): Promise<Blueprint> {
      return Blueprint.getBlueprintById(id);
    },
    async listBlueprints(options?: ListBlueprintsOptions): Promise<Blueprint[]> {
      return Blueprint.listBlueprints(options);
    },
  };
};
