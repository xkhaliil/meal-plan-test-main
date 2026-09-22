import { GoogleGenAI, PersonGeneration } from "@google/genai";
import * as fs from "fs";
import * as path from "path";

const IMAGEN_MODEL = "imagen-4.0-generate-001";

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
  const response = await ai.models.generateImages({
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
  const b64 = response.generatedImages?.[0]?.image?.imageBytes;
  if (!b64) {
    throw new Error(
      "Imagen returned no image (safety filter, quota, or empty response)."
    );
  }
  return Buffer.from(b64, "base64");
}

export async function generateRecipeImage(imagePrompt: string): Promise<string> {
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
