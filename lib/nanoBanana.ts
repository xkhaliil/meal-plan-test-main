import { GoogleGenAI, PersonGeneration } from "@google/genai";
import * as fs from "fs";
import * as path from "path";

const IMAGEN_MODEL = "imagen-4.0-generate-001";

/** Google rejected the credentials — no amount of retrying will help. */
export class ImagenAuthError extends Error {
  constructor(cause: unknown) {
    super(
      "GEMINI_API_KEY was rejected by Google (API_KEY_INVALID). Generated " +
        "recipe photos stay disabled until a valid key is set in .env; " +
        "recipes keep their placeholder image."
    );
    this.name = "ImagenAuthError";
    this.cause = cause;
  }
}

/**
 * Google answers a bad key with a 400 INVALID_ARGUMENT, which reads like a
 * malformed request rather than a credential problem. The `API_KEY_INVALID`
 * reason is the part that actually says what is wrong.
 */
export function isInvalidApiKeyError(err: unknown): boolean {
  const text =
    err instanceof Error
      ? `${err.message}`
      : typeof err === "string"
        ? err
        : "";
  return (
    text.includes("API_KEY_INVALID") ||
    /api key not valid/i.test(text) ||
    /api key expired/i.test(text)
  );
}

function requireGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error("GEMINI_API_KEY is not set.");
  }
  return key;
}

function getGenAI(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: requireGeminiApiKey() });
}

export type ImagenMimeType = "image/jpeg" | "image/png";

export type GenerateImagenBufferOptions = {
  prompt: string;
  aspectRatio?: string;
  imageSize?: string;
  mimeType: ImagenMimeType;
  jpegQuality?: number;
};

export async function generateImagenImageBuffer(
  opts: GenerateImagenBufferOptions
): Promise<Buffer> {
  const aspectRatio = opts.aspectRatio ?? "4:3";
  const imageSize = opts.imageSize ?? "2K";
  const ai = getGenAI();

  let response;
  try {
    response = await ai.models.generateImages({
      model: IMAGEN_MODEL,
      prompt: opts.prompt,
      config: {
        numberOfImages: 1,
        aspectRatio,
        imageSize,
        outputMimeType: opts.mimeType,
        ...(opts.mimeType === "image/jpeg"
          ? { outputCompressionQuality: opts.jpegQuality ?? 92 }
          : {}),
        personGeneration: PersonGeneration.DONT_ALLOW,
      },
    });
  } catch (err) {
    // Surfaces one readable line instead of Google's nested error JSON.
    if (isInvalidApiKeyError(err)) throw new ImagenAuthError(err);
    throw err;
  }

  const b64 = response.generatedImages?.[0]?.image?.imageBytes;
  if (!b64) {
    throw new Error(
      "Imagen returned no image (safety filter, quota, or empty response)."
    );
  }
  return Buffer.from(b64, "base64");
}

export async function generateRecipeImage(
  imagePrompt: string
): Promise<string> {
  const buf = await generateImagenImageBuffer({
    prompt: imagePrompt,
    aspectRatio: "4:3",
    imageSize: "2K",
    mimeType: "image/jpeg",
    jpegQuality: 92,
  });
  const filename = `recipe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const outDir = path.join(process.cwd(), "public", "generated");
  fs.mkdirSync(outDir, { recursive: true });
  const outputPath = path.join(outDir, filename);
  fs.writeFileSync(outputPath, buf);
  return `/generated/${filename}`;
}
