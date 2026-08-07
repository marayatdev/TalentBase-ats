export interface GoogleOAuthState {
  user_id: string;
}

export interface GoogleConnectionResult {
  connected: boolean;
  google_email: string | null;
}