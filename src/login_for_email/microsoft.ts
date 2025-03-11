import * as msal from "@azure/msal-browser";
import { Blueprint } from "../blueprint";
import { FetchEmailOptions } from "../types/gmail";
import { EmailLoginProvider, EmailProvider } from ".";

// MSAL configuration
const msalConfig = {
  auth: {
    clientId: "6bedcd66-9008-4ea1-88fc-979f21c28bb5",
    authority: "https://login.microsoftonline.com/common",
    redirectUri: "http://localhost:3000",
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

const msalInstance = new msal.PublicClientApplication(msalConfig);

export class LoginWithMicrosoft implements EmailLoginProvider {
  accessToken: string | null = null;
  initialized: boolean = false;

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await msalInstance.initialize();
      this.initialized = true;
    }
  }

  async authorize(): Promise<string> {
    await this.ensureInitialized();

    const loginRequest = {
      scopes: ["User.Read", "Mail.Read"],
    };

    try {
      console.log("launching loginPopup");
      const response = await msalInstance.loginPopup(loginRequest);
      console.log("response: ", response);

      const account = response.account;
      console.log("account: ", account);

      if (account) {
        const tokenResponse = await msalInstance.acquireTokenSilent({
          ...loginRequest,
          account,
        });

        console.log("tokenResponse: ", tokenResponse);

        this.accessToken = tokenResponse.accessToken;
        return this.accessToken;
      } else {
        throw new Error("Microsoft login failed");
      }
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }

  async getAccessToken(): Promise<string> {
    if (!this.accessToken) {
      this.accessToken = await this.authorize();
    }
    return this.accessToken;
  }

  // Check if the token is valid
  async isTokenValid(accessToken: string): Promise<boolean> {
    try {
      // Make a simple API call to check token validity
      const response = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Interface for Microsoft Email responses
export interface OutlookEmailResponse {
  id: string;
  subject: string;
  receivedDateTime: string;
  internetMessageId: string;
  body: {
    content: string;
    contentType: string;
  };
}

export interface OutlookEmailsListResponse {
  value: OutlookEmailResponse[];
  "@odata.nextLink"?: string;
}

export interface RawOutlookEmailResponse {
  emailMessageId: string;
  subject: string;
  internalDate: string;
  decodedContents: string;
}

export class Outlook implements EmailProvider {
  loginWithMicrosoft: LoginWithMicrosoft;
  nextPageLink: string | null = null;
  query: string = "";

  constructor() {
    this.loginWithMicrosoft = new LoginWithMicrosoft();
  }

  async authorize() {
    await this.loginWithMicrosoft.authorize();
  }

  async fetchEmails(
    blueprints: Blueprint[],
    options?: FetchEmailOptions
  ): Promise<RawOutlookEmailResponse[]> {
    this.nextPageLink = null;
    const accessToken = await this.loginWithMicrosoft.getAccessToken();
    this.query = this.buildQuery(blueprints, options);
    console.log("Fetching emails with query: ", this.query);

    const emailList = await this.fetchEmailInfoList(accessToken);
    this.nextPageLink = emailList["@odata.nextLink"] || null;

    if (!emailList.value?.length) return [];

    const emails = await this.fetchEmailsRaw(accessToken, emailList.value);

    return emails;
  }

  private buildQuery(blueprints: Blueprint[], options?: FetchEmailOptions): string {
    if (options?.replaceQuery !== undefined) {
      return options.replaceQuery;
    }

    // Microsoft Graph API uses OData filtering syntax, which is different from Gmail
    let filters = [];

    for (const blueprint of blueprints) {
      if (blueprint.props.emailQuery) {
        // Convert Gmail query to Microsoft Graph query format
        // This is a simplified conversion - you may need to adjust based on your query needs
        const graphQuery = this.convertToGraphQuery(blueprint.props.emailQuery);
        if (graphQuery) filters.push(graphQuery);
      }
    }

    // Handle options
    if (options?.OR) {
      filters.push(this.convertToGraphQuery(options.OR));
    }

    // Combine filters
    let finalFilter = filters.join(" or ");

    if (options?.AND) {
      const andFilter = this.convertToGraphQuery(options.AND);
      if (finalFilter && andFilter) {
        finalFilter = `(${finalFilter}) and (${andFilter})`;
      } else if (andFilter) {
        finalFilter = andFilter;
      }
    }

    return finalFilter;
  }

  private convertToGraphQuery(gmailQuery: string): string {
    // Handle from: queries
    if (gmailQuery.startsWith("from:")) {
      const emailAddress = gmailQuery.substring(5).trim();
      return `from/emailAddress/address eq '${emailAddress}'`;
    }

    // Handle subject: queries
    if (gmailQuery.startsWith("subject:")) {
      const subject = gmailQuery.substring(8).trim();
      return `contains(subject,'${subject}')`;
    }

    // Default case - search in subject or body
    return `contains(subject,'${gmailQuery}') or contains(bodyPreview,'${gmailQuery}')`;
  }

  async fetchMore(): Promise<RawOutlookEmailResponse[]> {
    if (!this.nextPageLink) return [];

    const accessToken = await this.loginWithMicrosoft.getAccessToken();
    const emailList = await this.fetchMoreEmailInfoList(accessToken);
    this.nextPageLink = emailList["@odata.nextLink"] || null;

    const emails = await this.fetchEmailsRaw(accessToken, emailList.value);

    return emails;
  }

  async fetchEmailInfoList(accessToken: string): Promise<OutlookEmailsListResponse> {
    // Construct the base URL for Microsoft Graph API
    let url = "https://graph.microsoft.com/v1.0/me/messages";

    // Add query parameters
    const params = new URLSearchParams();

    // Add top parameter (similar to maxResults in Gmail)
    params.append("$top", "2");

    // Add select parameter to get only needed fields
    params.append("$select", "id,subject,receivedDateTime,internetMessageId,body,bodyPreview");

    // Add filter if query exists
    if (this.query) {
      params.append("$filter", this.query);
    }

    // Construct the final URL
    url = `${url}?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data: OutlookEmailsListResponse = await response.json();
      return data;
    } else {
      console.error("Failed to fetch emails:", response);
      throw new Error("Failed to fetch emails");
    }
  }

  async fetchMoreEmailInfoList(accessToken: string): Promise<OutlookEmailsListResponse> {
    if (!this.nextPageLink) {
      throw new Error("No next page link available");
    }

    const response = await fetch(this.nextPageLink, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data: OutlookEmailsListResponse = await response.json();
      return data;
    } else {
      console.error("Failed to fetch more emails:", response);
      throw new Error("Failed to fetch more emails");
    }
  }

  async fetchEmailsRaw(
    accessToken: string,
    emails: OutlookEmailResponse[]
  ): Promise<RawOutlookEmailResponse[]> {
    try {
      // Microsoft Graph already gives us the content in the initial response
      // So we don't need separate fetch calls for each email
      return emails.map((email) => {
        // For HTML emails, we need to convert them to raw format
        // This is a simplified conversion - you might need more processing
        let rawContent = email.body.content;

        if (email.body.contentType === "html") {
          // If it's HTML, we need to construct a more complete email format
          // This is a simplified version
          rawContent = this.constructRawEmail(email);
        }

        return {
          emailMessageId: email.id,
          subject: email.subject || "No Subject",
          internalDate: email.receivedDateTime,
          decodedContents: rawContent,
        };
      });
    } catch (error) {
      console.error("Error processing emails:", error);
      throw new Error("Error processing emails");
    }
  }

  // Helper method to construct a raw email format from HTML content
  private constructRawEmail(email: OutlookEmailResponse): string {
    // This is a simplified version that creates a basic raw email format
    // Real emails have more headers and specific formatting

    const headers = [
      `Message-ID: ${email.internetMessageId || `<${email.id}@outlook.office365.com>`}`,
      `Date: ${email.receivedDateTime}`,
      `Subject: ${email.subject || "No Subject"}`,
      "MIME-Version: 1.0",
      `Content-Type: ${email.body.contentType}; charset=UTF-8`,
      "",
    ].join("\r\n");

    return headers + "\r\n" + email.body.content;
  }

  // Get a specific email by ID in its raw format
  async fetchEmailRawById(accessToken: string, emailId: string): Promise<RawOutlookEmailResponse> {
    const url = `https://graph.microsoft.com/v1.0/me/messages/${emailId}?$select=id,subject,receivedDateTime,internetMessageId,body`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const email: OutlookEmailResponse = await response.json();

      // Convert to raw format
      let rawContent = email.body.content;
      if (email.body.contentType === "html") {
        rawContent = this.constructRawEmail(email);
      }

      return {
        emailMessageId: email.id,
        subject: email.subject || "No Subject",
        internalDate: email.receivedDateTime,
        decodedContents: rawContent,
      };
    } else {
      console.error(`Failed to fetch email with ID: ${emailId}`, response);
      throw new Error(`Failed to fetch email with ID: ${emailId}`);
    }
  }
}
