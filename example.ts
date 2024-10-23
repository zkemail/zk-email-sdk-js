import { DecomposedRegex, testDecomposedRegex } from "./src";
import helloTestEmail from "./unit_tests/hello_eml";

async function testEmailBody() {
  // Wait for wasm to initialize
  await new Promise((r) => setTimeout(r, 300));

  const decomposedRegex: DecomposedRegex = {
    name: "Hello Pattern",
    maxLength: 4000,
    location: "body",
    parts: [
      {
        isPublic: false,
        regexDef: "Hello ",
      },
      {
        isPublic: true,
        regexDef: "[^,]+",
      },
      {
        isPublic: false,
        regexDef: "!",
      },
    ],
  };
  const result = await testDecomposedRegex(helloTestEmail, decomposedRegex, false);
  console.log("result private field not revealed: ", result);
  const result2 = await testDecomposedRegex(helloTestEmail, decomposedRegex, true);
  console.log("result private fields revealed: ", result2);
}

testEmailBody();

async function testEmailHeader() {
  // Wait for wasm to initialize
  await new Promise((r) => setTimeout(r, 300));

  const decomposedRegex: DecomposedRegex = {
    name: "Find sender Pattern",
    maxLength: 300,
    location: "header",
    parts: [
      {
        isPublic: true,
        regexDef: "dimi.zktest@gmail.com",
      },
    ],
  };

  const result = await testDecomposedRegex(helloTestEmail, decomposedRegex, false);
  console.log("header result", result);
}

testEmailHeader();
