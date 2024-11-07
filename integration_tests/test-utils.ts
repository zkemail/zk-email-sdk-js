import open from "open";
import { getLoginWithGithubUrl } from "../src";

export async function getAuthToken(): Promise<string> {
  let tokenResolver: ((token: string) => void) | null = null;
  // Create promise for receiving token
  let tokenPromise: Promise<string> = new Promise((resolve) => {
    tokenResolver = resolve;
  });

  // Setup express server

  const server = Bun.serve({
    port: 0,
    fetch(req) {
      console.log("received callback request");
      const url = new URL(req.url);
      if (url.pathname === "/callback") {
        const token = url.searchParams.get("token");
        if (!token) {
          throw new Error("No token received");
        }
        tokenResolver!(token);
        return new Response("Auth successfull, you can close this window");
      }
      return new Response("404!");
    },
  });

  // Listen on random available port
  const port = server.port;
  const callbackUrl = `http://localhost:${port}/callback`;

  // Construct GitHub OAuth URL
  const authUrl = getLoginWithGithubUrl(callbackUrl);
  console.log("authUrl: ", authUrl);

  // Open default browser
  open(authUrl);

  // Wait for token
  const token = await tokenPromise;

  // Cleanup
  await server.stop();

  return token;
}
