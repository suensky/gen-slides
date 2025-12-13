import React, { useState, useRef, useCallback } from 'react';
import { ArrowRight, Sparkles, Paperclip, File as FileIcon, Image as ImageIcon, Music, FileText, X, Settings, ChevronDown } from 'lucide-react';
import { Attachment } from '../types';
import ThemeToggle from './ThemeToggle';
import ImageSettingsModal from './ImageSettingsModal';
import { IMAGE_MODELS, ImageConfig, DEFAULT_IMAGE_CONFIG, ImageModel, AspectRatio } from '../services/geminiService';

interface HomeProps {
    onSubmit: (topic: string, attachments: Attachment[], imageConfig: ImageConfig) => void;
    onTestPage: () => void;
}

const SUGGESTIONS = [
    "Quantum Computing 101: Explain quantum computing to a non-technical audience, covering qubits, superposition, and real-world applications in cryptography and drug discovery",
    "Eco-Fashion Startup: Create a compelling investor pitch for a sustainable fashion brand using recycled ocean plastics, targeting Gen-Z consumers with a subscription model",
    "Remote Team Leadership: A comprehensive guide on managing distributed teams across time zones, building culture virtually, and preventing burnout in hybrid work environments",
    "Sleep Science Secrets: Explore the neuroscience of sleep cycles, circadian rhythms, and evidence-based techniques for optimizing rest and boosting cognitive performance"
];

const ALLOWED_MIME_TYPES = [
    'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif',
    'audio/wav', 'audio/mp3', 'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/flac',
    'application/pdf'
];

const Home: React.FC<HomeProps> = ({ onSubmit, onTestPage }) => {
    const [input, setInput] = useState('');
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [imageConfig, setImageConfig] = useState<ImageConfig>(DEFAULT_IMAGE_CONFIG);
    const [showImageSettingsModal, setShowImageSettingsModal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() || attachments.length > 0) {
            onSubmit(input, attachments, imageConfig);
        }
    };

    const processFile = (file: File): Promise<Attachment> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                // Remove Data URL prefix (e.g., "data:image/png;base64,")
                const base64Data = result.split(',')[1];
                resolve({
                    name: file.name,
                    mimeType: file.type,
                    data: base64Data
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleFiles = async (files: FileList | null) => {
        if (!files) return;

        const newAttachments: Attachment[] = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (ALLOWED_MIME_TYPES.some(type => file.type.match(new RegExp(type.replace('*', '.*'))))) {
                try {
                    const attachment = await processFile(file);
                    newAttachments.push(attachment);
                } catch (e) {
                    console.error("Failed to process file", file.name, e);
                }
            } else {
                alert(`File type ${file.type} not supported.`);
            }
        }
        setAttachments(prev => [...prev, ...newAttachments]);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const getFileIcon = (mimeType: string) => {
        if (mimeType.startsWith('image/')) return <ImageIcon size={14} className="text-blue-400" />;
        if (mimeType.startsWith('audio/')) return <Music size={14} className="text-pink-400" />;
        if (mimeType === 'application/pdf') return <FileText size={14} className="text-red-400" />;
        return <FileIcon size={14} className="text-zinc-400" />;
    };

    // Get aspect ratio preview dimensions for the mini indicator
    const getAspectRatioPreviewSize = (aspectRatio: AspectRatio) => {
        const [w, h] = aspectRatio.split(':').map(Number);
        const ratio = w / h;
        const maxSize = 16;
        if (ratio >= 1) {
            return { width: maxSize, height: maxSize / ratio };
        } else {
            return { width: maxSize * ratio, height: maxSize };
        }
    };

    const selectedModel = IMAGE_MODELS.find(m => m.id === imageConfig.model);
    const aspectRatioPreviewSize = getAspectRatioPreviewSize(imageConfig.aspectRatio);

    return (
        <div className="flex-1 flex flex-col items-center p-6 bg-slate-50 dark:bg-zinc-950 relative overflow-hidden h-full transition-colors">
            {/* Theme Toggle */}
            <div className="absolute top-6 right-6 z-20">
                <ThemeToggle />
            </div>

            {/* Decorative Background Elements */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-400/10 dark:bg-purple-900/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-400/10 dark:bg-blue-900/20 rounded-full blur-3xl pointer-events-none" />

            <div className="z-10 w-full max-w-4xl text-center flex flex-col h-full">
                <div className="flex-none pt-12 space-y-6">
                    <h1 className="text-6xl font-tracking-tighter font-bold text-zinc-900 dark:text-white mb-4">
                        Gen Slides
                    </h1>
                    <p className="text-xl text-zinc-500 dark:text-zinc-400 font-light">
                        Turn your ideas into stunning slides with <span className="text-purple-600 dark:text-purple-400 font-medium">Gen Slides</span>
                    </p>

                    <div className="w-full max-w-2xl mx-auto">
                        <form
                            onSubmit={handleSubmit}
                            className="w-full relative group"
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                        >
                            <div className={`absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 dark:from-purple-600 dark:to-blue-600 rounded-2xl blur transition duration-500 ${isDragging ? 'opacity-70' : 'opacity-25 group-hover:opacity-40'}`}></div>

                            <div className={`relative bg-white dark:bg-zinc-900 border rounded-2xl p-2 flex flex-col shadow-2xl transition-colors ${isDragging ? 'border-purple-500 bg-slate-50 dark:bg-zinc-900/80' : 'border-slate-200 dark:border-zinc-800'}`}>

                                {/* Attachments List */}
                                {attachments.length > 0 && (
                                    <div className="flex flex-wrap gap-2 px-4 pt-4 pb-2">
                                        {attachments.map((att, idx) => (
                                            <div key={idx} className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-800 rounded-lg pl-3 pr-2 py-1.5 border border-slate-200 dark:border-zinc-700 animate-in fade-in zoom-in duration-200">
                                                {getFileIcon(att.mimeType)}
                                                <span className="text-xs text-zinc-700 dark:text-zinc-200 max-w-[150px] truncate" title={att.name}>{att.name}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeAttachment(idx)}
                                                    className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white transition"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <textarea
                                    className="w-full bg-transparent text-lg text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 p-4 min-h-[120px] outline-none resize-none"
                                    placeholder={isDragging ? "Drop files here..." : "Describe your presentation idea, or drop images, PDFs, or audio..."}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSubmit(e);
                                        }
                                    }}
                                />

                                {/* Drag Overlay Text */}
                                {isDragging && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/90 dark:bg-zinc-900/90 rounded-2xl z-20 pointer-events-none">
                                        <div className="text-purple-600 dark:text-purple-400 font-medium flex flex-col items-center gap-2 animate-bounce">
                                            <Paperclip size={32} />
                                            <span>Drop files to attach</span>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-between items-center px-4 pb-2 border-t border-slate-200/50 dark:border-zinc-800/50 pt-3 mt-2">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="file"
                                            multiple
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept={ALLOWED_MIME_TYPES.join(',')}
                                            onChange={(e) => handleFiles(e.target.files)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white transition p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg flex items-center gap-2 text-xs font-medium group/attach"
                                        >
                                            <Paperclip size={16} className="group-hover/attach:rotate-45 transition-transform" />
                                            <span className="hidden sm:inline">Attach</span>
                                        </button>

                                        {/* Divider */}
                                        <div className="h-5 w-px bg-slate-200 dark:bg-zinc-700" />

                                        {/* Model Selector with Settings */}
                                        <div className="flex items-center gap-1">
                                            <div className="relative">
                                                <select
                                                    value={imageConfig.model}
                                                    onChange={(e) => setImageConfig(prev => ({ ...prev, model: e.target.value as ImageModel }))}
                                                    className="appearance-none px-2 py-1.5 pr-6 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 focus:ring-2 focus:ring-purple-500 focus:outline-none transition cursor-pointer hover:bg-slate-200 dark:hover:bg-zinc-700"
                                                    title={selectedModel?.name}
                                                >
                                                    {IMAGE_MODELS.map((model) => (
                                                        <option key={model.id} value={model.id}>
                                                            {model.id === 'gemini-2.5-flash-image' ? '⚡ Flash' : '🍌 Pro'}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => setShowImageSettingsModal(true)}
                                                className="flex items-center gap-1.5 px-2 py-1.5 text-zinc-500 dark:text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition group/settings"
                                                title="Image Settings"
                                            >
                                                {/* Aspect Ratio Preview Shape */}
                                                <div
                                                    className="bg-purple-500/30 dark:bg-purple-400/30 rounded-sm border border-purple-500/50 dark:border-purple-400/50 group-hover/settings:bg-purple-500/50 transition"
                                                    style={{
                                                        width: aspectRatioPreviewSize.width,
                                                        height: aspectRatioPreviewSize.height
                                                    }}
                                                />
                                                <span className="text-xs font-medium hidden sm:inline">{imageConfig.aspectRatio}</span>
                                                <Settings size={14} className="group-hover/settings:rotate-45 transition-transform" />
                                            </button>
                                        </div>

                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!input.trim() && attachments.length === 0}
                                        className="bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl p-3 transition-colors duration-200 flex items-center justify-center"
                                    >
                                        <ArrowRight size={20} />
                                    </button>
                                </div>
                            </div>
                        </form>

                        {/* Suggestions */}
                        <div className="flex flex-wrap justify-center gap-2 mt-4">
                            {SUGGESTIONS.map((suggestion) => (
                                <button
                                    key={suggestion}
                                    onClick={() => setInput(suggestion)}
                                    className="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-500 bg-slate-100 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-full hover:bg-slate-200 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-300 transition cursor-pointer"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="absolute bottom-4 left-0 right-0 text-center">
                    <span className="text-[10px] text-zinc-400/60 dark:text-zinc-600/60 flex items-center justify-center gap-1">
                        <Sparkles size={10} /> Powered by Gemini
                    </span>
                </div>
            </div>

            <ImageSettingsModal
                isOpen={showImageSettingsModal}
                config={imageConfig}
                onClose={() => setShowImageSettingsModal(false)}
                onSave={setImageConfig}
            />
        </div>
    );
};

export default Home;