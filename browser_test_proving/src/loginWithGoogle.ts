// import zkeSdk, { Gmail, FetchEmailOptoins } from "@zk-email/sdk";
import { initZkEmailSdk, Gmail } from "../../src/index";

export function setupLoginWithGoogle(element: HTMLElement) {
  const sdk = initZkEmailSdk();
  const gmail = new Gmail();

  const loginButton = element.querySelector("button");
  if (loginButton) {
    loginButton.addEventListener("click", async () => {
      const blueprint = await sdk.getBlueprintById("f9de1c4a-b90c-47af-941f-d21a0ecf1411");
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

      // fetch emails
      const emailResponses = await gmail.fetchEmails([blueprint], {
        replaceQuery: "from:uber.com",
      });
      // const emailResponses = await gmail.fetchEmails([blueprint]);
      console.log("Email responses: ", emailResponses);

      // fetch more emails until it gets an empty array as response
      let moreEmails = await gmail.fetchMore();
      while (moreEmails.length > 0) {
        emailResponses.push(...moreEmails);
        moreEmails = await gmail.fetchMore();
      }

      console.log("Email responses: ", emailResponses);

      const filteredEmailsBySender = emailResponses.filter((email) => email.decodedContents.includes(blueprint.props.senderDomain!));
      console.log("Filtered emails by sender: ", filteredEmailsBySender);
      
      // validate emails
      const validatedEmails = await Promise.all(
        filteredEmailsBySender.map(async (rawEmail) => {
          try {
            await blueprint.validateEmail(rawEmail.decodedContents);
            return rawEmail;
          } catch (err: unknown) {
            console.log("Error validating email: ", err);
            return undefined;
          }
        })
      );

      // const validatedEmails = await blueprint.validateEmailsBatched(emailResponses.map((email) => email.decodedContents));

      const filteredEmails = validatedEmails.filter((email) => email !== undefined);

      console.log("Filtered emails: ", filteredEmails);

      try {
      } catch (err) {
        console.error("Failed to login with google: ", err);
      }
    });
  }
}
