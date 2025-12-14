import { Slide, Attachment } from "../types";
import { ThemeOption } from "./themes";

const postJson = async <TResponse>(
  url: string,
  body: unknown,
  init?: RequestInit
): Promise<TResponse> => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...init,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Request failed (${response.status})`);
  }

  return (await response.json()) as TResponse;
};

export const generateOutlineStream = async (
  topic: string,
  attachments: Attachment[] = [],
  onChunk: (text: string) => void
): Promise<string> => {
  const response = await fetch("/api/outline-stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, attachments }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Outline request failed (${response.status})`);
  }
  if (!response.body) throw new Error("Missing response body");

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let fullText = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    fullText += decoder.decode(value, { stream: true });
    onChunk(fullText);
  }

  fullText += decoder.decode();
  onChunk(fullText);
  return fullText;
};

export const generateSingleSlide = async (
  presentationTopic: string,
  slideDescription: string,
  existingSlides: Slide[] = [],
  insertIndex: number = -1
): Promise<Omit<Slide, "id">> => {
  return postJson<Omit<Slide, "id">>("/api/single-slide", {
    presentationTopic,
    slideDescription,
    existingSlides,
    insertIndex,
  });
};

// Image generation model options
export const IMAGE_MODELS = [
  { id: "gemini-2.5-flash-image", name: "Gemini 2.5 Flash Image", supportsImageSize: false },
  { id: "gemini-3-pro-image-preview", name: "Gemini 3 Pro Image", supportsImageSize: true },
] as const;

export const ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4"] as const;
export const IMAGE_SIZES = ["1K", "2K"] as const;

export type ImageModel = (typeof IMAGE_MODELS)[number]["id"];
export type AspectRatio = (typeof ASPECT_RATIOS)[number];
export type ImageSize = (typeof IMAGE_SIZES)[number];

export interface ImageConfig {
  model: ImageModel;
  aspectRatio: AspectRatio;
  imageSize?: ImageSize;
}

export const DEFAULT_IMAGE_CONFIG: ImageConfig = {
  model: "gemini-2.5-flash-image",
  aspectRatio: "16:9",
};

export const generateSlideImage = async (
  slide: Slide,
  config: ImageConfig = DEFAULT_IMAGE_CONFIG
): Promise<string> => {
  try {
    const data = await postJson<{ data?: string }>("/api/slide-image", { slide, config });
    return data.data || "";
  } catch {
    return "";
  }
};

export const generateThemedBackground = async (
  theme: ThemeOption,
  presentationContext: string = "",
  config: ImageConfig = DEFAULT_IMAGE_CONFIG
): Promise<string> => {
  try {
    const data = await postJson<{ data?: string }>("/api/themed-background", {
      theme,
      presentationContext,
      config,
    });
    return data.data || "";
  } catch {
    return "";
  }
};

export const enhanceSpeakerNotes = async (
  notes: string,
  mode: "enhance" | "simplify" | "natural" | "translate",
  targetLanguage?: string
): Promise<string> => {
  const data = await postJson<{ text?: string }>("/api/enhance-notes", {
    notes,
    mode,
    targetLanguage,
  });
  if (!data.text) throw new Error("Missing response text");
  return data.text;
};

