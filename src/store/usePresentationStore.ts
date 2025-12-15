import { create } from 'zustand';
import { Attachment, PresentationData } from '../types';
import { DEFAULT_IMAGE_CONFIG, ImageConfig } from '../services/geminiService';
import {
  deletePresentation as deletePresentationFromDb,
  getAllPresentations,
  getPresentation,
  savePresentation,
} from '../services/db';
import { clearDraftSession, loadDraftSession, saveDraftSession } from './draftSession';

type PresentationStore = {
  history: PresentationData[];
  presentationsById: Record<string, PresentationData>;
  currentPresentationId: string | null;

  isSidebarCollapsed: boolean;

  draftsById: Record<string, { attachments: Attachment[]; imageConfig: ImageConfig }>;

  loadHistory: () => Promise<void>;
  loadPresentation: (id: string) => Promise<PresentationData | null>;

  createDraft: (topic: string, attachments: Attachment[], imageConfig: ImageConfig) => Promise<string>;
  clearDraft: (id: string) => void;
  getDraftAttachments: (id: string) => Attachment[];
  getImageConfig: (id: string) => ImageConfig;

  addToHistory: (presentation: PresentationData) => void;
  setCurrentPresentation: (presentation: PresentationData | null) => void;
  deletePresentation: (id: string) => Promise<void>;

  toggleSidebar: () => void;
};

export const usePresentationStore = create<PresentationStore>((set, get) => ({
  history: [],
  presentationsById: {},
  currentPresentationId: null,

  isSidebarCollapsed: false,

  draftsById: {},

  loadHistory: async () => {
    const decks = (await getAllPresentations()).filter((d) => d.id !== '__active_presentation__');
    set(() => ({
      history: decks,
      presentationsById: Object.fromEntries(decks.map((d) => [d.id, d])),
    }));
  },

  loadPresentation: async (id: string) => {
    const existing = get().presentationsById[id];
    if (existing) return existing;

    const loaded = await getPresentation(id);
    if (!loaded) return null;
    set((s) => ({
      presentationsById: { ...s.presentationsById, [id]: loaded },
    }));
    return loaded;
  },

  createDraft: async (topic: string, attachments: Attachment[], imageConfig: ImageConfig) => {
    const id = crypto.randomUUID();
    const draft: PresentationData = {
      id,
      topic: topic || 'Untitled Presentation',
      slides: [],
      createdAt: Date.now(),
    };

    await savePresentation(draft);

    set((s) => ({
      presentationsById: { ...s.presentationsById, [id]: draft },
      draftsById: { ...s.draftsById, [id]: { attachments, imageConfig } },
      currentPresentationId: id,
      history: [draft, ...s.history.filter((h) => h.id !== id)],
    }));

    saveDraftSession(id, { attachments, imageConfig });
    return id;
  },

  clearDraft: (id: string) => {
    set((s) => {
      const { [id]: _removed, ...rest } = s.draftsById;
      return { draftsById: rest };
    });
    clearDraftSession(id);
  },

  getDraftAttachments: (id: string) => {
    const inMemory = get().draftsById[id];
    if (inMemory) return inMemory.attachments;
    const fromSession = loadDraftSession(id);
    if (!fromSession) return [];
    set((s) => ({ draftsById: { ...s.draftsById, [id]: fromSession } }));
    return fromSession.attachments;
  },

  getImageConfig: (id: string) => {
    const inMemory = get().draftsById[id];
    if (inMemory) return inMemory.imageConfig;
    const fromSession = loadDraftSession(id);
    if (!fromSession) return DEFAULT_IMAGE_CONFIG;
    set((s) => ({ draftsById: { ...s.draftsById, [id]: fromSession } }));
    return fromSession.imageConfig;
  },

  addToHistory: (presentation: PresentationData) => {
    set((s) => ({
      history: [presentation, ...s.history.filter((h) => h.id !== presentation.id)],
      presentationsById: { ...s.presentationsById, [presentation.id]: presentation },
    }));
  },

  setCurrentPresentation: (presentation: PresentationData | null) => {
    set(() => ({
      currentPresentationId: presentation?.id || null,
      presentationsById: presentation ? { ...get().presentationsById, [presentation.id]: presentation } : get().presentationsById,
    }));
  },

  deletePresentation: async (id: string) => {
    await deletePresentationFromDb(id);
    set((s) => {
      const { [id]: _removed, ...rest } = s.presentationsById;
      return {
        presentationsById: rest,
        history: s.history.filter((h) => h.id !== id),
        currentPresentationId: s.currentPresentationId === id ? null : s.currentPresentationId,
      };
    });
  },

  toggleSidebar: () => set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
}));
