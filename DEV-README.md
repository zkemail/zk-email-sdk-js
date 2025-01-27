# zk-email-sdk-js

With the ZK Email SDK you can easily compile zk regex circuits and directly create proofs with them.

For demos on how to use this repo, refer to our demo [https://github.com/zkemail/sdk-ts-demo](demo).

## Test a decomposed regex locally

Install Bun:

`curl -fsSL https://bun.sh/install | bash`

Install dependencies:

`bun i`

## Note

This first version of this SDK does not support compiling the circuits and running the proofs without our infra,
but it is our priority to make this work with your own ifra easily, too.

## Setup

This project uses bun. So to install packages use `bun i`.

## Run integration tests

Before you can run the tests, you must have the conductor running.

NOTE: Not all tests are currently working, due to changes to the interfaces and the backend.

Then you can run `bun test`.

### Directly start downloads

To run the `start download` test, you first have to compile the TypeScript files to js with `bun run build`.

If you have python installed run `python -m http.server 8000`. Then you can go to
`http://localhost:8000/integration_tests/start_downlaod_in_browser.html` and click the download button.

## Updating localProverWorker.js

For local proving, we use a javascript WebWorker. In order to make this compatible with any bundler, we first build the worker file using vite.
This will inline all dependencies and remove import statements. The next step is to generate a string from this file. Now we can
use the worker in a native js way by passing a string to the worker.

To generate the `localProverWorkerString.ts` file which is passed into the worker, run:

`bun run build-prove-worker`.

## Publish to npm

### Publish nightly for testing

Bump the version in `package.json`, use a trailing version number, starting with `-1`, e.g. `0.0.86-6`.

Run `bun run publish-nightly`.

### Publish new production version

Bump the version in `package.json`, using this format: `0.0.86`.

Run `bun run publish`.
