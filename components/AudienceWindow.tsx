import React, { useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';
import { Slide } from '../types';

interface AudienceWindowProps {
    slides: Slide[];
    initialIndex: number;
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

const AudienceWindow: React.FC<AudienceWindowProps> = ({ slides, initialIndex }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
    const [isFullscreen, setIsFullscreen] = useState(false);

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
        const scaleX = dimensions.width / CANVAS_WIDTH;
        const scaleY = dimensions.height / CANVAS_HEIGHT;
        return Math.min(scaleX, scaleY);
    }, [dimensions]);

    const scale = calculateScale();

    // Enter fullscreen
    const enterFullscreen = useCallback(() => {
        document.documentElement.requestFullscreen?.().then(() => {
            setIsFullscreen(true);
        }).catch(() => {
            // Fullscreen might be blocked
        });
    }, []);

    // Listen to BroadcastChannel for slide updates from presenter
    useEffect(() => {
        const channel = new BroadcastChannel('presentation-sync');

        channel.onmessage = (event) => {
            if (event.data.type === 'SLIDE_CHANGE') {
                setCurrentIndex(event.data.slideIndex);
            }
            if (event.data.type === 'END_PRESENTATION') {
                window.close();
            }
        };

        // Track fullscreen changes
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        // Try to enter fullscreen automatically (may fail without user gesture)
        enterFullscreen();

        return () => {
            channel.close();
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, [enterFullscreen]);

    // Resize handling
    useEffect(() => {
        const handleResize = () => {
            setDimensions({ width: window.innerWidth, height: window.innerHeight });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const objects = getCanvasObjects(currentSlide);

    return (
        <div
            className="fixed inset-0 bg-black flex items-center justify-center cursor-pointer"
            onClick={!isFullscreen ? enterFullscreen : undefined}
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

            {/* Fullscreen prompt - shown when not in fullscreen */}
            {!isFullscreen && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md rounded-full px-6 py-3 text-white text-sm animate-pulse">
                    Click anywhere to enter fullscreen
                </div>
            )}
        </div>
    );
};

export default AudienceWindow;
