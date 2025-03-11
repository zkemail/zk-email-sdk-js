import "./style.css";
import { setupProver } from "./prover.ts";
import { setupLoginWithGoogle } from "./loginWithGoogle.ts";
import { setupLoginWithMicrosoft } from "./loginWithMicrosoft.ts";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <h1>ZK Email SDK Browser Test</h1>
    <div id="prover" class="mb-5">
      <div className="flex mt-5">
        <button class="prove">Prove</button>
      </div>
    </div>
    <div id="lwg" className="mb-5">
      <div className="flex mt-5">
        <button class="login">Login With Google</button>
      </div>
    </div>
    <div id="lwm" className="mb-5">
      <div className="flex mt-5">
        <button class="login">Login With Microsoft</button>
      </div>
    </div>
  </div>
`;

setupProver(document.querySelector<HTMLElement>("#prover")!);
setupLoginWithGoogle(document.querySelector<HTMLElement>("#lwg")!);
setupLoginWithMicrosoft(document.querySelector<HTMLElement>("#lwm")!);
