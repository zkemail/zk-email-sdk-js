// import zkeSdk from "@zk-email/sdk";
// import zkeSdk from "../../../src/index";
'use client'
import { setupNoirProver } from "./noirProver";
import { setupProver } from "./prover";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1>ZK Email SDK Browser Test</h1>
    <div id="prover" className="mb-5">
      <div className="flex mt-5">
        <button onClick={() => setupProver()} className="prove">Prove</button>
      </div>
    </div>
    <div id="noir-prover" className="mb-5">
      <div className="flex mt-5">
        <button onClick={() => setupNoirProver()} className="prove">Prove with Noir</button>
      </div>
    </div>
  </div>
  );
}
