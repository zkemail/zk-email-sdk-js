# ZKEmail SDK

With the ZKEmail SDK you can create proofs about emails using blueprints. You can create blueprints with this
SDK (documentation pending), or using our [registry](https://registry.zk.email).

## Install

The SDK works for all JavaScript environments. You can find
examples for server-side (Node, Deno, Bun) and client-side (Vite, Next.js) usage [here](https://github.com/zkemail/sdk-ts-demo).

To install run:

```bash
npm i @zk-email/sdk
```

## Create a blueprint

Go to our [registry](https://registry.zk.email) and create a blueprint there. You can also create one with the SDK,
we will provide the documentation for this shortly.

## Generate a proof

Initialize the SDK:

```ts
import zkeSdk from "@zk-email/sdk";
const sdk = zkSdk();
```

Next, obtain the slug of the blueprint you want to create a proof for from our [registry](https://registry.zk.email).

![Copy Slug](https://raw.githubusercontent.com/zkemail/zk-email-sdk-js/main/assets/copy_slug.png)

Use the slug to get the blueprint:

```ts
const blueprint = await sdk.getBlueprint("Bisht13/SuccinctZKResidencyInvite@v2");
```

Create a prover. Here you can define whether the proof should be generated remotely (faster)
or in the browser (slower but private).
Set `isLocal` to `true` for proving in the browser.

```ts
const prover = blueprint.createProver({ isLocal: true });
```

Now pass the email as a `string` to the prover to generate a proof.

If your blueprint requires external inputs, pass them as a second argument.

You can check out our [Next.js example](https://github.com/zkemail/sdk-ts-demo/tree/main/nextjs) to see how
a user can locally upload an email file.

```ts
// 2. argument, externalInputs is only required if defined in the blueprint
const proof = await prover.generateProof(emailStr, [
  { name: "email", value: "a@b.de", maxLength: 50 },
]);

console.log("Proof data: ", proof.props.proofData);
console.log("Public data: ", proof.props.publicData);
```

You can also verify the proof on chain. We currently use a contract deployed to Base Sepolia for this.

```ts
const isVerified = await blueprint.verifyProofOnChain(proof);
```
