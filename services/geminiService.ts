import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Slide, Attachment } from "../types";

const API_KEY = process.env.GEMINI_API_KEY || '';

// Debug: Log API key status (first 10 chars only for security)
console.log('API Key loaded:', API_KEY ? `${API_KEY.substring(0, 10)}...` : 'EMPTY/MISSING');

// Initialize client
const ai = new GoogleGenAI({ apiKey: API_KEY });

const OUTLINE_SYSTEM_INSTRUCTION = `
You are a world-class presentation designer. 
Your goal is to create a JSON array of slides based on the user's input.
Each slide must have a 'title', 'content', and a 'visualDescription'.

Rules for 'content':
- Use bullet points for key takeaways.
- CRITICAL: SEPARATE EACH POINT WITH A NEWLINE CHARACTER (\\n).
- Do not use markdown hyphens or asterisks at the start of lines, just the text separated by newlines.
- Keep text concise, impactful, and easy to read.

Rules for 'visualDescription':
- Detailed prompt for an image generator (no text in image).
- Describe style, colors, lighting, and subject.

Limit the output to a maximum of 12 slides unless requested otherwise.
`;

const slideSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      content: { type: Type.STRING },
      visualDescription: { type: Type.STRING, description: "A highly detailed visual description of the slide background and imagery, suitable for an AI image generator. Describe style, colors, and subject." },
    },
    required: ["title", "content", "visualDescription"],
  },
};

const singleSlideSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    content: { type: Type.STRING },
    visualDescription: { type: Type.STRING },
  },
  required: ["title", "content", "visualDescription"],
};

export const generateOutlineStream = async (
  topic: string,
  attachments: Attachment[] = [],
  onChunk: (text: string) => void
): Promise<string> => {
  try {
    const parts: any[] = [];

    // Add attachments first
    attachments.forEach(file => {
      parts.push({
        inlineData: {
          mimeType: file.mimeType,
          data: file.data
        }
      });
    });

    // Add the text prompt
    parts.push({
      text: `Create a slide deck outline for: ${topic || 'the provided content'}.`
    });

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: {
        systemInstruction: OUTLINE_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: slideSchema,
      },
    });

    let fullText = "";
    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        onChunk(fullText);
      }
    }
    return fullText;
  } catch (error) {
    console.error("Error generating outline:", error);
    throw error;
  }
};

export const generateSingleSlide = async (
  presentationTopic: string,
  slideDescription: string,
  existingSlides: Slide[] = [],
  insertIndex: number = -1
): Promise<Omit<Slide, 'id'>> => {
  try {
    // Build context string from existing slides
    let contextOutline = "";

    if (existingSlides.length > 0) {
      contextOutline = "\nCurrent Presentation Outline:\n";
      for (let i = 0; i <= existingSlides.length; i++) {
        if (i === insertIndex) {
          contextOutline += `>>> [INSERT NEW SLIDE HERE] <<<\n`;
        }

        if (i < existingSlides.length) {
          const s = existingSlides[i];
          // Include title and a brief snippet of content for context
          contextOutline += `Slide ${i + 1}: ${s.title} (${s.content.replace(/\n/g, '; ').substring(0, 100)}...)\n`;
        }
      }
    }

    const prompt = `
            Presentation Topic: ${presentationTopic}
            ${contextOutline}
            
            New Slide Request: ${slideDescription}
            
            Create a single slide that fits perfectly into the flow of this presentation at the marked position.
            Ensure the content flows logically from the previous slide and leads into the next slide.
            Match the tone and style of the existing deck.
        `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: OUTLINE_SYSTEM_INSTRUCTION, // Reuse the same style rules
        responseMimeType: "application/json",
        responseSchema: singleSlideSchema,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response text");

    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating single slide:", error);
    throw error;
  }
}

export const generateSlideImage = async (slide: Slide): Promise<string> => {
  try {
    // Using gemini-2.5-flash-image (Nano Banana)
    // Updated prompt to strictly enforce no text and correct aspect ratio
    const prompt = `
      Create a high-quality, 16:9 aspect ratio background image for a presentation slide.
      
      Visual Concept: ${slide.visualDescription}
      Context: ${slide.title}
      
      Style Guidelines:
      - Professional, Cinematic, Minimalist, Dark Mode aesthetic.
      - Ensure the center area is not too busy to allow for text overlay.
      
      CRITICAL: 
      - This image must contain NO TEXT, NO WORDS, and NO CHARACTERS. 
      - It is a background only.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    // Iterate to find the image part
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return part.inlineData.data;
        }
      }
    }

    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Error generating slide image:", error);
    // Return a placeholder if generation fails to avoid crashing the UI
    // In a real app, we might want to propagate the error
    return "";
  }
};