import initNoirC from "@noir-lang/noirc_abi";
import initACVM from "@noir-lang/acvm_js";
import acvm from "@noir-lang/acvm_js/web/acvm_js_bg.wasm?url";
import noirc from "@noir-lang/noirc_abi/web/noirc_abi_wasm_bg.wasm?url";

let wasmInitPromise: Promise<void> | null = null;

export function initNoirWasm(): Promise<void> {
  if (wasmInitPromise === null) {
    wasmInitPromise = Promise.all([initACVM(fetch(acvm)), initNoirC(fetch(noirc))])
      .then(() => {
        console.log("Noir wasm init done");
      })
      .catch((err) => {
        // Reset the promise so initialization can be attempted again on next call
        wasmInitPromise = null;
        console.log("Failed to initialize wasm for relayer-utils: ", err);
        throw err; // Re-throw to allow caller to handle the error
      });
  }
  return wasmInitPromise;
}
