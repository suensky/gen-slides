import { openDB } from 'idb';
import { PresentationData } from '../types';

const DB_NAME = 'SlideDeckDB';
const STORE_NAME = 'presentations';

const initDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
};

export const savePresentation = async (data: PresentationData) => {
  const db = await initDB();
  await db.put(STORE_NAME, data);
};

export const getAllPresentations = async (): Promise<PresentationData[]> => {
  const db = await initDB();
  return db.getAll(STORE_NAME);
};

export const getPresentation = async (id: string): Promise<PresentationData | undefined> => {
  const db = await initDB();
  return db.get(STORE_NAME, id);
};

// Efficiently update a single slide's image without rewriting the whole object if possible,
// though for IDB simplistic put is often enough.
export const updateSlideImageInPresentation = async (presentationId: string, slideId: string, imageBase64: string) => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  
  const presentation = await store.get(presentationId) as PresentationData;
  if (!presentation) return;

  const slideIndex = presentation.slides.findIndex(s => s.id === slideId);
  if (slideIndex !== -1) {
    presentation.slides[slideIndex].imageBase64 = imageBase64;
    await store.put(presentation);
  }
  
  await tx.done;
};

export const updateSlideContentInPresentation = async (presentationId: string, slideId: string, updates: { title?: string, content?: string, customCanvasJson?: string }) => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  
  const presentation = await store.get(presentationId) as PresentationData;
  if (!presentation) return;

  const slideIndex = presentation.slides.findIndex(s => s.id === slideId);
  if (slideIndex !== -1) {
    if (updates.title !== undefined) presentation.slides[slideIndex].title = updates.title;
    if (updates.content !== undefined) presentation.slides[slideIndex].content = updates.content;
    if (updates.customCanvasJson !== undefined) presentation.slides[slideIndex].customCanvasJson = updates.customCanvasJson;
    await store.put(presentation);
  }
  
  await tx.done;
};

export const deletePresentation = async (id: string) => {
    const db = await initDB();
    await db.delete(STORE_NAME, id);
}