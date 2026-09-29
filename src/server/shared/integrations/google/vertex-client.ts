import "server-only";

import { access } from "node:fs/promises";
import { GoogleAuth } from "google-auth-library";
import { generationHttp } from "./generation-http";
import { GoogleGenAI } from "@google/genai";
import { parseVertexCredentials } from "./credentials.ts";

export async function createVertexGenAi(
  timeoutSeconds: number,
  retryAttempts?: number,
) {
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
    httpOptions: {
      timeout: timeoutSeconds * 1000,
      ...(retryAttempts === undefined
        ? {}
        : { retryOptions: { attempts: retryAttempts } }),
    },
  });
}

/** SDK теряет заголовки ошибок; генерация использует одиночный REST-вызов. */
export async function requestVertexGeneration(
  model: string,
  body: unknown,
  timeoutSeconds: number,
) {
  const deadline = Date.now() + timeoutSeconds * 1000;
  const project = process.env.GOOGLE_CLOUD_PROJECT_ID?.trim();
  const location = process.env.GOOGLE_CLOUD_LOCATION?.trim() || "global";
  const json = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim();
  const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (!project || (!json && !keyFilename))
    throw new Error("VERTEX_PROVIDER_NOT_CONFIGURED");
  if (!/^[a-z0-9-]+$/.test(location))
    throw new Error("VERTEX_LOCATION_INVALID");
  const auth = new GoogleAuth({
    ...(json ? { credentials: parseVertexCredentials(json) } : { keyFilename }),
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const host =
    location === "global"
      ? "aiplatform.googleapis.com"
      : `${location}-aiplatform.googleapis.com`;
  const url = `https://${host}/v1/projects/${encodeURIComponent(project)}/locations/${location}/publishers/google/models/${encodeURIComponent(model)}:generateContent`;
  const headers = new Headers(await auth.getRequestHeaders(url));
  headers.set("Content-Type", "application/json");
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new Error("VERTEX_AUTH_TIMEOUT");
  return generationHttp(url, headers, body, remaining);
}
