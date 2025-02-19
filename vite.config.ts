import { defineConfig } from "vite";
import { resolve } from "path";
import typescript from "@rollup/plugin-typescript";
import path from "path";
import inject from "@rollup/plugin-inject";

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
        // This tells Rollup: whenever you see “Worker”, import the default export
        // from our polyfillWorker.js module.
        inject({
          Worker: [resolve(__dirname, "polyfillWorker.js"), "default"],
        }),
      ],
    },
    outDir: "dist",
    sourcemap: true,
  },
  resolve: {
    alias: {
      "node:buffer": "buffer",
      "node:stream": "stream-browserify",
      buffer: "buffer",
      process: path.resolve("node_modules/rollup-plugin-node-polyfills/polyfills/process-es6"),
      util: path.resolve("node_modules/rollup-plugin-node-polyfills/polyfills/util"),
      sys: "util",
      events: path.resolve("node_modules/rollup-plugin-node-polyfills/polyfills/events"),
      stream: "stream-browserify",
      path: path.resolve("node_modules/rollup-plugin-node-polyfills/polyfills/path"),
      querystring: path.resolve("node_modules/rollup-plugin-node-polyfills/polyfills/qs"),
      url: path.resolve("node_modules/rollup-plugin-node-polyfills/polyfills/url"),
      crypto: "crypto-browserify",
      http: path.resolve("node_modules/rollup-plugin-node-polyfills/polyfills/http"),
      https: path.resolve("node_modules/rollup-plugin-node-polyfills/polyfills/http"),
      os: path.resolve("node_modules/rollup-plugin-node-polyfills/polyfills/os"),
      assert: path.resolve("node_modules/rollup-plugin-node-polyfills/polyfills/assert"),
      constants: path.resolve("node_modules/rollup-plugin-node-polyfills/polyfills/constants"),
      _stream_duplex: path.resolve(
        "node_modules/rollup-plugin-node-polyfills/polyfills/readable-stream/duplex"
      ),
      _stream_passthrough: path.resolve(
        "node_modules/rollup-plugin-node-polyfills/polyfills/readable-stream/passthrough"
      ),
      _stream_readable: path.resolve(
        "node_modules/rollup-plugin-node-polyfills/polyfills/readable-stream/readable"
      ),
      _stream_writable: path.resolve(
        "node_modules/rollup-plugin-node-polyfills/polyfills/readable-stream/writable"
      ),
      _stream_transform: path.resolve(
        "node_modules/rollup-plugin-node-polyfills/polyfills/readable-stream/transform"
      ),
      timers: path.resolve("node_modules/rollup-plugin-node-polyfills/polyfills/timers"),
      console: path.resolve("node_modules/rollup-plugin-node-polyfills/polyfills/console"),
      vm: path.resolve("node_modules/rollup-plugin-node-polyfills/polyfills/vm"),
      zlib: path.resolve("node_modules/rollup-plugin-node-polyfills/polyfills/zlib"),
      tty: path.resolve("node_modules/rollup-plugin-node-polyfills/polyfills/tty"),
      domain: path.resolve("node_modules/rollup-plugin-node-polyfills/polyfills/domain"),
    },
  },
  define: {
    global: {},
  },
});
