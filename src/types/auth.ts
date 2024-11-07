/**
 * Interface for authentication for creating and updating blueprints
 */
export type Auth = {
  /**
   * Retrieves the authentication token
   * e.g. from a req for next.js or the localstorage for frontend
   * @returns Promise that resolves to the token string or null if no token exists
   */
  getToken: () => Promise<string | null>;

  /**
   * Callback triggered when the authentication token expires
   * @returns Promise that resolves when expired token is handled
   */
  onTokenExpired: () => Promise<void>;
};
