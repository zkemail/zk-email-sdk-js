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
