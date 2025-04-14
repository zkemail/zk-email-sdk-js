import { Blueprint } from "../blueprint";
import { FetchEmailOptions } from "../types/gmail";

// Common response type for both providers
export interface RawEmailResponse {
  emailMessageId: string;
  subject: string;
  internalDate: string;
  decodedContents: string;
}

// Login provider interface
export interface EmailLoginProvider {
  accessToken: string | null;
  authorize(options?: any): Promise<string>;
  getAccessToken(): Promise<string>;
  isTokenValid(accessToken: string): Promise<boolean>;
}

// Email provider interface
export interface EmailProvider {
  fetchEmails(blueprints: Blueprint[], options?: FetchEmailOptions): Promise<RawEmailResponse[]>;
  fetchMore(): Promise<RawEmailResponse[]>;
  authorize(options?: any): Promise<void>;
}
