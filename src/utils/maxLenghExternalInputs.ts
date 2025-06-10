import { ExternalInput, ExternalInputInput } from "../types";

export function addMaxLengthToExternalInputs(
  externalInputs: ExternalInputInput[],
  externalInputDefinitions?: ExternalInput[]
) {
  const externalInputsWithMaxLength: (ExternalInputInput & { maxLength: number })[] = [];
  if (externalInputDefinitions) {
    for (const externalInputDefinition of externalInputDefinitions) {
      const externalInput = externalInputs.find((ei) => ei.name === externalInputDefinition.name);
      if (!externalInput) {
        throw new Error(`You must provide the external input for ${externalInputDefinition.name}`);
      }
      externalInputsWithMaxLength.push({
        ...externalInput,
        maxLength: externalInputDefinition.maxLength,
      });
    }
  }
  return externalInputsWithMaxLength;
}
