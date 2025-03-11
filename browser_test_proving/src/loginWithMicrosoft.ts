import zkeSdk, { FetchEmailOptions, Outlook } from "../../src/index";
// import zkeSdk, { FetchEmailOptoins, Gmail } from "../../src/index";

export function setupLoginWithMicrosoft(element: HTMLElement) {
  const sdk = zkeSdk();
  const outlook = new Outlook();

  const loginButton = element.querySelector("button");
  if (loginButton) {
    loginButton.addEventListener("click", async () => {
      const blueprint = await sdk.getBlueprintById("0935faed-002d-4b94-8cbf-476b3b05d9a6");
      // const blueprint = await sdk.getBlueprintById("008b5da5-fbda-4445-b7df-6b0c6dde4bb1");
      // const blueprint2 = await sdk.getBlueprintById("0935faed-002d-4b94-8cbf-476b3b05d9a6");

      blueprint.props.emailQuery = "from:account-security-noreply@accountprotection.microsoft.com";

      // optional - manually start Login with Google flow and authorize before fetching emails
      console.log("Manually authorizing");
      await outlook.authorize();
      console.log("after authorize: ", outlook);

      const emails = await outlook.fetchEmails([blueprint]);
      console.log("emails: ", emails);

      let moreEmails = await outlook.fetchMore();
      console.log("moreEmails: ", moreEmails);
    });
  }
}
