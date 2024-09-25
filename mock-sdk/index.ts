import { ProverParams } from '../prover';
import { RegexBlueprintProps } from '../regex-blueprint';
import { ProverMock } from './prover';
import { RegexBlueprintMock } from './regex-blueprint';

export function createRegexBlueprint(
  props: RegexBlueprintProps,
): RegexBlueprintMock {
  const blueprint = new RegexBlueprintMock(props);
  // await blueprint.submit();
  return blueprint;
}

export async function createRegexBlueprintRequest(
  props: RegexBlueprintProps,
): Promise<RegexBlueprintMock> {
  const blueprint = new RegexBlueprintMock(props);
  await blueprint.submitRequest();
  return blueprint;
}

export async function getRegexBlueprint(
  id: string,
): Promise<RegexBlueprintMock> {
  return RegexBlueprintMock.getBlueprintById(id);
}

export function createProver(props: ProverParams): ProverMock {
  return new ProverMock(props);
}
