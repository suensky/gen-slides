import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    ChevronLeft, ChevronRight, Square, RefreshCw, Trash2, MousePointer2,
    Loader2, AlertCircle, Undo, Redo, Type, Bold, Italic, Underline,
    Palette, Plus, Minus, AlignLeft, AlignCenter, AlignRight, Sparkles, Wand2, ChevronDown
} from 'lucide-react';
import { Stage, Layer, Rect, Text, Image as KonvaImage, Transformer } from 'react-konva';
import useImage from 'use-image';
import Konva from 'konva';
import { Slide } from '../types';
import { enhanceSpeakerNotes } from '../services/geminiService';

interface SlideViewerProps {
    slide: Slide;
    isFirst: boolean;
    isLast: boolean;
    onPrev: () => void;
    onNext: () => void;
    onDelete: () => void;
    onStopGeneration: () => void;
    onRetry: () => void;
    onIgnore: () => void;
    onOpenRegenerateModal: () => void;
    onTextChange: (field: 'title' | 'content' | 'speakerNotes', value: string) => void;
    onCanvasChange: (json: string) => void;
    onTextBlur: () => void;
}

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const LINE_HEIGHT = 1.4;

// Internal State for Canvas Objects
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
    fontStyle?: string; // 'bold' | 'italic' | 'italic bold' | 'normal'
    textDecoration?: string; // 'underline' | ''
    align?: 'left' | 'center' | 'right';
    field?: 'title' | 'content'; // To link back to slide data
}

// Separate component for Background Image to use useImage hook cleanly
// Memoized to prevent unnecessary re-fetching/decoding of base64 data
const BackgroundImageLayer = React.memo(({ base64 }: { base64?: string }) => {
    const [image] = useImage(base64 ? `data:image/png;base64,${base64}` : '', 'anonymous');

    if (!image) {
        // Placeholder dark background
        return <Rect x={0} y={0} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="#000000" name="background" />;
    }

    // Cover logic
    const scale = Math.max(CANVAS_WIDTH / image.width, CANVAS_HEIGHT / image.height);

    return (
        <>
            <KonvaImage
                image={image}
                x={0}
                y={0}
                width={image.width * scale}
                height={image.height * scale}
                opacity={0.8}
                name="background"
            />
            <Rect
                x={0}
                y={0}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                fill="black"
                opacity={0.4}
                name="background"
            />
        </>
    );
});

const SlideViewer: React.FC<SlideViewerProps> = ({
    slide,
    isFirst,
    isLast,
    onPrev,
    onNext,
    onDelete,
    onStopGeneration,
    onRetry,
    onIgnore,
    onOpenRegenerateModal,
    onTextChange,
    onCanvasChange,
    onTextBlur
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<Konva.Stage>(null);
    const transformerRef = useRef<Konva.Transformer>(null);

    // Layout State
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 }); // To center stage in container

    // Canvas Objects State
    const [objects, setObjects] = useState<CanvasObject[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Text Editing State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [editAreaStyle, setEditAreaStyle] = useState<React.CSSProperties | null>(null);

    // Undo/Redo
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Speaker Notes AI State
    const [showAiDropdown, setShowAiDropdown] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const aiDropdownRef = useRef<HTMLDivElement>(null);

    // AI Enhance Handler
    const handleEnhanceNotes = async (mode: 'enhance' | 'simplify' | 'natural' | 'translate', lang?: string) => {
        if (!slide.speakerNotes?.trim()) return;
        setIsEnhancing(true);
        setShowAiDropdown(false);
        try {
            const enhanced = await enhanceSpeakerNotes(slide.speakerNotes, mode, lang);
            onTextChange('speakerNotes', enhanced);
            // We need to trigger a save, similar to blur. 
            // Since this is async, we can just call onTextBlur after update.
            // Using setTimeout to ensure state update propagates if needed, though react state batching might handle it.
            setTimeout(() => onTextBlur(), 100);
        } catch (e) {
            console.error("Failed to enhance notes", e);
            alert("Failed to enhance notes. Please try again.");
        } finally {
            setIsEnhancing(false);
        }
    };

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (aiDropdownRef.current && !aiDropdownRef.current.contains(event.target as Node)) {
                setShowAiDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // --- Initialize / Load Slide Data ---
    useEffect(() => {
        // Reset selection when switching slides
        setSelectedId(null);
        setEditingId(null);

        // We only initialize when slide.id changes to avoid overwriting current editing state 
        // when parent passes back updated customCanvasJson during drag operations.
        if (slide.customCanvasJson) {
            try {
                const savedObjects = JSON.parse(slide.customCanvasJson);
                setObjects(savedObjects);
                // Reset history when switching slides
                setHistory([slide.customCanvasJson]);
                setHistoryIndex(0);
            } catch (e) {
                console.error("Failed to parse canvas JSON", e);
            }
        } else {
            // Dynamic Layout Templates based on slide.layout
            const layout = slide.layout || 'center';
            const defaultObjects = getLayoutObjects(layout, slide.title, slide.content);
            setObjects(defaultObjects);
            setHistory([JSON.stringify(defaultObjects)]);
            setHistoryIndex(0);
        }
    }, [slide.id]);

    // Helper function to get layout-specific canvas objects
    const getLayoutObjects = (layout: string, title: string, content: string): CanvasObject[] => {
        const padding = CANVAS_WIDTH * 0.08; // 8% padding
        const contentWidth = CANVAS_WIDTH * 0.84; // 84% width for content
        const halfWidth = CANVAS_WIDTH * 0.42;

        switch (layout) {
            case 'left':
                return [
                    {
                        id: 'title-obj',
                        type: 'text',
                        text: title,
                        x: padding,
                        y: CANVAS_HEIGHT * 0.22,
                        width: contentWidth,
                        fontSize: 52,
                        fill: '#ffffff',
                        align: 'left',
                        fontStyle: 'bold',
                        field: 'title'
                    },
                    {
                        id: 'content-obj',
                        type: 'text',
                        text: content,
                        x: padding,
                        y: CANVAS_HEIGHT * 0.40,
                        width: contentWidth * 0.7,
                        fontSize: 26,
                        fill: '#ffffff',
                        align: 'left',
                        field: 'content'
                    }
                ];

            case 'right':
                return [
                    {
                        id: 'title-obj',
                        type: 'text',
                        text: title,
                        x: padding,
                        y: CANVAS_HEIGHT * 0.22,
                        width: contentWidth,
                        fontSize: 52,
                        fill: '#ffffff',
                        align: 'right',
                        fontStyle: 'bold',
                        field: 'title'
                    },
                    {
                        id: 'content-obj',
                        type: 'text',
                        text: content,
                        x: CANVAS_WIDTH * 0.38,
                        y: CANVAS_HEIGHT * 0.40,
                        width: contentWidth * 0.7,
                        fontSize: 26,
                        fill: '#ffffff',
                        align: 'right',
                        field: 'content'
                    }
                ];

            case 'top':
                return [
                    {
                        id: 'title-obj',
                        type: 'text',
                        text: title,
                        x: padding,
                        y: CANVAS_HEIGHT * 0.10,
                        width: contentWidth,
                        fontSize: 48,
                        fill: '#ffffff',
                        align: 'left',
                        fontStyle: 'bold',
                        field: 'title'
                    },
                    {
                        id: 'content-obj',
                        type: 'text',
                        text: content,
                        x: padding,
                        y: CANVAS_HEIGHT * 0.25,
                        width: contentWidth,
                        fontSize: 24,
                        fill: '#ffffff',
                        align: 'left',
                        field: 'content'
                    }
                ];

            case 'bottom':
                return [
                    {
                        id: 'title-obj',
                        type: 'text',
                        text: title,
                        x: padding,
                        y: CANVAS_HEIGHT * 0.60,
                        width: contentWidth,
                        fontSize: 56,
                        fill: '#ffffff',
                        align: 'center',
                        fontStyle: 'bold',
                        field: 'title'
                    },
                    {
                        id: 'content-obj',
                        type: 'text',
                        text: content,
                        x: padding,
                        y: CANVAS_HEIGHT * 0.78,
                        width: contentWidth,
                        fontSize: 24,
                        fill: '#ffffff',
                        align: 'center',
                        field: 'content'
                    }
                ];

            case 'split-left':
                return [
                    {
                        id: 'title-obj',
                        type: 'text',
                        text: title,
                        x: padding,
                        y: CANVAS_HEIGHT * 0.35,
                        width: halfWidth - padding,
                        fontSize: 44,
                        fill: '#ffffff',
                        align: 'left',
                        fontStyle: 'bold',
                        field: 'title'
                    },
                    {
                        id: 'content-obj',
                        type: 'text',
                        text: content,
                        x: CANVAS_WIDTH * 0.52,
                        y: CANVAS_HEIGHT * 0.25,
                        width: halfWidth - padding,
                        fontSize: 24,
                        fill: '#ffffff',
                        align: 'left',
                        field: 'content'
                    }
                ];

            case 'split-right':
                return [
                    {
                        id: 'title-obj',
                        type: 'text',
                        text: title,
                        x: CANVAS_WIDTH * 0.52,
                        y: CANVAS_HEIGHT * 0.35,
                        width: halfWidth - padding,
                        fontSize: 44,
                        fill: '#ffffff',
                        align: 'right',
                        fontStyle: 'bold',
                        field: 'title'
                    },
                    {
                        id: 'content-obj',
                        type: 'text',
                        text: content,
                        x: padding,
                        y: CANVAS_HEIGHT * 0.25,
                        width: halfWidth - padding,
                        fontSize: 24,
                        fill: '#ffffff',
                        align: 'left',
                        field: 'content'
                    }
                ];

            case 'diagonal':
                return [
                    {
                        id: 'title-obj',
                        type: 'text',
                        text: title,
                        x: padding,
                        y: CANVAS_HEIGHT * 0.12,
                        width: contentWidth * 0.65,
                        fontSize: 48,
                        fill: '#ffffff',
                        align: 'left',
                        fontStyle: 'bold',
                        field: 'title'
                    },
                    {
                        id: 'content-obj',
                        type: 'text',
                        text: content,
                        x: CANVAS_WIDTH * 0.35,
                        y: CANVAS_HEIGHT * 0.58,
                        width: contentWidth * 0.60,
                        fontSize: 24,
                        fill: '#ffffff',
                        align: 'right',
                        field: 'content'
                    }
                ];

            case 'scattered':
                return [
                    {
                        id: 'title-obj',
                        type: 'text',
                        text: title,
                        x: padding,
                        y: CANVAS_HEIGHT * 0.08,
                        width: contentWidth * 0.55,
                        fontSize: 42,
                        fill: '#ffffff',
                        align: 'left',
                        fontStyle: 'bold',
                        field: 'title'
                    },
                    {
                        id: 'content-obj',
                        type: 'text',
                        text: content,
                        x: CANVAS_WIDTH * 0.45,
                        y: CANVAS_HEIGHT * 0.68,
                        width: contentWidth * 0.52,
                        fontSize: 22,
                        fill: '#ffffff',
                        align: 'right',
                        field: 'content'
                    }
                ];

            case 'center':
            default:
                return [
                    {
                        id: 'title-obj',
                        type: 'text',
                        text: title,
                        x: 0,
                        y: CANVAS_HEIGHT * 0.35,
                        width: CANVAS_WIDTH,
                        fontSize: 56,
                        fill: '#ffffff',
                        align: 'center',
                        fontStyle: 'bold',
                        field: 'title'
                    },
                    {
                        id: 'content-obj',
                        type: 'text',
                        text: content,
                        x: CANVAS_WIDTH * 0.1,
                        y: CANVAS_HEIGHT * 0.52,
                        width: CANVAS_WIDTH * 0.8,
                        fontSize: 26,
                        fill: '#ffffff',
                        align: 'center',
                        field: 'content'
                    }
                ];
        }
    };

    // Sync props (title/content) to objects if they change externally (and not editing)
    useEffect(() => {
        if (editingId) return; // Don't overwrite if editing

        let changed = false;
        const newObjects = objects.map(obj => {
            if (obj.field === 'title' && obj.text !== slide.title) {
                changed = true;
                return { ...obj, text: slide.title };
            }
            if (obj.field === 'content' && obj.text !== slide.content) {
                changed = true;
                return { ...obj, text: slide.content };
            }
            return obj;
        });

        if (changed) {
            setObjects(newObjects);
        }
    }, [slide.title, slide.content]);

    // --- Click Outside Logic ---
    useEffect(() => {
        const handleGlobalClick = (e: MouseEvent) => {
            // If we have a selection and we click outside the viewer container
            if (selectedId && containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setSelectedId(null);
                finishEditing();
            }
        };

        window.addEventListener('mousedown', handleGlobalClick);
        return () => window.removeEventListener('mousedown', handleGlobalClick);
    }, [selectedId]);


    // --- Responsive Stage ---
    useEffect(() => {
        const fitStage = () => {
            if (!containerRef.current) return;
            const containerW = containerRef.current.clientWidth;
            const containerH = containerRef.current.clientHeight;

            // Reserve space: 80px horizontal for nav buttons
            // Reserve 160px vertical: 88px for bottom toolbar (64px height + 24px bottom offset) + top padding
            const scaleW = (containerW - 80) / CANVAS_WIDTH;
            const scaleH = (containerH - 160) / CANVAS_HEIGHT;

            const newScale = Math.max(0.1, Math.min(scaleW, scaleH));
            setScale(newScale);

            // Center logic remains the same - handled by Flexbox parent
            setPosition({
                x: (containerW - CANVAS_WIDTH * newScale) / 2,
                y: (containerH - CANVAS_HEIGHT * newScale) / 2
            });
        };

        // Use ResizeObserver to detect container size changes (e.g., when theme panel opens/closes)
        const resizeObserver = new ResizeObserver(() => {
            // Small delay to ensure layout has settled
            requestAnimationFrame(fitStage);
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        window.addEventListener('resize', fitStage);
        fitStage();

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', fitStage);
        };
    }, []);

    // --- History Management ---
    const saveHistory = useCallback((newObjects: CanvasObject[]) => {
        const json = JSON.stringify(newObjects);
        // Avoid duplicate states
        if (history[historyIndex] === json) return;

        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(json);
        if (newHistory.length > 20) newHistory.shift();

        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);

        // Notify parent
        onCanvasChange(json);
    }, [history, historyIndex, onCanvasChange]);

    const handleUndo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            const json = history[newIndex];
            setObjects(JSON.parse(json));
            setHistoryIndex(newIndex);
            onCanvasChange(json);
        }
    };

    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            const json = history[newIndex];
            setObjects(JSON.parse(json));
            setHistoryIndex(newIndex);
            onCanvasChange(json);
        }
    };

    // --- Interaction Handlers ---

    const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>, id: string) => {
        const node = e.target;
        const newObjects = objects.map(obj => {
            if (obj.id === id) {
                return { ...obj, x: node.x(), y: node.y() };
            }
            return obj;
        });
        setObjects(newObjects);
        saveHistory(newObjects);
    };

    const handleTransformEnd = (e: Konva.KonvaEventObject<Event>) => {
        const node = e.target;
        const newObjects = objects.map(obj => {
            if (obj.id === selectedId) {
                return {
                    ...obj,
                    x: node.x(),
                    y: node.y(),
                    width: Math.max(5, node.width() * node.scaleX()),
                    height: Math.max(5, node.height() * node.scaleY()),
                    // Reset scale to 1 so width/height take over
                };
            }
            return obj;
        });

        // Reset scale on the node itself to avoid compounding
        node.scaleX(1);
        node.scaleY(1);

        setObjects(newObjects);
        saveHistory(newObjects);
    };

    // --- Text Editing ---
    const handleDoubleClick = (id: string, text: string) => {
        const obj = objects.find(o => o.id === id);
        if (!obj) return;

        // Calculate position for textarea
        // We need real DOM coordinates relative to the container
        const stage = stageRef.current;
        if (!stage) return;

        // Find the text node
        const textNode = stage.findOne('#' + id);
        if (!textNode) return;

        const textPosition = textNode.getAbsolutePosition();
        const areaPosition = {
            x: containerRef.current!.offsetLeft + textPosition.x,
            y: containerRef.current!.offsetTop + textPosition.y
        };

        // Use the actual node height instead of state object height (which might be undefined/auto)
        const nodeHeight = textNode.height();

        setEditingId(id);
        setEditText(text);

        // Create style for textarea
        setEditAreaStyle({
            position: 'absolute',
            top: `${areaPosition.y}px`,
            left: `${areaPosition.x}px`,
            width: `${(obj.width || 200) * scale}px`,
            height: `${nodeHeight * scale}px`, // Use actual node height
            fontSize: `${(obj.fontSize || 24) * scale}px`,
            border: 'none',
            padding: '0px',
            margin: '0px',
            background: 'transparent',
            color: obj.fill,
            outline: 'none',
            resize: 'none',
            fontFamily: 'Arial, sans-serif', // Match Konva default
            fontWeight: obj.fontStyle?.includes('bold') ? 'bold' : 'normal',
            fontStyle: obj.fontStyle?.includes('italic') ? 'italic' : 'normal',
            textAlign: obj.align || 'left',
            lineHeight: LINE_HEIGHT,
            overflow: 'hidden',
            zIndex: 100,
        });
    };

    const finishEditing = () => {
        if (!editingId) return;

        const newObjects = objects.map(obj => {
            if (obj.id === editingId) {
                const updated = { ...obj, text: editText };
                // Sync back to Slide Data model if mapped
                if (updated.field) {
                    onTextChange(updated.field, editText);
                }
                return updated;
            }
            return obj;
        });

        setObjects(newObjects);
        saveHistory(newObjects);
        setEditingId(null);
        setEditAreaStyle(null);
        onTextBlur();
    };


    // --- Toolbar Handlers ---
    const handleAddText = () => {
        const newText: CanvasObject = {
            id: `text-${Date.now()}`,
            type: 'text',
            text: 'New Text',
            x: CANVAS_WIDTH / 2 - 100,
            y: CANVAS_HEIGHT / 2,
            fontSize: 32,
            fill: '#ffffff',
            width: 200,
            align: 'left'
        };
        const newObjs = [...objects, newText];
        setObjects(newObjs);
        setSelectedId(newText.id);
        saveHistory(newObjs);
    };

    const updateSelectedFormat = (key: keyof CanvasObject, value: any) => {
        if (!selectedId) return;

        const newObjects = objects.map(obj => {
            if (obj.id === selectedId) {
                // Handle fontStyle specialized logic
                if (key === 'fontStyle') {
                    // value passed here is like 'bold' toggled
                    const isBold = obj.fontStyle?.includes('bold');
                    const isItalic = obj.fontStyle?.includes('italic');
                    let newStyle = '';

                    if (value === 'bold') {
                        if (!isBold) newStyle += 'bold ';
                        if (isItalic) newStyle += 'italic';
                    } else if (value === 'italic') {
                        if (isBold) newStyle += 'bold ';
                        if (!isItalic) newStyle += 'italic';
                    }
                    return { ...obj, fontStyle: newStyle.trim() || 'normal' };
                }
                return { ...obj, [key]: value };
            }
            return obj;
        });
        setObjects(newObjects);
        saveHistory(newObjects);
    };

    const handleDeleteSelected = () => {
        if (!selectedId) return;
        const obj = objects.find(o => o.id === selectedId);
        if (obj?.field) {
            onTextChange(obj.field, '');
        }

        const newObjects = objects.filter(o => o.id !== selectedId);
        setObjects(newObjects);
        setSelectedId(null);
        saveHistory(newObjects);
    };

    // Helper to get current formatting of selected object
    const getFormat = () => {
        const obj = objects.find(o => o.id === selectedId);
        if (!obj) return { bold: false, italic: false, underline: false, fill: '#ffffff', fontSize: 24, align: 'left' };
        return {
            bold: obj.fontStyle?.includes('bold') || false,
            italic: obj.fontStyle?.includes('italic') || false,
            underline: obj.textDecoration === 'underline',
            fill: obj.fill,
            fontSize: obj.fontSize || 24,
            align: obj.align || 'left'
        };
    };
    const format = getFormat();

    // --- Render ---

    // Update transformer selection
    useEffect(() => {
        if (selectedId && transformerRef.current && stageRef.current) {
            const node = stageRef.current.findOne('#' + selectedId);
            if (node) {
                transformerRef.current.nodes([node]);
                transformerRef.current.getLayer()?.batchDraw();
            }
        }
    }, [selectedId, objects]);

    // Floating Toolbar Position
    const getToolbarPosition = () => {
        if (!selectedId || !stageRef.current) return null;
        const node = stageRef.current.findOne('#' + selectedId);
        if (!node) return null;

        // We want toolbar above the object in screen coordinates
        // This is purely approximate for the floating UI
        const absPos = node.getAbsolutePosition();
        // Adjust for scale
        const width = node.width() * node.scaleX() * scale;
        const x = absPos.x + width / 2;
        const y = absPos.y - 60; // 60px above

        // Clamp to container
        return {
            top: Math.max(10, y),
            left: Math.max(50, x)
        };
    };
    const toolbarPos = getToolbarPosition();

    return (
        <div className="flex-1 bg-slate-200 dark:bg-zinc-900/50 flex flex-col relative overflow-hidden">
            {/* Slide Viewer Container */}
            <div
                className="flex-1 flex items-center justify-center relative bg-slate-300 dark:bg-zinc-950"
                ref={containerRef}
                onMouseDown={(e) => {
                    // Deselect if clicking the background container padding
                    if (e.target === containerRef.current) {
                        setSelectedId(null);
                        finishEditing();
                    }
                }}
            >

                <button
                    onClick={onPrev} disabled={isFirst}
                    className="absolute left-4 z-40 p-4 rounded-full bg-black/50 hover:bg-black/80 text-white disabled:opacity-0 transition backdrop-blur"
                >
                    <ChevronLeft size={24} />
                </button>

                {/* Stage Wrapper */}
                <div className="shadow-2xl border border-slate-400 dark:border-zinc-800 rounded overflow-hidden relative">
                    <Stage
                        width={CANVAS_WIDTH * scale}
                        height={CANVAS_HEIGHT * scale}
                        scaleX={scale}
                        scaleY={scale}
                        ref={stageRef}
                        onMouseDown={(e) => {
                            // Check if we clicked on the stage background or the explicit background layers
                            const clickedOnEmpty = e.target === e.target.getStage() || e.target.name() === 'background';
                            if (clickedOnEmpty) {
                                setSelectedId(null);
                                if (editingId) finishEditing();
                            }
                        }}
                    >
                        <Layer>
                            <BackgroundImageLayer base64={slide.imageBase64} />
                        </Layer>
                        <Layer>
                            {objects.map((obj) => {
                                const isSelected = selectedId === obj.id;
                                if (obj.type === 'text') {
                                    return (
                                        <Text
                                            key={obj.id}
                                            id={obj.id}
                                            text={obj.text}
                                            // Use opacity to hide text instead of clearing content, maintaining dimensions
                                            opacity={editingId === obj.id ? 0 : 1}
                                            x={obj.x}
                                            y={obj.y}
                                            width={obj.width}
                                            fontSize={obj.fontSize}
                                            fill={obj.fill}
                                            fontStyle={obj.fontStyle}
                                            textDecoration={obj.textDecoration}
                                            align={obj.align}
                                            lineHeight={LINE_HEIGHT}
                                            draggable
                                            onClick={() => setSelectedId(obj.id)}
                                            onTap={() => setSelectedId(obj.id)}
                                            onDblClick={() => handleDoubleClick(obj.id, obj.text || '')}
                                            onDragEnd={(e) => handleDragEnd(e, obj.id)}
                                            onTransformEnd={handleTransformEnd}
                                        />
                                    );
                                } else if (obj.type === 'rect') {
                                    return (
                                        <Rect
                                            key={obj.id}
                                            id={obj.id}
                                            x={obj.x}
                                            y={obj.y}
                                            width={obj.width}
                                            height={obj.height}
                                            fill={obj.fill}
                                            draggable
                                            onClick={() => setSelectedId(obj.id)}
                                            onTap={() => setSelectedId(obj.id)}
                                            onDragEnd={(e) => handleDragEnd(e, obj.id)}
                                            onTransformEnd={handleTransformEnd}
                                        />
                                    );
                                }
                                return null;
                            })}

                            {selectedId && (
                                <Transformer
                                    ref={transformerRef}
                                    boundBoxFunc={(oldBox, newBox) => {
                                        // Limit resize
                                        if (newBox.width < 5 || newBox.height < 5) {
                                            return oldBox;
                                        }
                                        return newBox;
                                    }}
                                />
                            )}
                        </Layer>
                    </Stage>

                    {/* Text Editing Overlay */}
                    {editingId && editAreaStyle && (
                        <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onBlur={finishEditing}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault(); // Stop creating new lines
                                    finishEditing(); // Commit
                                }
                            }}
                            style={editAreaStyle}
                            autoFocus
                        />
                    )}

                    {/* Status Overlays */}
                    {(slide.isGeneratingImage || slide.generationFailed) && (
                        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center gap-6 p-6 text-center">
                            {slide.isGeneratingImage && (
                                <>
                                    <div className="flex flex-col items-center gap-2 text-purple-400 animate-pulse">
                                        <Loader2 size={48} className="animate-spin" />
                                        <span className="text-sm font-medium tracking-widest">CREATING VISUALS...</span>
                                    </div>
                                    <button
                                        onClick={onStopGeneration}
                                        className="mt-4 px-6 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-200 border border-red-500/50 rounded-full text-sm font-semibold transition flex items-center gap-2"
                                    >
                                        <Square size={16} fill="currentColor" /> Stop Generating
                                    </button>
                                </>
                            )}
                            {slide.generationFailed && (
                                <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                                    <div className="flex flex-col items-center gap-2 text-red-400">
                                        <div className="p-3 bg-red-500/10 rounded-full">
                                            <AlertCircle size={48} />
                                        </div>
                                        <span className="text-lg font-bold tracking-wide text-white">GENERATION FAILED</span>
                                        <p className="text-zinc-400 text-sm max-w-md">
                                            We couldn't generate the image for this slide. You can try again or continue without it.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4 mt-2">
                                        <button
                                            onClick={onIgnore}
                                            className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-full text-sm font-semibold transition border border-zinc-700 hover:border-zinc-600"
                                        >
                                            Ignore
                                        </button>
                                        <button
                                            onClick={onRetry}
                                            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-full text-sm font-semibold transition flex items-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                                        >
                                            <RefreshCw size={16} /> Regenerate
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Top Left Controls (Delete) */}
                    <div className="absolute top-4 left-4 z-[60] flex gap-2">
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                            className="p-2 rounded-full bg-zinc-800/80 hover:bg-red-500 text-white transition shadow-lg border border-zinc-700/50"
                            title="Delete Slide"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>

                    {/* Top Right Controls */}
                    <div className="absolute top-4 right-4 z-[60] flex gap-2">
                        {slide.isGeneratingImage ? (
                            <button
                                onClick={onStopGeneration}
                                onPointerDown={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="p-2 rounded-full bg-red-500/80 hover:bg-red-500 text-white shadow-lg"
                            >
                                <Square size={18} fill="currentColor" />
                            </button>
                        ) : (
                            <button
                                onClick={onOpenRegenerateModal}
                                onPointerDown={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="p-2 rounded-full bg-zinc-800/80 hover:bg-purple-500 text-white shadow-lg border border-zinc-700/50"
                            >
                                <RefreshCw size={18} />
                            </button>
                        )}
                    </div>

                    {/* Floating Toolbar */}
                    {selectedId && toolbarPos && !editingId && (
                        <div
                            className="absolute z-40 flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl transform -translate-x-1/2 transition-all duration-200"
                            style={{ top: toolbarPos.top, left: toolbarPos.left }}
                        >
                            {/* ... toolbar content ... */}
                            <div className="relative group/color">
                                <div
                                    className="w-8 h-8 rounded hover:bg-zinc-800 flex items-center justify-center cursor-pointer"
                                    style={{ color: format.fill }}
                                >
                                    <Palette size={18} />
                                    <div className="w-4 h-1 absolute bottom-1.5 rounded-full bg-current" />
                                </div>
                                <input
                                    type="color"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    value={format.fill}
                                    onChange={(e) => updateSelectedFormat('fill', e.target.value)}
                                />
                            </div>
                            <div className="w-px h-5 bg-zinc-700 mx-1" />

                            <div className="flex items-center gap-1 bg-zinc-950 rounded border border-zinc-800 px-1">
                                <button
                                    onClick={() => updateSelectedFormat('fontSize', Math.max(8, format.fontSize - 2))}
                                    className="p-1 text-zinc-400 hover:text-white"
                                >
                                    <Minus size={12} />
                                </button>
                                <span className="text-xs w-6 text-center">{format.fontSize}</span>
                                <button
                                    onClick={() => updateSelectedFormat('fontSize', Math.min(120, format.fontSize + 2))}
                                    className="p-1 text-zinc-400 hover:text-white"
                                >
                                    <Plus size={12} />
                                </button>
                            </div>

                            <div className="w-px h-5 bg-zinc-700 mx-1" />

                            {/* Alignment Controls */}
                            <div className="flex items-center gap-0.5 bg-zinc-950 rounded border border-zinc-800 p-0.5">
                                <button
                                    onClick={() => updateSelectedFormat('align', 'left')}
                                    className={`p-1 rounded hover:bg-zinc-800 ${format.align === 'left' ? 'text-purple-400 bg-zinc-800' : 'text-zinc-400'}`}
                                >
                                    <AlignLeft size={14} />
                                </button>
                                <button
                                    onClick={() => updateSelectedFormat('align', 'center')}
                                    className={`p-1 rounded hover:bg-zinc-800 ${format.align === 'center' ? 'text-purple-400 bg-zinc-800' : 'text-zinc-400'}`}
                                >
                                    <AlignCenter size={14} />
                                </button>
                                <button
                                    onClick={() => updateSelectedFormat('align', 'right')}
                                    className={`p-1 rounded hover:bg-zinc-800 ${format.align === 'right' ? 'text-purple-400 bg-zinc-800' : 'text-zinc-400'}`}
                                >
                                    <AlignRight size={14} />
                                </button>
                            </div>

                            <div className="w-px h-5 bg-zinc-700 mx-1" />

                            <button
                                onClick={() => updateSelectedFormat('fontStyle', 'bold')}
                                className={`p-1.5 rounded hover:bg-zinc-800 ${format.bold ? 'text-purple-400 bg-zinc-800' : 'text-zinc-400'}`}
                            >
                                <Bold size={16} />
                            </button>
                            <button
                                onClick={() => updateSelectedFormat('fontStyle', 'italic')}
                                className={`p-1.5 rounded hover:bg-zinc-800 ${format.italic ? 'text-purple-400 bg-zinc-800' : 'text-zinc-400'}`}
                            >
                                <Italic size={16} />
                            </button>
                            <button
                                onClick={() => updateSelectedFormat('textDecoration', format.underline ? '' : 'underline')}
                                className={`p-1.5 rounded hover:bg-zinc-800 ${format.underline ? 'text-purple-400 bg-zinc-800' : 'text-zinc-400'}`}
                            >
                                <Underline size={16} />
                            </button>
                            <div className="w-px h-5 bg-zinc-700 mx-1" />

                            <button
                                onClick={handleDeleteSelected}
                                className="p-1.5 rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    )}
                </div>

                <button
                    onClick={onNext} disabled={isLast}
                    className="absolute right-4 z-40 p-4 rounded-full bg-black/50 hover:bg-black/80 text-white disabled:opacity-0 transition backdrop-blur"
                >
                    <ChevronRight size={24} />
                </button>

                {/* Bottom Main Toolbar */}
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-40 flex items-center gap-2 bg-zinc-900/90 backdrop-blur border border-zinc-700 p-2 rounded-2xl shadow-2xl">
                    <button
                        onClick={handleUndo}
                        disabled={historyIndex <= 0}
                        className="p-3 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl disabled:opacity-30 disabled:hover:bg-transparent transition"
                        title="Undo"
                    >
                        <Undo size={20} />
                    </button>
                    <button
                        onClick={handleRedo}
                        disabled={historyIndex >= history.length - 1}
                        className="p-3 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl disabled:opacity-30 disabled:hover:bg-transparent transition"
                        title="Redo"
                    >
                        <Redo size={20} />
                    </button>

                    <div className="w-px h-8 bg-zinc-700 mx-1" />

                    <button
                        onClick={handleAddText}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition shadow-lg shadow-purple-900/30"
                    >
                        <Type size={18} />
                        <span>Add Text</span>
                    </button>
                </div>
            </div>

            {/* Speaker Notes Section */}
            <div className="h-48 border-t border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col z-30 relative shrink-0 transition-colors">
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50">
                    <span className="text-xs font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-wider">Speaker Notes</span>

                    {/* AI Button */}
                    <div className="relative" ref={aiDropdownRef}>
                        <button
                            onClick={() => setShowAiDropdown(!showAiDropdown)}
                            disabled={isEnhancing || !slide.speakerNotes?.trim()}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${isEnhancing
                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                    : 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white shadow-md shadow-purple-500/20 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed'
                                }`}
                        >
                            {isEnhancing ? (
                                <>
                                    <Loader2 size={12} className="animate-spin" />
                                    <span>Enhancing...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles size={12} />
                                    <span>AI Enhance</span>
                                    <ChevronDown size={12} className={`transition-transform duration-200 ${showAiDropdown ? 'rotate-180' : ''}`} />
                                </>
                            )}
                        </button>

                        {/* Dropdown */}
                        {showAiDropdown && (
                            <div className="absolute bottom-full right-0 mb-2 w-56 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-slate-200 dark:border-zinc-700 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                                <div className="p-1">
                                    <button onClick={() => handleEnhanceNotes('enhance')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-lg flex items-center gap-2 text-slate-700 dark:text-slate-200">
                                        <Wand2 size={14} className="text-purple-500" />
                                        <span>Improve Grammar & Flow</span>
                                    </button>
                                    <button onClick={() => handleEnhanceNotes('simplify')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-lg flex items-center gap-2 text-slate-700 dark:text-slate-200">
                                        <Minus size={14} className="text-blue-500" />
                                        <span>Simplify & Consolidate</span>
                                    </button>
                                    <button onClick={() => handleEnhanceNotes('natural')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-lg flex items-center gap-2 text-slate-700 dark:text-slate-200">
                                        <MousePointer2 size={14} className="text-green-500" />
                                        <span>Make Natural</span>
                                    </button>

                                    <div className="h-px bg-slate-100 dark:bg-zinc-700 my-1" />

                                    <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase">Translate To</div>
                                    {['English', 'Chinese', 'Spanish', 'French', 'Japanese'].map(lang => (
                                        <button
                                            key={lang}
                                            onClick={() => handleEnhanceNotes('translate', lang)}
                                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-lg flex items-center gap-2 text-slate-600 dark:text-slate-300"
                                        >
                                            <span>{lang}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <textarea
                    value={slide.speakerNotes || ''}
                    onChange={(e) => onTextChange('speakerNotes', e.target.value)}
                    onBlur={onTextBlur}
                    placeholder="Click to add speaker notes... (These will be visible in Presenter Mode)"
                    className="flex-1 w-full p-4 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-sm leading-relaxed text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-zinc-600 font-sans"
                />
            </div>

            <div className="bg-zinc-950 py-2 text-center text-xs text-zinc-500 border-t border-zinc-800 flex justify-center gap-4">
                <span className="flex items-center gap-1"><MousePointer2 size={12} /> Double-click text to edit</span>
                <span className="flex items-center gap-1">Select text to show formatting tools</span>
            </div>
        </div>
    );
};

export default SlideViewer;