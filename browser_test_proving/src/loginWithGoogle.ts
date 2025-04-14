// import zkeSdk, { Gmail, FetchEmailOptoins } from "@zk-email/sdk";
import zkeSdk, { FetchEmailOptions, Gmail } from "../../src/index";

export function setupLoginWithGoogle(element: HTMLElement) {
  const sdk = zkeSdk();
  const gmail = new Gmail();

  const loginButton = element.querySelector("button");
  if (loginButton) {
    loginButton.addEventListener("click", async () => {
      const blueprint = await sdk.getBlueprintById("0935faed-002d-4b94-8cbf-476b3b05d9a6");
      // const blueprint = await sdk.getBlueprintById("008b5da5-fbda-4445-b7df-6b0c6dde4bb1");
      // const blueprint2 = await sdk.getBlueprintById("0935faed-002d-4b94-8cbf-476b3b05d9a6");

      // optional - manually start Login with Google flow and authorize before fetching emails
      console.log("Manually authorizing");
      await gmail.authorize({
        prompt: "consent",
        access_type: "online",
      });

      // Will start Login with Google flow if not already autorized
      // Fetches emails using the email queries given in the blueprints
      console.log("fetching emails");

      const queryOptions: FetchEmailOptions = {
        replaceQuery: "from:uber.com",
      };

      let emails = await gmail.fetchEmails([blueprint], queryOptions);
      console.log("emails: ", emails);

      // Will return an empty array if there are no more emails matching the blueprints query
      let moreEmails = await gmail.fetchMore();
      console.log("moreEmails: ", moreEmails);

      // You can validate if an email is valid according to a blueprint
      const email = emails[0];
      const isValid = await blueprint.validateEmail(email.decodedContents);
      console.log("isValid: ", isValid);

      // console.log("emails: ", emails);
      // console.log("fetching more");
      // emails = await gmail.fetchMore();
      // console.log("emails: ", emails);
      try {
      } catch (err) {
        console.error("Failed to login with google: ", err);
      }
    });
  }
}
