import { defineConfig } from "vite";
import { resolve } from "path";
import typescript from "@rollup/plugin-typescript";

// This helps ensure .d.ts files get emitted.
// We point to our existing tsconfig.json for strict and rootDir settings.

export default defineConfig({
  build: {
    // Tell Vite we are building a library, not a traditional web app.
    lib: {
      entry: resolve(__dirname, "src", "index.ts"),
      // The global name for UMD — i.e. `window.ZkEmailSdk`
      name: "ZkEmailSdk",
      // Build ESM, CJS, UMD. (Add 'iife' if you want an immediately-invoked function version.)
      formats: ["es", "cjs"],
      // The output file name base
      fileName: (format) => {
        // e.g. "zk-email-sdk.es.js", "zk-email-sdk.cjs.js", "zk-email-sdk.umd.js"
        return `zk-email-sdk.${format}.js`;
      },
    },
    // If you don't want certain deps bundled, put them in external: [...]
    rollupOptions: {
      plugins: [
        // So we get declaration files
        typescript({
          tsconfig: "./tsconfig.json",
          compilerOptions: {
            // Make sure declaration files are generated
            declaration: true,
            declarationDir: "dist/types",
            // Important: do not emit .js here, because Vite does that.
            emitDeclarationOnly: true,
          },
        }),
      ],
    },
    outDir: "dist",
    sourcemap: true,
  },
});
