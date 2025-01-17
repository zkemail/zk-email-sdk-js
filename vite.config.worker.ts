// vite.config.worker.ts
import path from "path";
import { defineConfig } from "vite";
import commonjs from "vite-plugin-commonjs";
import rollupNodePolyfills from "rollup-plugin-node-polyfills";
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
// ... plus your big alias map, etc.

export default defineConfig({
  // The important part: we treat this as a specialized build for a single entry.
  build: {
    outDir: "dist/localProverWorker/", // So it doesn't collide with your main build
    emptyOutDir: true,
    rollupOptions: {
      plugins: [rollupNodePolyfills()],
      input: {
        // Name the worker entry:
        localProverWorker: "src/localProverWorker.js",
      },
      output: {
        // We want an ES module single chunk:
        // This (plus inlineDynamicImports) helps ensure it doesn't split
        // into multiple chunks.
        format: "es",
        entryFileNames: "localProverWorker-bundled.js",
        inlineDynamicImports: true,
      },
    },
  },
  plugins: [
    commonjs(), // Handles CommonJS modules
  ],
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
  optimizeDeps: {
    esbuildOptions: {
      plugins: [
        NodeGlobalsPolyfillPlugin({
          process: true,
          buffer: true,
        }),
      ],
    },
  },
});
