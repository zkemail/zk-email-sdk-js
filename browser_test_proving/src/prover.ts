import zkeSdk from "@zk-email/sdk";
// import zkeSdk from "../../src/index";

export function setupProver(element: HTMLElement) {
  const sdk = zkeSdk();

  const proveButton = element.querySelector("button");
  if (proveButton) {
    proveButton.addEventListener("click", async () => {
      try {
        console.log("getting blueprint");
        const blueprint = await sdk.getBlueprintById("008b5da5-fbda-4445-b7df-6b0c6dde4bb1");
        console.log("blueprint: ", blueprint);

        const prover = blueprint.createProver({ isLocal: true });

        const eml = await getEml();

        // console.log("putting in eml: ", eml);
        const proof = await prover.generateProof(eml!);

        console.log("proof done in browser: ", proof);

        const verified = await blueprint.verifyProofOnChain(proof);

        console.log("Proof verified: ", verified);
      } catch (err) {
        console.error("Failed to prove: ", err);
      }
    });
  }
}

async function getEml() {
  try {
    const response = await fetch("/residency.eml"); // URL is relative to the root of the project
    if (!response.ok) {
      throw new Error("Network response was not ok " + response.statusText);
    }
    const data = await response.text(); // Get the content as text
    return data;
  } catch (error) {
    console.error("There has been a problem with your fetch operation:", error);
  }
}
