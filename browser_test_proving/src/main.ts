import "./style.css";
import { setupProver } from "./prover.ts";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <h1>ZK Email SDK Browser Test</h1>
    <div id="prover">
      <div className="flex mt-5">
        <button class="prove">Prove</button>
      </div>
    </div>
  </div>
`;

setupProver(document.querySelector<HTMLElement>("#prover")!);
