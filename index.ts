import { ProverParams } from './prover';
import { RegexBlueprintProps } from './regex-blueprint';
import { Prover } from './prover';
import { RegexBlueprint } from './regex-blueprint';

export async function createRegexBlueprint(
  props: RegexBlueprintProps,
): Promise<RegexBlueprint> {
  const blueprint = new RegexBlueprint(props);
  return blueprint;
}

export async function getRegexBlueprint(id: string): Promise<RegexBlueprint> {
  return RegexBlueprint.getBlueprintById(id);
}

export function createProver(props: ProverParams): Prover {
  return new Prover(props);
}

export * from './prover';
export * from './regex-blueprint';
