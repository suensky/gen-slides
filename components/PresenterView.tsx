import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Stage, Layer, Rect, Text, Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';
import { ChevronLeft, ChevronRight, X, Clock, Monitor, MonitorOff, GripHorizontal } from 'lucide-react';
import { Slide } from '../types';
import { setActivePresentationSlides, clearActivePresentationSlides } from '../services/db';
import { useTheme } from '../contexts/ThemeContext';

interface PresenterViewProps {
    slides: Slide[];
    startIndex: number;
    onExit: () => void;
    onNotesChange?: (slideId: string, notes: string) => void;
}

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const LINE_HEIGHT = 1.4;

// Resizable notes configuration
const MIN_NOTES_HEIGHT = 80;
const MAX_NOTES_HEIGHT = 320;
const DEFAULT_NOTES_HEIGHT = 160;

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
const SlidePreview: React.FC<{ slide: Slide; scale: number; label?: string; isNext?: boolean; isDark?: boolean }> = ({ slide, scale, label, isNext, isDark = true }) => {
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
        <div
            className={`relative rounded-xl overflow-hidden shadow-2xl transition-all duration-200 ${isNext
                    ? isDark ? 'ring-1 ring-white/10' : 'ring-1 ring-black/10'
                    : 'ring-2 ring-violet-500/70'
                }`}
            style={{
                boxShadow: isDark
                    ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    : '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
        >
            {label && (
                <div
                    className={`absolute top-0 left-0 right-0 z-10 px-4 py-2 text-xs font-medium backdrop-blur-md ${isNext
                            ? isDark ? 'bg-white/5 text-white/70' : 'bg-black/5 text-black/70'
                            : 'bg-violet-500/90 text-white'
                        }`}
                >
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
    const { isDark } = useTheme();
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [localNotes, setLocalNotes] = useState<Record<string, string>>({});
    const [audienceWindowOpen, setAudienceWindowOpen] = useState(false);
    const [notesHeight, setNotesHeight] = useState(() => {
        const stored = localStorage.getItem('presenter-notes-height');
        return stored ? parseInt(stored, 10) : DEFAULT_NOTES_HEIGHT;
    });
    const [isResizing, setIsResizing] = useState(false);

    const channelRef = useRef<BroadcastChannel | null>(null);
    const audienceWindowRef = useRef<Window | null>(null);
    const startTimeRef = useRef(Date.now());
    const resizeStartY = useRef(0);
    const resizeStartHeight = useRef(0);

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

    // Resize handlers for speaker notes
    const handleResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        resizeStartY.current = e.clientY;
        resizeStartHeight.current = notesHeight;
    }, [notesHeight]);

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaY = resizeStartY.current - e.clientY;
            const newHeight = Math.min(MAX_NOTES_HEIGHT, Math.max(MIN_NOTES_HEIGHT, resizeStartHeight.current + deltaY));
            setNotesHeight(newHeight);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            localStorage.setItem('presenter-notes-height', notesHeight.toString());
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, notesHeight]);

    // Calculate scales for previews - larger sizes
    const currentSlideScale = 0.55;
    const nextSlideScale = 0.32;

    // Theme-aware colors
    const bgPrimary = isDark ? 'bg-zinc-900' : 'bg-gray-50';
    const bgSecondary = isDark ? 'bg-zinc-800/80' : 'bg-white/80';
    const bgTertiary = isDark ? 'bg-zinc-800' : 'bg-white';
    const borderColor = isDark ? 'border-white/10' : 'border-black/10';
    const textPrimary = isDark ? 'text-white' : 'text-gray-900';
    const textSecondary = isDark ? 'text-zinc-300' : 'text-gray-600';
    const textMuted = isDark ? 'text-zinc-500' : 'text-gray-400';

    return (
        <div className={`fixed inset-0 z-[9999] ${bgPrimary} flex flex-col`}>
            {/* Top Bar - Glassmorphism style */}
            <div className={`h-14 ${bgSecondary} backdrop-blur-xl border-b ${borderColor} flex items-center justify-between px-6`}>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-amber-500">
                        <Clock size={18} />
                        <span className="font-mono text-lg font-semibold tabular-nums">{formatTime(elapsedTime)}</span>
                    </div>
                </div>

                <div className={`${textPrimary} font-medium`}>
                    Slide <span className="text-violet-500 font-semibold">{currentIndex + 1}</span> of {slides.length}
                </div>

                <div className="flex items-center gap-4">
                    {audienceWindowOpen ? (
                        <div className="flex items-center gap-2 text-emerald-500 text-sm font-medium">
                            <Monitor size={16} />
                            <span>Audience window open</span>
                        </div>
                    ) : (
                        <button
                            onClick={openAudienceWindow}
                            className={`flex items-center gap-2 ${textMuted} hover:${textPrimary} text-sm transition-colors duration-200`}
                        >
                            <MonitorOff size={16} />
                            <span>Open audience window</span>
                        </button>
                    )}
                    <button
                        onClick={handleExit}
                        className="flex items-center gap-2 bg-red-500/90 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-lg shadow-red-500/20"
                    >
                        <X size={16} />
                        End Presentation
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden p-5 gap-5">
                {/* Left Column: Current Slide + Resizable Speaker Notes */}
                <div className="flex-1 flex flex-col gap-0 min-w-0">
                    {/* Current Slide Preview - Large and prominent */}
                    <div className="flex-1 flex items-center justify-center">
                        <SlidePreview
                            slide={currentSlide}
                            scale={currentSlideScale}
                            label={`Current Slide: ${currentSlide.title}`}
                            isDark={isDark}
                        />
                    </div>

                    {/* Resize Handle */}
                    <div
                        className={`h-6 flex items-center justify-center cursor-ns-resize group transition-colors duration-200 ${isResizing ? (isDark ? 'bg-violet-500/20' : 'bg-violet-500/10') : ''
                            }`}
                        onMouseDown={handleResizeStart}
                    >
                        <div className={`flex items-center gap-1 px-4 py-1 rounded-full ${isDark ? 'bg-zinc-700/50 group-hover:bg-zinc-600/50' : 'bg-gray-200/50 group-hover:bg-gray-300/50'} transition-colors duration-200`}>
                            <GripHorizontal size={14} className={textMuted} />
                        </div>
                    </div>

                    {/* Speaker Notes - Resizable */}
                    <div
                        className={`${bgTertiary} rounded-xl border ${borderColor} flex flex-col overflow-hidden backdrop-blur-sm`}
                        style={{ height: notesHeight }}
                    >
                        <div className={`px-4 py-2 border-b ${borderColor} flex items-center justify-between shrink-0`}>
                            <span className={`text-sm font-medium ${textSecondary}`}>Speaker Notes</span>
                            <span className={`text-xs ${textMuted}`}>✓ Not visible to audience</span>
                        </div>
                        <textarea
                            value={localNotes[currentSlide.id] || ''}
                            onChange={(e) => handleNotesChange(e.target.value)}
                            placeholder="Add your speaker notes here..."
                            className={`flex-1 bg-transparent ${textPrimary} p-4 resize-none focus:outline-none text-sm leading-relaxed placeholder:${textMuted}`}
                        />
                    </div>
                </div>

                {/* Right Column: Next Slide + Keyboard Shortcuts */}
                <div className="w-[360px] flex flex-col gap-4 shrink-0">
                    {/* Next Slide - Larger preview */}
                    <div className="flex flex-col">
                        <h3 className={`${textMuted} text-sm font-medium mb-3`}>Up Next</h3>
                        {nextSlide ? (
                            <SlidePreview
                                slide={nextSlide}
                                scale={nextSlideScale}
                                isNext
                                isDark={isDark}
                            />
                        ) : (
                            <div className={`h-44 rounded-xl ${bgTertiary} border ${borderColor} flex items-center justify-center`}>
                                <span className={`${textMuted} text-sm`}>End of presentation</span>
                            </div>
                        )}
                    </div>

                    {/* Spacer to push shortcuts down */}
                    <div className="flex-1" />

                    {/* Keyboard Shortcuts - Compact and elegant */}
                    <div className={`${bgTertiary} rounded-xl border ${borderColor} p-4 backdrop-blur-sm`}>
                        <h4 className={`text-xs font-medium ${textMuted} mb-3 uppercase tracking-wider`}>Shortcuts</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                                <span className={textSecondary}>Next slide</span>
                                <div className="flex gap-1">
                                    <kbd className={`px-2 py-0.5 rounded ${isDark ? 'bg-zinc-700' : 'bg-gray-100'} ${textMuted} text-xs font-mono`}>→</kbd>
                                    <kbd className={`px-2 py-0.5 rounded ${isDark ? 'bg-zinc-700' : 'bg-gray-100'} ${textMuted} text-xs font-mono`}>Space</kbd>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className={textSecondary}>Previous slide</span>
                                <kbd className={`px-2 py-0.5 rounded ${isDark ? 'bg-zinc-700' : 'bg-gray-100'} ${textMuted} text-xs font-mono`}>←</kbd>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className={textSecondary}>End</span>
                                <kbd className={`px-2 py-0.5 rounded ${isDark ? 'bg-zinc-700' : 'bg-gray-100'} ${textMuted} text-xs font-mono`}>Esc</kbd>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Navigation - Refined */}
            <div className={`h-20 ${bgSecondary} backdrop-blur-xl border-t ${borderColor} flex items-center justify-center gap-6`}>
                <button
                    onClick={goToPrevious}
                    disabled={currentIndex === 0}
                    className={`flex items-center gap-2 ${isDark ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-gray-200 hover:bg-gray-300'} disabled:opacity-30 disabled:cursor-not-allowed ${textPrimary} px-6 py-3 rounded-xl font-medium transition-all duration-200`}
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
                            className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${idx === currentIndex
                                ? 'bg-violet-500 scale-125'
                                : idx < currentIndex
                                    ? 'bg-violet-500/40'
                                    : isDark ? 'bg-zinc-600 hover:bg-zinc-500' : 'bg-gray-300 hover:bg-gray-400'
                                }`}
                        />
                    ))}
                </div>

                <button
                    onClick={goToNext}
                    disabled={currentIndex === slides.length - 1}
                    className="flex items-center gap-2 bg-violet-500 hover:bg-violet-400 disabled:opacity-30 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg shadow-violet-500/25"
                >
                    Next
                    <ChevronRight size={20} />
                </button>
            </div>
        </div>
    );
};

export default PresenterView;
