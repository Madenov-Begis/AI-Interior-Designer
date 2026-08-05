import type { GoogleGenAIOptions } from "@google/genai";

type VertexCredentials = NonNullable<
  NonNullable<GoogleGenAIOptions["googleAuthOptions"]>["credentials"]
>;

export function parseVertexCredentials(value: string): VertexCredentials {
  try {
    const credentials = JSON.parse(value) as Record<string, unknown>;
    if (
      typeof credentials.client_email !== "string" ||
      !credentials.client_email ||
      typeof credentials.private_key !== "string" ||
      !credentials.private_key
    ) {
      throw new Error();
    }
    return credentials as VertexCredentials;
  } catch {
    throw new Error("VERTEX_CREDENTIALS_INVALID");
  }
}
