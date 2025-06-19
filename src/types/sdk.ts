import { Auth } from "./auth";

export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

export type LoggingOptions = {
  level?: LogLevel;
  enabled?: boolean;
};

export type SdkOptions = {
  auth?: Auth;
  baseUrl?: string;
  logging?: LoggingOptions;
};
