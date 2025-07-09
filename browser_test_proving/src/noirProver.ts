import zkeSdk, { GenerateProofOptions } from "../../src";
import { initNoirWasm } from "@zk-email/sdk/initNoirWasm";

export function setupNoirProver(element: HTMLElement) {
  const sdk = zkeSdk({
    baseUrl: "https://staging-conductor.zk.email",
    logging: { enabled: true, level: "debug" },
  });
  // const sdk = zkeSdk({
  //   baseUrl: "http://127.0.0.1:8080",
  //   logging: { enabled: true, level: "debug" },
  // });
  // const sdk = zkeSdk({ baseUrl: "https://dev-conductor.zk.email" });

  const proveButton = element.querySelector("button");
  if (proveButton) {
    proveButton.addEventListener("click", async () => {
      try {
        console.log("getting blueprint");
        // const blueprint = await sdk.getBlueprintById("4c67a6fe-6202-40ff-8672-9dbe02e5cb52");
        const blueprint = await sdk.getBlueprintById("1fc25bf2-bfce-430f-9d0e-447a02cc7864");

        console.log("blueprint: ", blueprint);

        const prover = blueprint.createProver({ isLocal: true });
        console.log("prover");
        console.log("typeof prover", typeof prover);

        const eml = await getEml();

        // try {
        //   const isValidEml = await blueprint.validateEmail(eml!);
        //   console.log("isValidEml: ", isValidEml);
        // } catch (err) {
        //   console.error("Email is not valid: ", err);
        // }

        // console.log("putting in eml: ", eml);
        const externalInputs = {
          name: "name",
          value: "master",
          maxLength: 32,
        };
        const noirWasm = await initNoirWasm();
        const options: GenerateProofOptions = { noirWasm };
        console.log("got the options: ", options);

        const proof = await prover.generateProof(eml!, [], options);
        console.log("got the noir proof: ", proof);

        // const proof = await prover.generateProof(eml!);

        // const proof = await sdk.getProof("b80bc8ff-fb3e-4dbc-9ccb-b47a58b6faf6");

        // console.log("proof done in browser: ", proof);

        console.log("Now verifying proof on blueprint: ");
        const verified = await blueprint.verifyProof(proof, options);

        console.log("Proof verified an blueprint ", verified);
      } catch (err) {
        console.error("Failed to prove: ", err);
      }
    });
  }
}

async function getEml() {
  try {
    const response = await fetch("/amazon.eml"); // URL is relative to the root of the project
    if (!response.ok) {
      throw new Error("Network response was not ok " + response.statusText);
    }
    const data = await response.text(); // Get the content as text
    return data;
  } catch (error) {
    console.error("There has been a problem with your fetch operation:", error);
  }
}
