export type SlideLayout = 'center' | 'left' | 'right' | 'top' | 'bottom' | 'split-left' | 'split-right' | 'diagonal' | 'scattered';

export interface Slide {
  id: string;
  title: string;
  content: string;
  visualDescription: string;
  layout?: SlideLayout; // Layout type for text positioning
  imageBase64?: string; // Optional, populated after generation
  isGeneratingImage?: boolean;
  generationFailed?: boolean;
  customCanvasJson?: string; // Persist extra elements and state
}

export interface Attachment {
  name: string;
  mimeType: string;
  data: string; // Base64 string
}

export type ViewState = 'HOME' | 'OUTLINE' | 'SLIDESHOW' | 'TEST';

export interface PresentationData {
  id: string;
  topic: string;
  slides: Slide[];
  createdAt: number;
}