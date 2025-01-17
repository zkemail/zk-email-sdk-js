import fs from "fs";

const code = fs.readFileSync("dist/localProverWorker/localProverWorker-bundled.js", "utf8");

// 1) Escape backslashes first (otherwise we'll double-escape)
let escaped = code.replace(/\\/g, "\\\\");
// 2) Escape backticks (for template literal)
escaped = escaped.replace(/`/g, "\\`");
// 3) Escape the sequence "${" so it won't interpolate inside a template literal
escaped = escaped.replace(/\$\{/g, "\\${");

const output = `export const localProverWorkerCode = \`${escaped}\`;`;

fs.writeFileSync("src/localProverWorkerString.ts", output, "utf8");
console.log("Created src/localProverWorkerString.js");
