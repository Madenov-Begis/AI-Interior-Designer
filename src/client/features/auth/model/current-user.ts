export type AppUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

export type AppWallet = {
  balance: number;
  generationCost: number;
};

export type AppSession = {
  user: AppUser;
  wallet: AppWallet;
};

export type AuthMePayload = AppSession;

export function currentUserFromAuthMe(payload: AuthMePayload): AppUser {
  return payload.user;
}
