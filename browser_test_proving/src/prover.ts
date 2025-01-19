import zkeSdk from "@zk-email/sdk";
// import zkeSdk from "../../src/index";

export function setupProver(element: HTMLElement) {
  const sdk = zkeSdk({ baseUrl: "http://localhost:8080" });

  const proveButton = element.querySelector("button");
  if (proveButton) {
    proveButton.addEventListener("click", async () => {
      const blueprint = await sdk.getBlueprintById("126380f6-a752-48ae-bae7-03cfc31d2f01");
      const prover = blueprint.createProver({ isLocal: true });

      const eml = await getEml();

      // console.log("putting in eml: ", eml);
      const proof = await prover.generateProof(eml!);
      console.log("proof done in browser: ", proof);
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
