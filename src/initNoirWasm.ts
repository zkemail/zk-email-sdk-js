import { type Noir } from "@noir-lang/noir_js";
import { type UltraHonkBackend } from "@aztec/bb.js";

let proverPromise: Promise<{
  Noir: typeof Noir;
  UltraHonkBackend: typeof UltraHonkBackend;
}> | null = null;

export async function initNoirWasm() {
  if (!proverPromise) {
    proverPromise = (async () => {
      const [{ Noir }, { UltraHonkBackend }] = await Promise.all([
        import("@noir-lang/noir_js"),
        import("@aztec/bb.js"),
      ]);
      return {
        Noir,
        UltraHonkBackend,
      };
    })();
  }
  return proverPromise;
}
