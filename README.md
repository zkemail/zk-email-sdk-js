# zk-email-sdk-js

With the ZK Email SDK you can easily compile zk regex circuits and directly create proofs with them.

This first version of this SDK does not support compiling the circuits and running the proofs without our infra,
but it is our priority to make this work with your own ifra easily, too.

This project uses bun. So to install packages use `bun i`.

## Run integration tests

Before you can run the tests, you must have the conductor running.

Then you can run `bun test`.

### Directly start downloads

To run the `start download` test, you first have to compile the TypeScript files to js with `bun run build`.

If you have python installed run `python -m http.server 8000`. Then you can go to
`http://localhost:8000/integration_tests/start_downlaod_in_browser.html` and click the download button.
