import { Blueprint, BlueprintProps, ListBlueprintsOptions } from "./blueprint";

export function createBlueprint(props: BlueprintProps): Blueprint {
  const blueprint = new Blueprint(props);
  return blueprint;
}

export async function getBlueprint(id: string): Promise<Blueprint> {
  return Blueprint.getBlueprintById(id);
}

export async function listBlueprints(options?: ListBlueprintsOptions): Promise<Blueprint[]> {
  return Blueprint.listBlueprints(options);
}

// TODO: implement
export function parseEmail(eml: string): string {
  return eml;
}

// TODO: Get prover from blueprintId

export * from "./blueprint";
export * from "./proof";
