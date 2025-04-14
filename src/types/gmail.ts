export type GmailMessagesListResponse = {
  messages: Array<{
    id: string;
    threadId: string;
  }>;
  nextPageToken?: string;
  resultSizeEstimate?: number;
};

export type RawEmailResponse = {
  emailMessageId: string;
  subject: string;
  internalDate: string;
  decodedContents: string;
};

/**
 * Options for fetching emails with search criteria.
 * When you use replaceQuery, AND and OR will be ignored.
 * @example
 * {
 *   OR: 'from:bob@example.com OR subject:important',
 *   AND: 'before:2024/11/02',
 *   replaceQuery: 'from:alice@example.com'
 * }
 */
export type FetchEmailOptions = {
  /** Search terms added as OR to the existing blueprint query */
  OR?: string;
  /** Search terms added as AND to the existing blueprint query */
  AND?: string;
  /** Search query that replaces the blueprint query */
  replaceQuery?: string;
};
