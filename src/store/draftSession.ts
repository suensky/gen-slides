import { Attachment } from '../types';
import { ImageConfig } from '../services/geminiService';

type DraftSession = {
  attachments: Attachment[];
  imageConfig: ImageConfig;
};

const keyFor = (presentationId: string) => `draft:${presentationId}`;

export const saveDraftSession = (presentationId: string, session: DraftSession) => {
  try {
    sessionStorage.setItem(keyFor(presentationId), JSON.stringify(session));
  } catch {
    // ignore (private mode, quota, etc)
  }
};

export const loadDraftSession = (presentationId: string): DraftSession | null => {
  try {
    const raw = sessionStorage.getItem(keyFor(presentationId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!Array.isArray(parsed.attachments)) return null;
    if (!parsed.imageConfig || typeof parsed.imageConfig !== 'object') return null;
    return parsed as DraftSession;
  } catch {
    return null;
  }
};

export const clearDraftSession = (presentationId: string) => {
  try {
    sessionStorage.removeItem(keyFor(presentationId));
  } catch {
    // ignore
  }
};
