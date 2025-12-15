import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Maximize, Minimize } from 'lucide-react';
import { Stage, Layer, Rect, Text, Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';
import { Slide } from '../types';
import PresenterView from './PresenterView';

interface PresentationModeProps {
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
        return <Rect x={0} y={0} width={width} height={height} fill="#000000" />;
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
        case 'top':
            return [
                { id: 'title-obj', type: 'text', text: title, x: padding, y: CANVAS_HEIGHT * 0.10, width: contentWidth, fontSize: 48, fill: '#ffffff', align: 'left', fontStyle: 'bold', field: 'title' },
                { id: 'content-obj', type: 'text', text: content, x: padding, y: CANVAS_HEIGHT * 0.25, width: contentWidth, fontSize: 24, fill: '#ffffff', align: 'left', field: 'content' }
            ];
        case 'bottom':
            return [
                { id: 'title-obj', type: 'text', text: title, x: padding, y: CANVAS_HEIGHT * 0.60, width: contentWidth, fontSize: 56, fill: '#ffffff', align: 'center', fontStyle: 'bold', field: 'title' },
                { id: 'content-obj', type: 'text', text: content, x: padding, y: CANVAS_HEIGHT * 0.78, width: contentWidth, fontSize: 24, fill: '#ffffff', align: 'center', field: 'content' }
            ];
        case 'split-left':
            return [
                { id: 'title-obj', type: 'text', text: title, x: padding, y: CANVAS_HEIGHT * 0.35, width: halfWidth - padding, fontSize: 44, fill: '#ffffff', align: 'left', fontStyle: 'bold', field: 'title' },
                { id: 'content-obj', type: 'text', text: content, x: CANVAS_WIDTH * 0.52, y: CANVAS_HEIGHT * 0.25, width: halfWidth - padding, fontSize: 24, fill: '#ffffff', align: 'left', field: 'content' }
            ];
        case 'split-right':
            return [
                { id: 'title-obj', type: 'text', text: title, x: CANVAS_WIDTH * 0.52, y: CANVAS_HEIGHT * 0.35, width: halfWidth - padding, fontSize: 44, fill: '#ffffff', align: 'right', fontStyle: 'bold', field: 'title' },
                { id: 'content-obj', type: 'text', text: content, x: padding, y: CANVAS_HEIGHT * 0.25, width: halfWidth - padding, fontSize: 24, fill: '#ffffff', align: 'left', field: 'content' }
            ];
        case 'diagonal':
            return [
                { id: 'title-obj', type: 'text', text: title, x: padding, y: CANVAS_HEIGHT * 0.12, width: contentWidth * 0.65, fontSize: 48, fill: '#ffffff', align: 'left', fontStyle: 'bold', field: 'title' },
                { id: 'content-obj', type: 'text', text: content, x: CANVAS_WIDTH * 0.35, y: CANVAS_HEIGHT * 0.58, width: contentWidth * 0.60, fontSize: 24, fill: '#ffffff', align: 'right', field: 'content' }
            ];
        case 'scattered':
            return [
                { id: 'title-obj', type: 'text', text: title, x: padding, y: CANVAS_HEIGHT * 0.08, width: contentWidth * 0.55, fontSize: 42, fill: '#ffffff', align: 'left', fontStyle: 'bold', field: 'title' },
                { id: 'content-obj', type: 'text', text: content, x: CANVAS_WIDTH * 0.45, y: CANVAS_HEIGHT * 0.68, width: contentWidth * 0.52, fontSize: 22, fill: '#ffffff', align: 'right', field: 'content' }
            ];
        case 'center':
        default:
            return [
                { id: 'title-obj', type: 'text', text: title, x: 0, y: CANVAS_HEIGHT * 0.35, width: CANVAS_WIDTH, fontSize: 56, fill: '#ffffff', align: 'center', fontStyle: 'bold', field: 'title' },
                { id: 'content-obj', type: 'text', text: content, x: CANVAS_WIDTH * 0.1, y: CANVAS_HEIGHT * 0.52, width: CANVAS_WIDTH * 0.8, fontSize: 26, fill: '#ffffff', align: 'center', field: 'content' }
            ];
    }
};

// Detect if multiple screens are available - synchronous fallback
const detectMultipleScreens = (): boolean => {
    try {
        // Method 1: Check if screen.isExtended is available (newer browsers)
        // @ts-ignore
        if (typeof window.screen.isExtended === 'boolean') {
            // @ts-ignore
            return window.screen.isExtended;
        }

        // Method 2: Heuristic - check if screen size suggests multiple monitors
        const screenWidth = window.screen.availWidth;
        const screenHeight = window.screen.availHeight;

        // If we have a very wide screen ratio (> 2.5:1), likely multiple monitors
        if (screenWidth / screenHeight > 2.5) {
            return true;
        }

        // Default to single screen mode for reliability
        return false;
    } catch (e) {
        console.error('Error detecting screens:', e);
        return false;
    }
};

// Single Screen Fullscreen Mode Component
const SingleScreenMode: React.FC<{
    slides: Slide[];
    startIndex: number;
    onExit: () => void;
}> = ({ slides, startIndex, onExit }) => {
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
    const [isTransitioning, setIsTransitioning] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

    const currentSlide = slides[currentIndex];

    // Get canvas objects for current slide
    const getCanvasObjects = useCallback((slide: Slide): CanvasObject[] => {
        if (slide.customCanvasJson) {
            try {
                return JSON.parse(slide.customCanvasJson);
            } catch {
                return getLayoutObjects(slide.layout || 'center', slide.title, slide.content);
            }
        }
        return getLayoutObjects(slide.layout || 'center', slide.title, slide.content);
    }, []);

    // Calculate scale to fit slide in viewport
    const calculateScale = useCallback(() => {
        const availableWidth = dimensions.width;
        const availableHeight = dimensions.height;
        const scaleX = availableWidth / CANVAS_WIDTH;
        const scaleY = availableHeight / CANVAS_HEIGHT;
        return Math.min(scaleX, scaleY);
    }, [dimensions]);

    const scale = calculateScale();

    // Navigation functions
    const goToPrevious = useCallback(() => {
        if (currentIndex > 0 && !isTransitioning) {
            setIsTransitioning(true);
            setTimeout(() => {
                setCurrentIndex(c => c - 1);
                setIsTransitioning(false);
            }, 150);
        }
    }, [currentIndex, isTransitioning]);

    const goToNext = useCallback(() => {
        if (currentIndex < slides.length - 1 && !isTransitioning) {
            setIsTransitioning(true);
            setTimeout(() => {
                setCurrentIndex(c => c + 1);
                setIsTransitioning(false);
            }, 150);
        }
    }, [currentIndex, slides.length, isTransitioning]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
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
                    onExit();
                    break;
                case 'f':
                case 'F':
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case 'Home':
                    e.preventDefault();
                    setCurrentIndex(0);
                    break;
                case 'End':
                    e.preventDefault();
                    setCurrentIndex(slides.length - 1);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [goToPrevious, goToNext, onExit, slides.length]);

    // Fullscreen handling
    const toggleFullscreen = useCallback(async () => {
        if (!document.fullscreenElement) {
            try {
                await containerRef.current?.requestFullscreen();
                setIsFullscreen(true);
            } catch (err) {
                console.error('Failed to enter fullscreen:', err);
            }
        } else {
            await document.exitFullscreen();
            setIsFullscreen(false);
        }
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Auto-enter fullscreen on mount
    useEffect(() => {
        toggleFullscreen();
    }, []);

    // Resize handling
    useEffect(() => {
        const handleResize = () => {
            setDimensions({ width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Auto-hide controls
    const resetControlsTimer = useCallback(() => {
        setShowControls(true);
        if (hideControlsTimer.current) {
            clearTimeout(hideControlsTimer.current);
        }
        hideControlsTimer.current = setTimeout(() => {
            setShowControls(false);
        }, 3000);
    }, []);

    useEffect(() => {
        resetControlsTimer();
        return () => {
            if (hideControlsTimer.current) {
                clearTimeout(hideControlsTimer.current);
            }
        };
    }, []);

    const handleMouseMove = useCallback(() => {
        resetControlsTimer();
    }, [resetControlsTimer]);

    // Click zones for navigation
    const handleContainerClick = useCallback((e: React.MouseEvent) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const zoneWidth = rect.width * 0.15;

        if (clickX < zoneWidth) {
            goToPrevious();
        } else if (clickX > rect.width - zoneWidth) {
            goToNext();
        }
    }, [goToPrevious, goToNext]);

    const objects = getCanvasObjects(currentSlide);

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-[9999] bg-black flex items-center justify-center cursor-none"
            onMouseMove={handleMouseMove}
            onClick={handleContainerClick}
            style={{ cursor: showControls ? 'default' : 'none' }}
        >
            {/* Slide Content */}
            <div
                className={`transition-opacity duration-150 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
                style={{
                    width: CANVAS_WIDTH * scale,
                    height: CANVAS_HEIGHT * scale,
                }}
            >
                <Stage
                    width={CANVAS_WIDTH * scale}
                    height={CANVAS_HEIGHT * scale}
                    scaleX={scale}
                    scaleY={scale}
                >
                    <Layer>
                        <BackgroundImageLayer
                            base64={currentSlide.imageBase64}
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
                                        shadowBlur={8}
                                        shadowOpacity={0.8}
                                        shadowOffsetX={2}
                                        shadowOffsetY={2}
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

            {/* Slide Counter */}
            <div
                className={`absolute bottom-6 right-6 text-white/60 font-mono text-sm transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
            >
                {currentIndex + 1} / {slides.length}
            </div>

            {/* Navigation Zones */}
            <div
                className={`absolute left-0 top-0 bottom-0 w-[15%] flex items-center justify-start pl-4 transition-opacity duration-300 ${showControls && currentIndex > 0 ? 'opacity-100' : 'opacity-0'}`}
                onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
            >
                <div className="p-3 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition cursor-pointer">
                    <ChevronLeft size={32} className="text-white" />
                </div>
            </div>

            <div
                className={`absolute right-0 top-0 bottom-0 w-[15%] flex items-center justify-end pr-4 transition-opacity duration-300 ${showControls && currentIndex < slides.length - 1 ? 'opacity-100' : 'opacity-0'}`}
                onClick={(e) => { e.stopPropagation(); goToNext(); }}
            >
                <div className="p-3 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition cursor-pointer">
                    <ChevronRight size={32} className="text-white" />
                </div>
            </div>

            {/* Control Bar */}
            <div
                className={`absolute bottom-0 left-0 right-0 flex items-center justify-center py-4 px-6 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
            >
                <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-full px-6 py-3">
                    <button
                        onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
                        disabled={currentIndex === 0}
                        className="p-2 rounded-full hover:bg-white/20 transition disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                        <ChevronLeft size={24} className="text-white" />
                    </button>

                    <span className="text-white font-medium min-w-[80px] text-center">
                        {currentIndex + 1} / {slides.length}
                    </span>

                    <button
                        onClick={(e) => { e.stopPropagation(); goToNext(); }}
                        disabled={currentIndex === slides.length - 1}
                        className="p-2 rounded-full hover:bg-white/20 transition disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                        <ChevronRight size={24} className="text-white" />
                    </button>

                    <div className="w-px h-6 bg-white/30 mx-2" />

                    <button
                        onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                        className="p-2 rounded-full hover:bg-white/20 transition"
                        title={isFullscreen ? 'Exit Fullscreen (F)' : 'Enter Fullscreen (F)'}
                    >
                        {isFullscreen ? (
                            <Minimize size={20} className="text-white" />
                        ) : (
                            <Maximize size={20} className="text-white" />
                        )}
                    </button>

                    <button
                        onClick={(e) => { e.stopPropagation(); onExit(); }}
                        className="p-2 rounded-full hover:bg-white/20 transition"
                        title="Exit Presentation (Esc)"
                    >
                        <X size={20} className="text-white" />
                    </button>
                </div>
            </div>

            {/* Keyboard shortcuts hint */}
            <div className={`absolute top-6 left-1/2 -translate-x-1/2 text-white/40 text-xs font-mono transition-opacity duration-1000 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                ← → Navigate • Space Next • Esc Exit • F Fullscreen
            </div>
        </div>
    );
};

const PresentationMode: React.FC<PresentationModeProps> = ({ slides, startIndex, onExit, onNotesChange }) => {
    const [mode, setMode] = useState<'choosing' | 'single' | 'presenter'>('choosing');

    // Mode selection screen
    if (mode === 'choosing') {
        return (
            <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center">
                <div className="bg-zinc-900 rounded-2xl p-8 max-w-lg w-full mx-4 border border-zinc-700">
                    <h2 className="text-2xl font-bold text-white mb-2">Start Presentation</h2>
                    <p className="text-zinc-400 mb-6">Choose how you'd like to present:</p>

                    <div className="space-y-4">
                        {/* Single Screen Option */}
                        <button
                            onClick={() => setMode('single')}
                            className="w-full p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 transition text-left group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-violet-600 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <rect x="2" y="3" width="20" height="14" rx="2" strokeWidth="2" />
                                        <path d="M8 21h8M12 17v4" strokeWidth="2" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold text-white group-hover:text-violet-300">Single Screen</div>
                                    <div className="text-sm text-zinc-400">Fullscreen presentation on this monitor</div>
                                </div>
                            </div>
                        </button>

                        {/* Presenter View Option */}
                        <button
                            onClick={() => setMode('presenter')}
                            className="w-full p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 transition text-left group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-indigo-600 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <rect x="1" y="4" width="10" height="7" rx="1" strokeWidth="2" />
                                        <rect x="13" y="4" width="10" height="7" rx="1" strokeWidth="2" />
                                        <path d="M6 15v4M18 15v4M3 19h6M15 19h6" strokeWidth="2" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold text-white group-hover:text-indigo-300">Presenter View</div>
                                    <div className="text-sm text-zinc-400">See notes & next slide while audience sees fullscreen</div>
                                </div>
                            </div>
                        </button>
                    </div>

                    <button
                        onClick={onExit}
                        className="mt-6 w-full py-2 text-zinc-400 hover:text-white transition text-sm"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    // Dual-screen presenter mode
    if (mode === 'presenter') {
        return (
            <PresenterView
                slides={slides}
                startIndex={startIndex}
                onExit={onExit}
                onNotesChange={onNotesChange}
            />
        );
    }

    // Single screen fullscreen mode
    return (
        <SingleScreenMode
            slides={slides}
            startIndex={startIndex}
            onExit={onExit}
        />
    );
};

export default PresentationMode;
