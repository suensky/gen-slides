import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ArrowLeft, Download, Loader2, Undo, Redo } from 'lucide-react';
import pptxgen from 'pptxgenjs';
import { Slide } from '../types';
import { generateSlideImage, generateSingleSlide } from '../services/geminiService';
import { updateSlideImageInPresentation, updateSlideContentInPresentation, savePresentation } from '../services/db';

// Sub-components
import SlideThumbnails from './SlideThumbnails';
import SlideViewer from './SlideViewer';
import RegenerateModal from './RegenerateModal';
import NewSlideModal from './NewSlideModal';
import ConfirmationModal from './ConfirmationModal';
import ThemeToggle from './ThemeToggle';

interface SlideShowProps {
  slides: Slide[];
  onBack: () => void;
  topic: string;
  presentationId: string;
}

// Replicating CanvasObject interface for parsing purposes
interface CanvasObject {
  id: string;
  type: 'text' | 'rect';
  text?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fill: string;
  fontSize?: number;
  fontStyle?: string;
  textDecoration?: string;
  align?: 'left' | 'center' | 'right';
  field?: 'title' | 'content';
}

const SlideShow: React.FC<SlideShowProps> = ({ slides: initialSlides, onBack, topic, presentationId }) => {
  const [slides, setSlides] = useState<Slide[]>(initialSlides);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [generatingCount, setGeneratingCount] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  // History for Undo/Redo
  const [history, setHistory] = useState<Slide[][]>([initialSlides]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Image Cache to persist images across Undo/Redo operations
  // This solves the issue where undoing a text change reverts to a state before the image was generated
  const imageCache = useRef<Record<string, string>>({});

  // Modal State
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [slideToDelete, setSlideToDelete] = useState<number | null>(null);

  // New Slide Modal State
  const [showNewSlideModal, setShowNewSlideModal] = useState(false);
  const [newSlideIndex, setNewSlideIndex] = useState<number>(-1);
  const [isCreatingSlide, setIsCreatingSlide] = useState(false);

  const generatedRef = useRef<Set<string>>(new Set());
  const abortedRef = useRef<Set<string>>(new Set());

  // --- History Management ---

  // Update image cache whenever slides change
  useEffect(() => {
    slides.forEach(s => {
      if (s.imageBase64) {
        imageCache.current[s.id] = s.imageBase64;
      }
    });
  }, [slides]);

  const addToHistory = (newSlides: Slide[]) => {
    // Clean ephemeral state before saving history to avoid restoring spinners
    const cleanSlides = newSlides.map(s => ({
      ...s,
      isGeneratingImage: false,
      generationFailed: false
    }));

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(cleanSlides);

    // Limit history size
    if (newHistory.length > 50) newHistory.shift();

    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Helper to merge cached images into slides that might be missing them (e.g. from old history state)
  const mergeImagesFromCache = (slidesToRestore: Slide[]): Slide[] => {
    return slidesToRestore.map(s => {
      // If slide has no image, but we have one in cache, use it
      if (!s.imageBase64 && imageCache.current[s.id]) {
        return { ...s, imageBase64: imageCache.current[s.id] };
      }
      return s;
    });
  };

  const handleUndo = async () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const previousSlides = history[newIndex];

      // Restore images that were generated after this history snapshot was taken
      const slidesWithImages = mergeImagesFromCache(previousSlides);

      setSlides(slidesWithImages);
      setHistoryIndex(newIndex);

      // Sync DB
      await savePresentation({
        id: presentationId,
        topic,
        slides: slidesWithImages,
        createdAt: Date.now()
      });

      if (currentIndex >= slidesWithImages.length) {
        setCurrentIndex(Math.max(0, slidesWithImages.length - 1));
      }
    }
  };

  const handleRedo = async () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const nextSlides = history[newIndex];

      // Restore images here too, just in case
      const slidesWithImages = mergeImagesFromCache(nextSlides);

      setSlides(slidesWithImages);
      setHistoryIndex(newIndex);

      // Sync DB
      await savePresentation({
        id: presentationId,
        topic,
        slides: slidesWithImages,
        createdAt: Date.now()
      });

      if (currentIndex >= slidesWithImages.length) {
        setCurrentIndex(Math.max(0, slidesWithImages.length - 1));
      }
    }
  };


  // --- Generation Logic ---

  const triggerGeneration = async (slideIndex: number, force = false) => {
    // Safety check index
    if (slideIndex < 0 || slideIndex >= slides.length) return;

    const slide = slides[slideIndex];

    // If not forcing, skip if already exists or generating
    if (!force) {
      if (slide.imageBase64 || slide.isGeneratingImage || generatedRef.current.has(slide.id)) return;
    }

    // Reset abort status for this slide
    if (abortedRef.current.has(slide.id)) {
      abortedRef.current.delete(slide.id);
    }

    generatedRef.current.add(slide.id);

    // Update state to show loading and reset errors
    setSlides(prev => {
      const newSlides = [...prev];
      if (newSlides[slideIndex]) {
        newSlides[slideIndex] = { ...newSlides[slideIndex], isGeneratingImage: true, generationFailed: false };
      }
      return newSlides;
    });
    setGeneratingCount(c => c + 1);

    try {
      const base64 = await generateSlideImage(slide);

      // Check for empty string (failure)
      if (!base64) {
        throw new Error("Image generation returned empty result");
      }

      // Update cache immediately
      imageCache.current[slide.id] = base64;

      // Check for abort
      if (abortedRef.current.has(slide.id)) {
        console.log(`Generation aborted for slide ${slide.id}`);
        setSlides(prev => {
          const newSlides = [...prev];
          if (newSlides[slideIndex]) {
            newSlides[slideIndex] = { ...newSlides[slideIndex], isGeneratingImage: false };
          }
          return newSlides;
        });
        return;
      }

      // Save to IndexedDB asynchronously
      updateSlideImageInPresentation(presentationId, slide.id, base64).catch(err => console.error("Failed to save image to DB", err));

      setSlides(prev => {
        const newSlides = [...prev];
        // Ensure we don't overwrite if it was stopped in a race condition
        if (abortedRef.current.has(slide.id)) return prev;

        if (newSlides[slideIndex]) {
          newSlides[slideIndex] = {
            ...newSlides[slideIndex],
            imageBase64: base64,
            isGeneratingImage: false,
            generationFailed: false
          };
        }
        return newSlides;
      });
    } catch (e) {
      if (abortedRef.current.has(slide.id)) return;
      console.error(`Failed to generate slide ${slideIndex}`, e);
      setSlides(prev => {
        const newSlides = [...prev];
        if (newSlides[slideIndex]) {
          newSlides[slideIndex] = {
            ...newSlides[slideIndex],
            isGeneratingImage: false,
            generationFailed: true
          };
        }
        return newSlides;
      });
    } finally {
      setGeneratingCount(c => c - 1);
    }
  };

  // Queue Strategy
  useEffect(() => {
    // Generate current immediately
    triggerGeneration(currentIndex);

    // Preload next
    if (currentIndex + 1 < slides.length) {
      triggerGeneration(currentIndex + 1);
    }

    // Preload previous
    if (currentIndex - 1 >= 0) {
      triggerGeneration(currentIndex - 1);
    }
  }, [currentIndex, slides.length]);

  // Background generator for the rest
  useEffect(() => {
    const timer = setTimeout(() => {
      slides.forEach((_, idx) => {
        if (Math.abs(idx - currentIndex) > 1) {
          triggerGeneration(idx);
        }
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleDownloadPPTX = async () => {
    setIsExporting(true);
    try {
      const pres = new pptxgen();
      pres.layout = 'LAYOUT_16x9';
      pres.title = topic;

      // Canvas Dimensions & PPTX Scales
      const CANVAS_W = 1280;
      const CANVAS_H = 720;
      const PPTX_W = 10;
      const PPTX_H = 5.625;
      const FONT_SCALE = 0.5625;
      const LINE_SPACING_FACTOR = 1.4; // 1.4 line height

      slides.forEach((slide) => {
        const pptxSlide = pres.addSlide();
        pptxSlide.background = { color: '000000' };

        if (slide.imageBase64) {
          pptxSlide.addImage({
            data: `data:image/png;base64,${slide.imageBase64}`,
            x: 0, y: 0, w: '100%', h: '100%'
          });
          pptxSlide.addShape(pres.ShapeType.rect, {
            x: 0, y: 0, w: '100%', h: '100%',
            fill: { color: '000000', transparency: 40 }
          });
        }

        if (slide.customCanvasJson) {
          try {
            const objects: CanvasObject[] = JSON.parse(slide.customCanvasJson);
            objects.forEach(obj => {
              const xPct = (obj.x / CANVAS_W) * 100;
              const yPct = (obj.y / CANVAS_H) * 100;
              const wPct = (obj.width || 0) / CANVAS_W * 100;

              if (obj.type === 'text' && obj.text) {
                const hexColor = obj.fill.replace('#', '');
                const alignMap: Record<string, 'left' | 'center' | 'right'> = {
                  'left': 'left', 'center': 'center', 'right': 'right'
                };

                const fontSize = (obj.fontSize || 18) * FONT_SCALE;

                pptxSlide.addText(obj.text, {
                  x: `${xPct}%`,
                  y: `${yPct}%`,
                  w: `${wPct}%`,
                  fontSize: fontSize,
                  color: hexColor,
                  bold: obj.fontStyle?.includes('bold'),
                  italic: obj.fontStyle?.includes('italic'),
                  underline: obj.textDecoration?.includes('underline') ? { style: 'sng' } : undefined,
                  align: alignMap[obj.align || 'left'] || 'left',
                  fontFace: 'Arial',
                  shadow: { type: 'outer', color: '000000', blur: 3, offset: 2, angle: 45, opacity: 0.5 },
                  lineSpacing: fontSize * LINE_SPACING_FACTOR
                });
              } else if (obj.type === 'rect') {
                const hexColor = obj.fill.replace('#', '');
                const wInch = (obj.width || 0) / CANVAS_W * PPTX_W;
                const hInch = (obj.height || 0) / CANVAS_H * PPTX_H;
                const xInch = (obj.x / CANVAS_W) * PPTX_W;
                const yInch = (obj.y / CANVAS_H) * PPTX_H;

                pptxSlide.addShape(pres.ShapeType.rect, {
                  x: xInch, y: yInch, w: wInch, h: hInch,
                  fill: { color: hexColor }
                });
              }
            });

          } catch (e) {
            console.error("Failed to parse canvas json for export", e);
          }
        } else {
          // Default Layout
          const titleFontSize = 48 * FONT_SCALE;
          pptxSlide.addText(slide.title, {
            x: 0.5, y: '35%', w: '90%',
            fontSize: titleFontSize, color: 'FFFFFF', bold: true, fontFace: 'Arial', align: 'center',
            shadow: { type: 'outer', color: '000000', blur: 3, offset: 2, angle: 45 },
            lineSpacing: titleFontSize * LINE_SPACING_FACTOR
          });

          // Removed accent bar rect from here

          const contentFontSize = 24 * FONT_SCALE;
          pptxSlide.addText(slide.content, {
            x: '10%', y: '52%', w: '80%',
            fontSize: contentFontSize, color: 'FFFFFF', fontFace: 'Arial', align: 'center',
            shadow: { type: 'outer', color: '000000', blur: 2, offset: 1, angle: 45 },
            lineSpacing: contentFontSize * LINE_SPACING_FACTOR
          });
        }
      });

      const safeFileName = topic.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
      await pres.writeFile({ fileName: `${safeFileName}.pptx` });

    } catch (error) {
      console.error("Failed to generate PPTX", error);
      alert("Could not generate PowerPoint file. See console for details.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleTextChange = (field: 'title' | 'content', value: string) => {
    setSlides(prev => {
      const newSlides = [...prev];
      newSlides[currentIndex] = { ...newSlides[currentIndex], [field]: value };
      return newSlides;
    });
  };

  const handleCanvasChange = (json: string) => {
    setSlides(prev => {
      const newSlides = [...prev];
      newSlides[currentIndex] = { ...newSlides[currentIndex], customCanvasJson: json };
      return newSlides;
    });
  };

  // Commits text changes to history on blur
  const handleTextBlur = () => {
    const slide = slides[currentIndex];

    // Check if changed from history to avoid duplicates
    const currentInHistory = history[historyIndex][currentIndex];
    const hasChanged = currentInHistory && (
      slide.title !== currentInHistory.title ||
      slide.content !== currentInHistory.content ||
      slide.customCanvasJson !== currentInHistory.customCanvasJson
    );

    if (hasChanged) {
      addToHistory(slides);
      updateSlideContentInPresentation(presentationId, slide.id, {
        title: slide.title,
        content: slide.content,
        customCanvasJson: slide.customCanvasJson
      }).catch(err => console.error("Failed to save text changes", err));
    }
  };

  // --- Reordering Logic ---
  const handleReorder = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const updatedSlides = [...slides];
    const [movedSlide] = updatedSlides.splice(fromIndex, 1);
    updatedSlides.splice(toIndex, 0, movedSlide);

    setSlides(updatedSlides);
    addToHistory(updatedSlides);

    // Adjust current index
    let newIndex = currentIndex;
    if (currentIndex === fromIndex) {
      newIndex = toIndex;
    } else if (currentIndex > fromIndex && currentIndex <= toIndex) {
      newIndex = currentIndex - 1;
    } else if (currentIndex < fromIndex && currentIndex >= toIndex) {
      newIndex = currentIndex + 1;
    }
    setCurrentIndex(newIndex);

    // Save order to DB
    await savePresentation({
      id: presentationId,
      topic,
      slides: updatedSlides,
      createdAt: Date.now()
    });
  };

  // --- Delete Logic ---
  const requestDeleteSlide = (index: number) => {
    if (slides.length <= 1) {
      alert("Cannot delete the last slide.");
      return;
    }
    setSlideToDelete(index);
  };

  const confirmDeleteSlide = async () => {
    if (slideToDelete === null) return;

    const index = slideToDelete;
    const updatedSlides = [...slides];
    updatedSlides.splice(index, 1);

    setSlides(updatedSlides);
    addToHistory(updatedSlides);

    // Adjust index
    if (currentIndex >= updatedSlides.length) {
      setCurrentIndex(Math.max(0, updatedSlides.length - 1));
    } else if (index < currentIndex) {
      setCurrentIndex(currentIndex - 1);
    }

    await savePresentation({
      id: presentationId,
      topic,
      slides: updatedSlides,
      createdAt: Date.now()
    });

    setSlideToDelete(null);
  };

  // --- Image Generation Controls ---

  const handleStopGenerating = () => {
    const slide = slides[currentIndex];
    abortedRef.current.add(slide.id);

    setSlides(prev => {
      const newSlides = [...prev];
      newSlides[currentIndex] = { ...newSlides[currentIndex], isGeneratingImage: false };
      return newSlides;
    });
  };

  const handleRetry = () => {
    triggerGeneration(currentIndex, true);
  };

  const handleIgnore = () => {
    setSlides(prev => {
      const newSlides = [...prev];
      newSlides[currentIndex] = { ...newSlides[currentIndex], generationFailed: false };
      return newSlides;
    });
  };

  const handleOpenRegenerateModal = () => {
    setShowPromptModal(true);
  };

  const handleConfirmRegenerate = async (newPrompt: string) => {
    const slide = slides[currentIndex];

    // 1. Update the visual description in state
    setSlides(prev => {
      const newSlides = [...prev];
      newSlides[currentIndex] = {
        ...newSlides[currentIndex],
        visualDescription: newPrompt,
        imageBase64: undefined
      };
      return newSlides;
    });

    setShowPromptModal(false);

    // 2. Trigger Generation
    setTimeout(() => {
      triggerGeneration(currentIndex, true);
    }, 0);
  };

  // --- Add New Slide Logic ---
  const handleOpenAddSlideModal = (index: number) => {
    setNewSlideIndex(index);
    setShowNewSlideModal(true);
  }

  const handleConfirmAddSlide = async (description: string) => {
    setIsCreatingSlide(true);
    try {
      const newSlideData = await generateSingleSlide(topic, description, slides, newSlideIndex);

      const newSlide: Slide = {
        id: crypto.randomUUID(),
        ...newSlideData,
        isGeneratingImage: false
      };

      const updatedSlides = [...slides];
      updatedSlides.splice(newSlideIndex, 0, newSlide);

      setSlides(updatedSlides);
      addToHistory(updatedSlides);

      await savePresentation({
        id: presentationId,
        topic,
        slides: updatedSlides,
        createdAt: Date.now()
      });

      setCurrentIndex(newSlideIndex);
      setShowNewSlideModal(false);
      setIsCreatingSlide(false);

      setTimeout(() => {
        triggerGeneration(newSlideIndex, true);
      }, 100);

    } catch (error) {
      console.error("Failed to create new slide", error);
      alert("Failed to create slide. Please try again.");
      setIsCreatingSlide(false);
    }
  }

  const currentSlide = slides[currentIndex];

  return (
    <div className="h-full flex flex-col bg-slate-100 dark:bg-black text-zinc-900 dark:text-white relative transition-colors">
      {/* Navbar */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 relative z-20">

        {/* Left: Back + Undo/Redo */}
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-full transition text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white" title="Back to Home">
            <ArrowLeft size={20} />
          </button>

          <div className="h-6 w-px bg-slate-200 dark:bg-zinc-800 mx-2" />

          <button
            onClick={handleUndo}
            disabled={historyIndex === 0}
            className="p-2 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-full transition text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
            title="Undo"
          >
            <Undo size={18} />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex === history.length - 1}
            className="p-2 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-full transition text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
            title="Redo"
          >
            <Redo size={18} />
          </button>
        </div>

        {/* Center: Title & Slide Info */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <h1 className="font-semibold text-sm max-w-md truncate text-zinc-700 dark:text-zinc-200">{topic}</h1>
          <span className="font-mono text-[10px] text-zinc-500">
            Slide {currentIndex + 1} of {slides.length}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          {generatingCount > 0 && (
            <span className="text-xs text-zinc-500 animate-pulse flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" />
              Processing {generatingCount}...
            </span>
          )}
          <ThemeToggle />
          <button
            onClick={handleDownloadPPTX}
            disabled={isExporting}
            className="flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-50 transition"
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            <span className="hidden sm:inline">Export PPTX</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative z-10">
        <SlideThumbnails
          slides={slides}
          currentIndex={currentIndex}
          onSlideSelect={setCurrentIndex}
          onAddSlide={handleOpenAddSlideModal}
          onReorder={handleReorder}
          onDelete={requestDeleteSlide}
        />

        <SlideViewer
          key={currentSlide?.id}
          slide={currentSlide}
          isFirst={currentIndex === 0}
          isLast={currentIndex === slides.length - 1}
          onPrev={() => setCurrentIndex(c => Math.max(0, c - 1))}
          onNext={() => setCurrentIndex(c => Math.min(slides.length - 1, c + 1))}
          onDelete={() => requestDeleteSlide(currentIndex)}
          onStopGeneration={handleStopGenerating}
          onRetry={handleRetry}
          onIgnore={handleIgnore}
          onOpenRegenerateModal={handleOpenRegenerateModal}
          onTextChange={handleTextChange}
          onCanvasChange={handleCanvasChange}
          onTextBlur={handleTextBlur}
        />
      </div>

      <RegenerateModal
        isOpen={showPromptModal}
        initialPrompt={currentSlide?.visualDescription || ""}
        onClose={() => setShowPromptModal(false)}
        onConfirm={handleConfirmRegenerate}
      />

      <NewSlideModal
        isOpen={showNewSlideModal}
        onClose={() => setShowNewSlideModal(false)}
        onConfirm={handleConfirmAddSlide}
        isGenerating={isCreatingSlide}
      />

      <ConfirmationModal
        isOpen={slideToDelete !== null}
        title="Delete Slide"
        message="Are you sure you want to delete this slide? This action cannot be undone."
        confirmText="Delete"
        isDangerous={true}
        onClose={() => setSlideToDelete(null)}
        onConfirm={confirmDeleteSlide}
      />

    </div>
  );
};

export default SlideShow;