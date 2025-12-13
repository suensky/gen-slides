import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Stage, Layer, Rect, Text, Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';
import { ChevronLeft, ChevronRight, X, Clock, Monitor, MonitorOff } from 'lucide-react';
import { Slide } from '../types';
import { setActivePresentationSlides, clearActivePresentationSlides } from '../services/db';

interface PresenterViewProps {
    slides: Slide[];
    startIndex: number;
    onExit: () => void;
    onNotesChange?: (slideId: string, notes: string) => void;
}

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const LINE_HEIGHT = 1.4;

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

// Background image component
const BackgroundImageLayer = React.memo(({ base64, width, height }: { base64?: string; width: number; height: number }) => {
    const [image] = useImage(base64 ? `data:image/png;base64,${base64}` : '', 'anonymous');

    if (!image) {
        return <Rect x={0} y={0} width={width} height={height} fill="#1a1a1a" />;
    }

    const scale = Math.max(width / image.width, height / image.height);

    return (
        <>
            <KonvaImage
                image={image}
                x={0}
                y={0}
                width={image.width * scale}
                height={image.height * scale}
                opacity={0.85}
            />
            <Rect
                x={0}
                y={0}
                width={width}
                height={height}
                fill="black"
                opacity={0.35}
            />
        </>
    );
});

// Helper function to get layout-specific canvas objects
const getLayoutObjects = (layout: string, title: string, content: string): CanvasObject[] => {
    const padding = CANVAS_WIDTH * 0.08;
    const contentWidth = CANVAS_WIDTH * 0.84;
    const halfWidth = CANVAS_WIDTH * 0.42;

    switch (layout) {
        case 'left':
            return [
                { id: 'title-obj', type: 'text', text: title, x: padding, y: CANVAS_HEIGHT * 0.22, width: contentWidth, fontSize: 52, fill: '#ffffff', align: 'left', fontStyle: 'bold', field: 'title' },
                { id: 'content-obj', type: 'text', text: content, x: padding, y: CANVAS_HEIGHT * 0.40, width: contentWidth * 0.7, fontSize: 26, fill: '#ffffff', align: 'left', field: 'content' }
            ];
        case 'right':
            return [
                { id: 'title-obj', type: 'text', text: title, x: padding, y: CANVAS_HEIGHT * 0.22, width: contentWidth, fontSize: 52, fill: '#ffffff', align: 'right', fontStyle: 'bold', field: 'title' },
                { id: 'content-obj', type: 'text', text: content, x: CANVAS_WIDTH * 0.38, y: CANVAS_HEIGHT * 0.40, width: contentWidth * 0.7, fontSize: 26, fill: '#ffffff', align: 'right', field: 'content' }
            ];
        case 'center':
        default:
            return [
                { id: 'title-obj', type: 'text', text: title, x: 0, y: CANVAS_HEIGHT * 0.35, width: CANVAS_WIDTH, fontSize: 56, fill: '#ffffff', align: 'center', fontStyle: 'bold', field: 'title' },
                { id: 'content-obj', type: 'text', text: content, x: CANVAS_WIDTH * 0.1, y: CANVAS_HEIGHT * 0.52, width: CANVAS_WIDTH * 0.8, fontSize: 26, fill: '#ffffff', align: 'center', field: 'content' }
            ];
    }
};

// Slide Preview Component
const SlidePreview: React.FC<{ slide: Slide; scale: number; label?: string; isNext?: boolean }> = ({ slide, scale, label, isNext }) => {
    const getCanvasObjects = (s: Slide): CanvasObject[] => {
        if (s.customCanvasJson) {
            try {
                return JSON.parse(s.customCanvasJson);
            } catch {
                return getLayoutObjects(s.layout || 'center', s.title, s.content);
            }
        }
        return getLayoutObjects(s.layout || 'center', s.title, s.content);
    };

    const objects = getCanvasObjects(slide);

    return (
        <div className={`relative rounded-lg overflow-hidden border-2 ${isNext ? 'border-zinc-600' : 'border-violet-500'} shadow-2xl`}>
            {label && (
                <div className={`absolute top-0 left-0 right-0 z-10 px-3 py-1.5 text-xs font-semibold ${isNext ? 'bg-zinc-700 text-zinc-300' : 'bg-violet-600 text-white'}`}>
                    {label}
                </div>
            )}
            <Stage
                width={CANVAS_WIDTH * scale}
                height={CANVAS_HEIGHT * scale}
                scaleX={scale}
                scaleY={scale}
            >
                <Layer>
                    <BackgroundImageLayer
                        base64={slide.imageBase64}
                        width={CANVAS_WIDTH}
                        height={CANVAS_HEIGHT}
                    />
                </Layer>
                <Layer>
                    {objects.map((obj) => {
                        if (obj.type === 'text') {
                            return (
                                <Text
                                    key={obj.id}
                                    text={obj.text}
                                    x={obj.x}
                                    y={obj.y}
                                    width={obj.width}
                                    fontSize={obj.fontSize}
                                    fill={obj.fill}
                                    fontStyle={obj.fontStyle}
                                    textDecoration={obj.textDecoration}
                                    align={obj.align}
                                    fontFamily="Arial, sans-serif"
                                    lineHeight={LINE_HEIGHT}
                                    shadowColor="black"
                                    shadowBlur={4}
                                    shadowOpacity={0.8}
                                    shadowOffsetX={1}
                                    shadowOffsetY={1}
                                />
                            );
                        } else if (obj.type === 'rect') {
                            return (
                                <Rect
                                    key={obj.id}
                                    x={obj.x}
                                    y={obj.y}
                                    width={obj.width}
                                    height={obj.height}
                                    fill={obj.fill}
                                />
                            );
                        }
                        return null;
                    })}
                </Layer>
            </Stage>
        </div>
    );
};

const PresenterView: React.FC<PresenterViewProps> = ({ slides, startIndex, onExit, onNotesChange }) => {
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [localNotes, setLocalNotes] = useState<Record<string, string>>({});
    const [audienceWindowOpen, setAudienceWindowOpen] = useState(false);

    const channelRef = useRef<BroadcastChannel | null>(null);
    const audienceWindowRef = useRef<Window | null>(null);
    const startTimeRef = useRef(Date.now());

    const currentSlide = slides[currentIndex];
    const nextSlide = currentIndex < slides.length - 1 ? slides[currentIndex + 1] : null;

    // Initialize notes from slides
    useEffect(() => {
        const notes: Record<string, string> = {};
        slides.forEach(s => {
            notes[s.id] = s.speakerNotes || '';
        });
        setLocalNotes(notes);
    }, [slides]);

    // BroadcastChannel setup
    useEffect(() => {
        channelRef.current = new BroadcastChannel('presentation-sync');

        return () => {
            channelRef.current?.close();
        };
    }, []);

    // Sync slide changes to audience window
    useEffect(() => {
        channelRef.current?.postMessage({ type: 'SLIDE_CHANGE', slideIndex: currentIndex });
    }, [currentIndex]);

    // Open audience window
    const openAudienceWindow = useCallback(async () => {
        // Store slides in IndexedDB for the audience window to read (handles large data)
        try {
            await setActivePresentationSlides(slides);
        } catch (e) {
            console.error('Failed to store slides for audience window:', e);
        }

        // Create URL for audience mode
        const audienceUrl = `${window.location.origin}${window.location.pathname}?mode=audience&startIndex=${currentIndex}`;

        // Try to open on second screen if available
        const width = 1280;
        const height = 720;
        const left = window.screen.availWidth; // Position to the right (second monitor)

        audienceWindowRef.current = window.open(
            audienceUrl,
            'audience-window',
            `width=${width},height=${height},left=${left},top=0,menubar=no,toolbar=no,location=no,status=no`
        );

        if (audienceWindowRef.current) {
            setAudienceWindowOpen(true);

            // Check if window was closed
            const checkWindow = setInterval(() => {
                if (audienceWindowRef.current?.closed) {
                    setAudienceWindowOpen(false);
                    clearInterval(checkWindow);
                }
            }, 1000);
        }
    }, [currentIndex, slides]);

    // Auto-open audience window on mount
    useEffect(() => {
        openAudienceWindow();
    }, []);

    // Timer
    useEffect(() => {
        const timer = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Format time as MM:SS
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Navigation
    const goToPrevious = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(c => c - 1);
        }
    }, [currentIndex]);

    const goToNext = useCallback(() => {
        if (currentIndex < slides.length - 1) {
            setCurrentIndex(c => c + 1);
        }
    }, [currentIndex, slides.length]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't navigate if typing in textarea
            if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;

            switch (e.key) {
                case 'ArrowLeft':
                case 'ArrowUp':
                case 'PageUp':
                    e.preventDefault();
                    goToPrevious();
                    break;
                case 'ArrowRight':
                case 'ArrowDown':
                case 'PageDown':
                case ' ':
                    e.preventDefault();
                    goToNext();
                    break;
                case 'Escape':
                    e.preventDefault();
                    handleExit();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [goToPrevious, goToNext]);

    // Handle notes change
    const handleNotesChange = (notes: string) => {
        setLocalNotes(prev => ({ ...prev, [currentSlide.id]: notes }));
        onNotesChange?.(currentSlide.id, notes);
    };

    // Exit presentation
    const handleExit = async () => {
        channelRef.current?.postMessage({ type: 'END_PRESENTATION' });
        audienceWindowRef.current?.close();
        // Clean up stored slides from IndexedDB
        try {
            await clearActivePresentationSlides();
        } catch (e) {
            console.error('Failed to clear presentation slides:', e);
        }
        onExit();
    };

    // Calculate scales for previews
    const currentSlideScale = 0.45;
    const nextSlideScale = 0.25;

    return (
        <div className="fixed inset-0 z-[9999] bg-zinc-900 flex flex-col">
            {/* Top Bar */}
            <div className="h-14 bg-zinc-800 border-b border-zinc-700 flex items-center justify-between px-6">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-amber-400">
                        <Clock size={18} />
                        <span className="font-mono text-lg font-semibold">{formatTime(elapsedTime)}</span>
                    </div>
                </div>

                <div className="text-white font-medium">
                    Slide <span className="text-violet-400">{currentIndex + 1}</span> of {slides.length}
                </div>

                <div className="flex items-center gap-3">
                    {audienceWindowOpen ? (
                        <div className="flex items-center gap-2 text-green-400 text-sm">
                            <Monitor size={16} />
                            <span>Audience window open</span>
                        </div>
                    ) : (
                        <button
                            onClick={openAudienceWindow}
                            className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm transition"
                        >
                            <MonitorOff size={16} />
                            <span>Open audience window</span>
                        </button>
                    )}
                    <button
                        onClick={handleExit}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                    >
                        <X size={16} />
                        End Presentation
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden p-4 gap-4">
                {/* Left: Current Slide + Speaker Notes (side by side) */}
                <div className="flex-1 flex gap-4">
                    {/* Current Slide Preview */}
                    <div className="flex-1 flex items-center justify-center">
                        <SlidePreview
                            slide={currentSlide}
                            scale={currentSlideScale}
                            label={`Current Slide: ${currentSlide.title}`}
                        />
                    </div>

                    {/* Speaker Notes - Next to current slide */}
                    <div className="w-80 bg-zinc-800 rounded-lg border border-zinc-700 flex flex-col">
                        <div className="px-4 py-2 border-b border-zinc-700 flex items-center justify-between">
                            <span className="text-sm font-semibold text-zinc-300">Speaker Notes</span>
                        </div>
                        <textarea
                            value={localNotes[currentSlide.id] || ''}
                            onChange={(e) => handleNotesChange(e.target.value)}
                            placeholder="Add your speaker notes here...&#10;&#10;These notes are only visible to you, not the audience."
                            className="flex-1 bg-transparent text-zinc-100 p-4 resize-none focus:outline-none text-sm leading-relaxed placeholder:text-zinc-600"
                        />
                        <div className="px-4 py-2 border-t border-zinc-700">
                            <span className="text-xs text-zinc-500">✓ Not visible to audience</span>
                        </div>
                    </div>
                </div>

                {/* Right: Next Slide + Info */}
                <div className="w-72 flex flex-col gap-4">
                    {/* Next Slide */}
                    <div className="flex-1 flex flex-col">
                        <h3 className="text-zinc-400 text-sm font-medium mb-2">Up Next</h3>
                        {nextSlide ? (
                            <SlidePreview
                                slide={nextSlide}
                                scale={nextSlideScale}
                                isNext
                            />
                        ) : (
                            <div className="h-40 rounded-lg bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center">
                                <span className="text-zinc-500 text-sm">End of presentation</span>
                            </div>
                        )}
                    </div>

                    {/* Quick Info */}
                    <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-4">
                        <h4 className="text-sm font-semibold text-zinc-300 mb-2">Keyboard Shortcuts</h4>
                        <div className="space-y-1 text-xs text-zinc-400">
                            <div className="flex justify-between">
                                <span>Next slide</span>
                                <span className="text-zinc-500">→ / Space</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Previous slide</span>
                                <span className="text-zinc-500">← / ↑</span>
                            </div>
                            <div className="flex justify-between">
                                <span>End presentation</span>
                                <span className="text-zinc-500">Esc</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Navigation */}
            <div className="h-20 bg-zinc-800 border-t border-zinc-700 flex items-center justify-center gap-6">
                <button
                    onClick={goToPrevious}
                    disabled={currentIndex === 0}
                    className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-30 disabled:hover:bg-zinc-700 text-white px-6 py-3 rounded-lg font-semibold transition"
                >
                    <ChevronLeft size={20} />
                    Previous
                </button>

                {/* Slide Dots */}
                <div className="flex items-center gap-1.5">
                    {slides.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={`w-2.5 h-2.5 rounded-full transition ${idx === currentIndex
                                ? 'bg-violet-500 scale-125'
                                : idx < currentIndex
                                    ? 'bg-violet-400/50'
                                    : 'bg-zinc-600 hover:bg-zinc-500'
                                }`}
                        />
                    ))}
                </div>

                <button
                    onClick={goToNext}
                    disabled={currentIndex === slides.length - 1}
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:hover:bg-violet-600 text-white px-6 py-3 rounded-lg font-semibold transition"
                >
                    Next
                    <ChevronRight size={20} />
                </button>
            </div>
        </div>
    );
};

export default PresenterView;
