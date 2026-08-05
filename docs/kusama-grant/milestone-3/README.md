# Milestone 3

Primary Goal: extend the Circom pipeline, SDK, and registry frontend to support automated PolkaVM verifier contract generation and deployment, and end-to-end on-chain proof verification.

Milestone 3 spans five deliverables across three repositories:

| # | Name | Repository | Evidence |
| --- | --- | --- | --- |
| 1 | Circom Pipeline Integration | sdk-images | [`01_circom_pipeline_integration.md`](https://github.com/zkemail/sdk-images/blob/kusama-grant/circom/docs/kusama-grant/milestone-3/01_circom_pipeline_integration.md) |
| 2 | Proof Formatting and Wrapper Integration Layer | sdk-images | [`02_proof_formatting_and_wrapper_integration.md`](https://github.com/zkemail/sdk-images/blob/kusama-grant/circom/docs/kusama-grant/milestone-3/02_proof_formatting_and_wrapper_integration.md) |
| 3 | Blueprint Deployment System | sdk-images | [`03_blueprint_deployment_system.md`](https://github.com/zkemail/sdk-images/blob/kusama-grant/circom/docs/kusama-grant/milestone-3/03_blueprint_deployment_system.md) |
| 4 | SDK On-Chain Verification | zk-email-sdk-js | [`04_sdk_on_chain_verification.md`](https://github.com/zkemail/zk-email-sdk-js/blob/kusama-grant/docs/kusama-grant/milestone-3/04_sdk_on_chain_verification.md) |
| 5 | Frontend Integration & Documentation | registry | [`05_frontend_integration_and_documentation.md`](https://github.com/zkemail/registry/blob/kusama-grant/docs/kusama-grant/milestone-3/05_frontend_integration_and_documentation.md) |

## In this repository (zk-email-sdk-js)

Deliverable 4 (SDK scope):

| # | Name | Description | Deliverable | What was done / Proof |
| --- | --- | --- | --- | --- |
| 4 | SDK On-Chain Verification | Integrate on-chain proof verification into the SDK using the generic verifier interface defined in Milestone 2. | SDK functionality enabling on-chain proof verification via deployed verifier contracts | `verifyProofOnChain` supports Ethereum Sepolia, Base Sepolia, and Paseo Testnet (Polkadot) against the `IZKEmailVerifier` ABI, viem-encoded. Published to npm and consumed by the registry frontend. **Proof:** [`04_sdk_on_chain_verification.md`](./04_sdk_on_chain_verification.md). |

Local evidence index:

- [`04_sdk_on_chain_verification.md`](./04_sdk_on_chain_verification.md)
- [`05_public_howto.md`](./05_public_howto.md)
