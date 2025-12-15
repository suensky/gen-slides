import React, { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Loader2, Play, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Slide, Attachment } from '../types';
import { generateOutlineStream } from '../services/geminiService';
import ThemeSelector from './ThemeSelector';


interface OutlineEditorProps {
  topic: string;
  initialAttachments: Attachment[];
  onBack: () => void;
  onGenerateSlides: (slides: Slide[], themeId: string | null) => void;
}

const OutlineEditor: React.FC<OutlineEditorProps> = ({ topic, initialAttachments, onBack, onGenerateSlides }) => {
  const [rawOutput, setRawOutput] = useState('');
  const [slides, setSlides] = useState<Slide[]>([]);
  const [isGenerating, setIsGenerating] = useState(true);
  const [parseError, setParseError] = useState(false);
  const [hasStreamStarted, setHasStreamStarted] = useState(false);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    const startGeneration = async () => {
      try {
        await generateOutlineStream(topic, initialAttachments, (text) => {
          if (!mounted) return;
          setRawOutput(text);
          setHasStreamStarted(true);

          // Attempt realtime parsing for the visual side
          // We look for valid JSON array ending
          try {
            // Heuristic: Try to parse if it looks somewhat like a closed array
            // This is imperfect during streaming, but allows "updates" as it completes
            if (text.trim().endsWith(']')) {
              const parsed = JSON.parse(text);
              if (Array.isArray(parsed)) {
                setSlides(parsed.map((s, i) => ({ ...s, id: `slide-${i}` })));
                setParseError(false);
              }
            }
          } catch (e) {
            // Ignore parsing errors during streaming
          }
        });
      } catch (e) {
        console.error("Generation failed", e);
      } finally {
        if (mounted) {
          setIsGenerating(false);
          // Final parse attempt
          try {
            // Access current state via the closure or the last text update. 
            // Ideally we used the callback value, but here we can just rely on rawOutput update cycle or re-parse
          } catch (e) { }
        }
      }
    };

    startGeneration();

    return () => { mounted = false; };
  }, [topic]);

  // Dedicated effect to handle final parsing state when generation stops
  useEffect(() => {
    if (!isGenerating && rawOutput) {
      try {
        // Clean up potentially messy markdown code blocks if Gemini added them
        let cleanJson = rawOutput.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        if (Array.isArray(parsed)) {
          setSlides(parsed.map((s, i) => ({ ...s, id: `slide-${i}` })));
          setParseError(false);
        } else {
          setParseError(true);
        }
      } catch (e) {
        console.error("Final parse error", e);
        setParseError(true);
      }
    }
    // Auto scroll raw output
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [rawOutput, isGenerating]);


  const updateSlide = (id: string, field: keyof Slide, value: string) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const deleteSlide = (id: string) => {
    setSlides(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-zinc-950 transition-colors">
      {/* Navbar */}
      <header className="h-16 border-b border-slate-200 dark:border-zinc-800 flex items-center px-6 justify-between bg-white/50 dark:bg-zinc-950/50 backdrop-blur">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-200 dark:hover:bg-zinc-900 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition">
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col">
            <h2 className="font-semibold text-lg truncate max-w-md text-zinc-800 dark:text-white">{topic || "Untitled"}</h2>
            {initialAttachments.length > 0 && (
              <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                Attached: {initialAttachments.length} file(s)
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isGenerating && <span className="text-xs text-purple-600 dark:text-purple-400 animate-pulse flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> AI Generating...</span>}

        </div>
      </header>

      {/* Main Content Split */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left Column: Raw Stream (Matrix style) */}
        <div className="w-1/3 border-r border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-black p-6 overflow-y-auto hidden md:block">
          <h3 className="text-zinc-500 text-xs font-mono uppercase tracking-widest mb-4">Live Inference Stream</h3>
          <pre className="font-mono text-xs text-emerald-600 dark:text-green-500/80 whitespace-pre-wrap break-all leading-relaxed">
            {rawOutput || <span className="animate-pulse">Waiting for tokens...</span>}
            <div ref={bottomRef} />
          </pre>
        </div>

        {/* Right Column: Interactive Outline */}
        <div className="flex-1 bg-slate-50 dark:bg-zinc-950 p-6 overflow-y-auto">
          <div className="max-w-3xl mx-auto space-y-6 pb-20">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h3 className="text-2xl font-bold text-zinc-800 dark:text-white">Slide Outline</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Review and edit your structure before generating images.</p>
              </div>
            </div>

            {/* Theme Selector - Show when slides are ready */}
            {slides.length > 0 && !isGenerating && (
              <div className="mb-6">
                <ThemeSelector
                  selectedThemeId={selectedThemeId}
                  onSelectTheme={setSelectedThemeId}
                />
              </div>
            )}

            {slides.length === 0 && !parseError && (
              <div className="flex flex-col items-center justify-center h-64 text-zinc-500 space-y-4">
                {hasStreamStarted ? <Loader2 className="animate-spin text-purple-600 dark:text-purple-500" size={32} /> : null}
                <p>{hasStreamStarted ? "Parsing structure..." : "Initializing..."}</p>
              </div>
            )}

            {parseError && (
              <div className="p-4 border border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-200">
                <AlertCircle size={20} />
                <p>Could not auto-parse the outline. Please try again or wait for generation to complete.</p>
              </div>
            )}

            {slides.map((slide, index) => (
              <div key={slide.id} className="group bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-6 transition-all hover:border-slate-300 dark:hover:border-zinc-700 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-black/50">
                <div className="flex justify-between items-start mb-4 border-b border-slate-200 dark:border-zinc-800 pb-2">
                  <span className="text-xs font-mono text-zinc-500 bg-slate-100 dark:bg-zinc-950 px-2 py-1 rounded">SLIDE {index + 1}</span>
                  <button
                    onClick={() => deleteSlide(slide.id)}
                    className="text-zinc-400 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-zinc-500 uppercase font-semibold">Title</label>
                    <input
                      className="w-full bg-transparent text-xl font-bold text-zinc-800 dark:text-white border-b border-transparent focus:border-purple-500 outline-none py-1"
                      value={slide.title}
                      onChange={(e) => updateSlide(slide.id, 'title', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-zinc-500 uppercase font-semibold">Content</label>
                    <textarea
                      className="w-full bg-slate-50 dark:bg-zinc-950/50 rounded-lg text-zinc-600 dark:text-zinc-300 p-3 mt-1 text-sm outline-none border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 min-h-[80px]"
                      value={slide.content}
                      onChange={(e) => updateSlide(slide.id, 'content', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-zinc-500 uppercase font-semibold flex items-center gap-2">
                      Visual Prompt <span className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 px-1 rounded">AI</span>
                    </label>
                    <textarea
                      className="w-full bg-slate-50/50 dark:bg-zinc-950/30 rounded-lg text-zinc-500 dark:text-zinc-400 p-3 mt-1 text-xs outline-none border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 min-h-[60px] italic"
                      value={slide.visualDescription}
                      onChange={(e) => updateSlide(slide.id, 'visualDescription', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Generate Button Footer (Sticky) */}
            {slides.length > 0 && (
              <div className="fixed bottom-6 right-6 z-20">
                <button
                  onClick={() => onGenerateSlides(slides, selectedThemeId)}
                  disabled={isGenerating}
                  className="bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-700 dark:hover:bg-zinc-200 shadow-lg shadow-zinc-900/20 dark:shadow-purple-900/20 px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all transform hover:scale-105 disabled:opacity-50 disabled:scale-100"
                >
                  {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} fill="currentColor" />}
                  Generate Slides
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutlineEditor;