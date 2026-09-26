import "server-only";

import { access } from "node:fs/promises";
import { GoogleGenAI } from "@google/genai";
import { parseVertexCredentials } from "./credentials.ts";

export async function createVertexGenAi(timeoutSeconds: number) {
  const project = process.env.GOOGLE_CLOUD_PROJECT_ID?.trim();
  const location = process.env.GOOGLE_CLOUD_LOCATION?.trim() || "global";
  const credentialsJson =
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim();
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (!project || (!credentialsJson && !credentialsPath)) {
    throw new Error("VERTEX_PROVIDER_NOT_CONFIGURED");
  }

  let googleAuthOptions;
  if (credentialsJson) {
    googleAuthOptions = {
      credentials: parseVertexCredentials(credentialsJson),
    };
  } else {
    try {
      await access(credentialsPath!);
    } catch {
      throw new Error("VERTEX_CREDENTIALS_NOT_FOUND");
    }
  }

  return new GoogleGenAI({
    vertexai: true,
    project,
    location,
    googleAuthOptions,
    apiVersion: "v1",
    httpOptions: { timeout: timeoutSeconds * 1000 },
  });
}
