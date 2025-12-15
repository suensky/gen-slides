export type SlideLayout = 'center' | 'left' | 'right' | 'top' | 'bottom' | 'split-left' | 'split-right' | 'diagonal' | 'scattered';

// Theme configuration for presentations
export interface SlideTheme {
  themeId: string | null; // null = per-slide images (current behavior)
  useConsistentBackground: boolean;
}

export interface Slide {
  id: string;
  title: string;
  content: string;
  visualDescription: string;
  speakerNotes?: string; // Notes visible only to presenter
  layout?: SlideLayout; // Layout type for text positioning
  imageBase64?: string; // Optional, populated after generation
  isGeneratingImage?: boolean;
  generationFailed?: boolean;
  customCanvasJson?: string; // Persist extra elements and state
  themeBackground?: string; // Base64 for themed background (shared across slides)
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
  themeId?: string; // Optional theme ID for consistent backgrounds
}