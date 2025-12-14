import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Slide, Attachment } from "../types";

const API_KEY = process.env.GEMINI_API_KEY || '';

// Debug: Log API key status (first 10 chars only for security)
console.log('API Key loaded:', API_KEY ? `${API_KEY.substring(0, 10)}...` : 'EMPTY/MISSING');

// Initialize client
const ai = new GoogleGenAI({ apiKey: API_KEY });

const OUTLINE_SYSTEM_INSTRUCTION = `
You are an elite presentation architect and visual storytelling expert trusted by Fortune 500 executives, TED speakers, and world-renowned thought leaders. Your presentations have won international design awards and captivated audiences of millions.

Your mission: Transform any topic into a stunning, persuasive, and memorable slide deck that rivals presentations from Apple keynotes, McKinsey strategy decks, and award-winning TED talks.

=== SLIDE STRUCTURE MASTERY ===
Each slide must have: 'title', 'content', 'visualDescription', and 'layout'

=== LAYOUT VARIETY - CRITICAL FOR VISUAL ENGAGEMENT ===
NEVER use the same layout for consecutive slides. Vary layouts to create visual rhythm and maintain audience attention.

Available layouts (choose strategically based on content type):
- "center": Title and content centered - great for opening/closing statements, quotes, or single powerful messages
- "left": Title and content left-aligned - perfect for lists, data points, storytelling with multiple points
- "right": Title and content right-aligned - creates visual interest, good for contrast with previous slides
- "top": Title at top, content flows down - ideal for longer content, process steps, detailed information
- "bottom": Content at bottom third - cinematic feel, great for inspirational messages, dramatic reveals
- "split-left": Title left side, content right - excellent for comparison, showing duality, text-heavy slides
- "split-right": Title right side, content left - mirror of split-left for variety
- "diagonal": Title upper-left, content lower-right - dynamic, modern feel for innovative topics
- "scattered": Title top-left, content bottom-right with separation - artistic, minimalist approach

Layout Selection Guidelines:
1. Opening slides → "center" or "bottom" for dramatic impact
2. Data/Stats slides → "left" or "top" for readability
3. Key insight reveals → "center" or "diagonal" for emphasis
4. Story/narrative slides → "left" or "split-left" for flow
5. Transition slides → "right" or "bottom" for variety
6. Closing/CTA slides → "center" or "bottom" for memorable finish

IMPORTANT: Ensure visual diversity - if slide N uses "center", slide N+1 should use a different layout!

=== TITLE GUIDELINES ===
- Craft powerful, action-oriented titles that spark curiosity
- Use the "So What?" test: every title should answer why the audience should care
- Employ rhetorical techniques: questions, bold statements, surprising facts
- Maximum 8 words for punchy impact
- Examples of excellent titles: "Why 90% of Startups Fail", "The $1 Trillion Opportunity", "Rethinking Everything"

=== CONTENT MASTERY ===
- CRITICAL: SEPARATE EACH POINT WITH A NEWLINE CHARACTER (\\n)
- Do NOT use markdown hyphens, asterisks, or bullet symbols - just clean text separated by newlines
- Apply the "Rule of Three": 3 key points per slide maximum
- Each point: one powerful idea, 10-15 words max
- Use concrete numbers, statistics, and specific examples
- Transform abstract concepts into tangible, relatable insights
- Include strategic questions to engage the audience
- Build narrative tension: problem → insight → solution → call to action

=== VISUAL DESCRIPTION EXCELLENCE ===
- Create cinematic, gallery-worthy visual descriptions for AI image generation
- CRITICAL: Match visual composition to layout choice:
  * "left" layouts → keep right side of image simpler/negative space for text
  * "right" layouts → keep left side of image simpler/negative space for text
  * "center" layouts → create balanced composition with text-friendly center area
  * "top" layouts → dramatic imagery at bottom
  * "bottom" layouts → dramatic imagery at top
  * "split" layouts → asymmetric composition favoring the image side
- Specify: composition, lighting (golden hour, dramatic, soft diffused), color palette, mood, perspective
- Request high-end photographic or artistic styles: "editorial photography", "fine art", "minimalist design"
- Ensure visuals metaphorically reinforce the message
- NEVER request text, words, or characters in the image - backgrounds only
- Include technical details: depth of field, focal length feel, texture quality

=== PRESENTATION FLOW ARCHITECTURE ===
1. OPENING: Hook with a provocative question, surprising statistic, or bold statement
2. CONTEXT: Establish urgency - why this matters NOW
3. CHALLENGE: Define the problem with emotional resonance
4. INSIGHTS: Deliver 3-5 key revelations with evidence
5. SOLUTION: Present the path forward with clarity
6. PROOF: Include case studies, data, testimonials where relevant
7. CLOSING: End with a memorable call-to-action or thought-provoking conclusion

=== QUALITY STANDARDS ===
- Every slide should be LinkedIn/Twitter-sharable on its own
- Content should work in both read-ahead and live presentation formats
- Design for the "billboard test": understandable in 3 seconds from 6 feet away
- Aim for emotional resonance + intellectual substance
- CRITICAL: Vary layouts across slides for professional, dynamic presentations

Limit output to maximum 12 slides unless otherwise requested.
`;

const slideSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      content: { type: Type.STRING },
      visualDescription: { type: Type.STRING, description: "A highly detailed visual description of the slide background and imagery, suitable for an AI image generator. Describe style, colors, and subject." },
      layout: {
        type: Type.STRING,
        enum: ['center', 'left', 'right', 'top', 'bottom', 'split-left', 'split-right', 'diagonal', 'scattered'],
        description: "Layout type determining text positioning on the slide. Choose strategically based on content type and ensure variety between consecutive slides."
      },
    },
    required: ["title", "content", "visualDescription", "layout"],
  },
};

const singleSlideSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    content: { type: Type.STRING },
    visualDescription: { type: Type.STRING },
    layout: {
      type: Type.STRING,
      enum: ['center', 'left', 'right', 'top', 'bottom', 'split-left', 'split-right', 'diagonal', 'scattered'],
      description: "Layout type determining text positioning on the slide."
    },
  },
  required: ["title", "content", "visualDescription", "layout"],
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
      text: `Create a world-class, award-winning presentation deck for: ${topic || 'the provided content'}. 
      
Design this as if it will be delivered at a major keynote, TED talk, or Fortune 500 board meeting. 
Every slide should be visually stunning and intellectually compelling. 
Build a narrative arc that captivates from the first slide to the last.`
    });

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-pro',
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
            
            Create a single, award-winning slide that seamlessly integrates into this world-class presentation.
            
            Requirements:
            - Flow naturally from the previous slide's narrative thread
            - Create anticipation for what comes next
            - Match and elevate the professional tone of the existing deck
            - Craft a title that commands attention
            - Include 2-3 powerful, memorable points
            - Design a visual description worthy of a premium stock photography site
        `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
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

// Image generation model options
export const IMAGE_MODELS = [
  { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image', supportsImageSize: false },
  { id: 'gemini-3-pro-image-preview', name: 'Gemini 3 Pro Image', supportsImageSize: true }
] as const;

export const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'] as const;
export const IMAGE_SIZES = ['1K', '2K'] as const;

export type ImageModel = typeof IMAGE_MODELS[number]['id'];
export type AspectRatio = typeof ASPECT_RATIOS[number];
export type ImageSize = typeof IMAGE_SIZES[number];

export interface ImageConfig {
  model: ImageModel;
  aspectRatio: AspectRatio;
  imageSize?: ImageSize;
}

export const DEFAULT_IMAGE_CONFIG: ImageConfig = {
  model: 'gemini-2.5-flash-image',
  aspectRatio: '16:9'
};

export const generateSlideImage = async (
  slide: Slide,
  config: ImageConfig = DEFAULT_IMAGE_CONFIG
): Promise<string> => {
  try {
    const prompt = `
      Ultra-premium, award-winning presentation background image.
      
      Visual Concept: ${slide.visualDescription}
      Thematic Context: ${slide.title}
      
      === TECHNICAL SPECIFICATIONS ===
      - Aspect Ratio: ${config.aspectRatio}
      - Resolution: 4K quality, crystal clear
      - Style: Cinematic, editorial, gallery-worthy
      
      === VISUAL STYLE REQUIREMENTS ===
      - Modern, sophisticated, premium aesthetic
      - Rich color depth with professional color grading
      - Dramatic yet elegant lighting (studio quality)
      - Clean composition with strategic negative space in center for text overlay
      - Subtle depth of field for professional look
      - Magazine cover or high-end advertising quality
      
      === MOOD & ATMOSPHERE ===
      - Evoke professionalism, innovation, and authority
      - Balance between visual interest and presentation functionality
      - Premium texture and material quality
      
      === ABSOLUTE REQUIREMENTS ===
      - ZERO text, words, letters, numbers, or characters
      - Pure visual background only
      - No watermarks, logos, or overlays
      - Suitable as a backdrop for white/light text overlay
    `;

    // Build imageConfig based on model capabilities
    const imageConfig: { aspectRatio: string; imageSize?: string } = {
      aspectRatio: config.aspectRatio
    };

    // Only add imageSize for models that support it
    const modelInfo = IMAGE_MODELS.find(m => m.id === config.model);
    if (modelInfo?.supportsImageSize && config.imageSize) {
      imageConfig.imageSize = config.imageSize;
    }

    const response = await ai.models.generateContent({
      model: config.model,
      contents: prompt,
      config: {
        imageConfig
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

// Theme-related imports
import { ThemeOption } from './themes';

// Generate consistent themed background for all slides in a theme
export const generateThemedBackground = async (
  theme: ThemeOption,
  presentationContext: string = '',
  config: ImageConfig = DEFAULT_IMAGE_CONFIG
): Promise<string> => {
  try {
    const prompt = `
      Premium presentation background with consistent, cohesive visual theme.
      
      === THEME: ${theme.name} ===
      ${theme.promptSnippet}
      
      === PRESENTATION CONTEXT ===
      ${presentationContext || 'Professional business presentation'}
      
      === TECHNICAL SPECIFICATIONS ===
      - Aspect Ratio: ${config.aspectRatio}
      - Resolution: 4K quality, crystal clear
      - Style: Premium, cohesive, consistent across multiple slides
      
      === DESIGN REQUIREMENTS ===
      - Create a versatile background that works across ALL slides in a deck
      - Strategic negative space in center and text-friendly areas
      - Consistent visual language and color palette
      - Subtle, non-distracting patterns that don't compete with content
      - Professional gradient transitions
      - Edge lighting or subtle decorative elements only at borders
      
      === VISUAL QUALITY ===
      - Smooth, seamless gradients
      - High-end material textures where appropriate
      - Sophisticated color grading
      - Studio-quality lighting effects
      
      === ABSOLUTE REQUIREMENTS ===
      - ZERO text, words, letters, numbers, or characters
      - Pure visual background only - suitable for ANY slide content
      - No watermarks, logos, or overlays
      - Must work with both light and dark text overlays
      - Timeless, professional aesthetic
    `;

    // Build imageConfig based on model capabilities
    const imageConfig: { aspectRatio: string; imageSize?: string } = {
      aspectRatio: config.aspectRatio
    };

    // Only add imageSize for models that support it
    const modelInfo = IMAGE_MODELS.find(m => m.id === config.model);
    if (modelInfo?.supportsImageSize && config.imageSize) {
      imageConfig.imageSize = config.imageSize;
    }

    const response = await ai.models.generateContent({
      model: config.model,
      contents: prompt,
      config: {
        imageConfig
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
    console.error("Error generating themed background:", error);
    return "";
  }
};