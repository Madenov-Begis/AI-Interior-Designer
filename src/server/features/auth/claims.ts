export type CurrentUser = {
  id: string;
  email?: string | null;
  user_metadata: Record<string, unknown>;
};
