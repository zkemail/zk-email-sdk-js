import { EmailLoginProvider, EmailProvider } from ".";
import { Blueprint } from "../blueprint";
import { FetchEmailOptions, GmailMessagesListResponse, RawEmailResponse } from "../types/gmail";

const clientId = "773062743658-rauj7nb18ikr1lrfs5bl8lt3b31r2nen.apps.googleusercontent.com";
/**
 * A class for handling Google OAuth login flow.
 * Note: This will only work if you first register your callback URL with the zkemail team.
 */
export class LoginWithGoogle implements EmailLoginProvider {
  accessToken: string | null = null;

  private loadGoogleScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof google !== "undefined") {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Google OAuth script"));
      document.head.appendChild(script);
    });
  }

  async authorize(options: any): Promise<string> {
    // Load Google's OAuth2 library dynamically
    await this.loadGoogleScript();

    return new Promise((resolve, reject) => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        // prompt: "consent",
        // access_type: "offline",
        ...(!isPlainObject(options) ? {} : options),
        scope: "https://www.googleapis.com/auth/gmail.readonly",
        callback: (response: { access_token: string }) => {
          console.log("response: ", response);
          if (response.access_token) {
            this.accessToken = response.access_token;
            resolve(response.access_token);
          } else {
            reject(new Error("Login with Google failed. No access token received"));
          }
        },
      });

      client.requestAccessToken();
    });
  }

  // TODO: Don't need to check this every time if we track when the token expires
  async isTokenValid(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`
      );
      const text = await response.text();
      return response.ok;
    } catch {
      return false;
    }
  }

  async getAccessToken() {
    if (this.accessToken) {
      const isValid = await this.isTokenValid(this.accessToken);
      if (isValid) return this.accessToken;
    }

    this.accessToken = await this.authorize();
    return this.accessToken;
  }

  async revokeToken(accessToken: string) {
    fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
      method: "POST",
      headers: {
        "Content-type": "application/x-www-form-urlencoded",
      },
    }).then((response) => {
      if (response.ok) {
        console.log("Token revoked successfully");
      } else {
        console.error("Failed to revoke token");
      }
    });
  }
}

export class Gmail implements EmailProvider {
  loginWithGoogle: LoginWithGoogle;
  nextPageToken: string | null = null;
  query: string = "";

  constructor(loginWithGoogle?: LoginWithGoogle) {
    if (loginWithGoogle) {
      this.loginWithGoogle = loginWithGoogle;
    } else {
      this.loginWithGoogle = new LoginWithGoogle();
    }
  }

  async authorize(options: any) {
    await this.loginWithGoogle.authorize(options);
  }

  async fetchEmails(
    blueprints: Blueprint[],
    options?: FetchEmailOptions
  ): Promise<RawEmailResponse[]> {
    this.nextPageToken = null;
    const accessToken = await this.loginWithGoogle.getAccessToken();
    this.query = this.buildQuery(blueprints, options);
    console.log("Fetching emails with query: ", this.query);
    const emailList = await this.fetchEmailInfoList(accessToken);
    this.nextPageToken = emailList.nextPageToken || null;
    if (!emailList.messages?.length) return [];
    const emails = await this.fetchEmailsRaw(
      accessToken,
      emailList.messages.map((msg) => msg.id)
    );
    return emails;
  }

  private buildQuery(blueprints: Blueprint[], options?: FetchEmailOptions): string {
    if (options?.replaceQuery !== undefined) {
      return options.replaceQuery;
    }

    let query = "";
    for (const blueprint of blueprints) {
      if (blueprint.props.emailQuery) {
        query += ` OR (${blueprint.props.emailQuery})`;
      }
    }

    if (options?.OR) {
      query += ` OR (${options.OR})`;
    }

    if (options?.AND) {
      query = `(${query}) AND (${options.AND})`;
    }

    return query;
  }

  async fetchMore(): Promise<RawEmailResponse[]> {
    if (!this.nextPageToken) return [];
    const accessToken = await this.loginWithGoogle.getAccessToken();
    const emailList = await this.fetchEmailInfoList(accessToken);
    this.nextPageToken = emailList.nextPageToken || null;
    const emails = await this.fetchEmailsRaw(
      accessToken,
      emailList.messages.map((msg) => msg.id)
    );
    return emails;
  }

  /**
   * Fetches only the message infos (without content) for the given emails.
   * Full email content can be retrieved later using fetchEmailRaw method.
   */
  async fetchEmailInfoList(accessToken: string): Promise<GmailMessagesListResponse> {
    const defaultParams = {
      maxResults: 5,
      pageToken: this.nextPageToken || 0,
    };

    const queryParams = { ...defaultParams, ...(this.query ? { q: this.query } : {}) };
    const queryString = new URLSearchParams(queryParams).toString();

    const url = `https://www.googleapis.com/gmail/v1/users/me/messages?${queryString}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      const data: GmailMessagesListResponse = await response.json();

      return data;
    } else {
      console.error("Failed to fetch emails:", response);
      throw new Error("Failed to fetch emails");
    }
  }

  async fetchEmailsRaw(accessToken: string, messageIds: string[]): Promise<RawEmailResponse[]> {
    try {
      const fetchPromises = messageIds.map((messageId) => {
        const url = `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=raw`;

        return fetch(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Failed to fetch email with ID: ${messageId}`);
            }

            return response.json();
          })
          .then((data) => {
            let rawBase64 = data.raw.replace(/-/g, "+").replace(/_/g, "/");

            while (rawBase64.length % 4) {
              rawBase64 += "=";
            }

            const decodedContents = atob(rawBase64);

            const subject = decodedContents.match(/Subject: (.*)/)?.[1] || "No Subject";

            return {
              emailMessageId: messageId,
              subject,
              internalDate: data.internalDate,
              decodedContents,
            };
          }) as Promise<RawEmailResponse>;
      });

      const results = await Promise.all(fetchPromises);

      return results;
    } catch (error) {
      console.error("Error fetching emails:", error);

      throw new Error("Error fetching emails");
    }
  }
}

function isPlainObject(obj: any) {
  return typeof obj === "object" && obj !== null && !Array.isArray(obj);
}
