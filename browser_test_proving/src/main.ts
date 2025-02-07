import "./style.css";
import { setupProver } from "./prover.ts";
import { setupLoginWithGoogle } from "./loginWithGoogle.ts";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <h1>ZK Email SDK Browser Test</h1>
    <div id="prover">
      <div className="flex mt-5">
        <button class="prove">Prove</button>
      </div>
    </div>
    <div id="lwg">
      <div className="flex mt-5">
        <button class="login">Login With Google</button>
      </div>
    </div>
  </div>
`;

setupProver(document.querySelector<HTMLElement>("#prover")!);
setupLoginWithGoogle(document.querySelector<HTMLElement>("#lwg")!);
