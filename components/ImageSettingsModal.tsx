import React, { useState, useEffect } from 'react';
import { X, Settings } from 'lucide-react';
import {
    IMAGE_MODELS,
    ASPECT_RATIOS,
    IMAGE_SIZES,
    ImageConfig,
    ImageModel,
    AspectRatio,
    ImageSize
} from '../services/geminiService';

interface ImageSettingsModalProps {
    isOpen: boolean;
    config: ImageConfig;
    onClose: () => void;
    onSave: (config: ImageConfig) => void;
}

// Aspect ratio preview dimensions (max width 120px)
const getAspectRatioPreviewDimensions = (aspectRatio: AspectRatio) => {
    const maxWidth = 120;
    const maxHeight = 80;

    const [w, h] = aspectRatio.split(':').map(Number);
    const ratio = w / h;

    if (ratio >= 1) {
        // Landscape or square
        const width = maxWidth;
        const height = width / ratio;
        return { width, height: Math.min(height, maxHeight) };
    } else {
        // Portrait
        const height = maxHeight;
        const width = height * ratio;
        return { width, height };
    }
};

const ImageSettingsModal: React.FC<ImageSettingsModalProps> = ({
    isOpen,
    config,
    onClose,
    onSave
}) => {
    const [localConfig, setLocalConfig] = useState<ImageConfig>(config);

    useEffect(() => {
        setLocalConfig(config);
    }, [config, isOpen]);

    if (!isOpen) return null;

    const selectedModel = IMAGE_MODELS.find(m => m.id === localConfig.model);
    const supportsImageSize = selectedModel?.supportsImageSize ?? false;

    const handleModelChange = (modelId: ImageModel) => {
        const newConfig = { ...localConfig, model: modelId };
        // Reset imageSize if new model doesn't support it
        const model = IMAGE_MODELS.find(m => m.id === modelId);
        if (!model?.supportsImageSize) {
            delete newConfig.imageSize;
        }
        setLocalConfig(newConfig);
    };

    const handleSave = () => {
        onSave(localConfig);
        onClose();
    };

    const previewDimensions = getAspectRatioPreviewDimensions(localConfig.aspectRatio);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-700">
                    <div className="flex items-center gap-3">
                        <Settings size={20} className="text-purple-500" />
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Image Generation Settings</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition"
                    >
                        <X size={18} className="text-zinc-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-6">
                    {/* Model Selection */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Image Model
                        </label>
                        <select
                            value={localConfig.model}
                            onChange={(e) => handleModelChange(e.target.value as ImageModel)}
                            className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                        >
                            {IMAGE_MODELS.map((model) => (
                                <option key={model.id} value={model.id}>
                                    {model.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Aspect Ratio */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Aspect Ratio
                        </label>

                        {/* Preview Shape */}
                        <div className="flex items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                            <div
                                className="bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg shadow-lg transition-all duration-300"
                                style={{
                                    width: previewDimensions.width,
                                    height: previewDimensions.height
                                }}
                            >
                                <div className="w-full h-full flex items-center justify-center text-white/80 text-xs font-mono">
                                    {localConfig.aspectRatio}
                                </div>
                            </div>
                        </div>

                        {/* Aspect Ratio Buttons */}
                        <div className="grid grid-cols-5 gap-2">
                            {ASPECT_RATIOS.map((ratio) => (
                                <button
                                    key={ratio}
                                    onClick={() => setLocalConfig({ ...localConfig, aspectRatio: ratio })}
                                    className={`py-2 px-3 rounded-lg text-sm font-medium transition ${localConfig.aspectRatio === ratio
                                            ? 'bg-purple-500 text-white'
                                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                                        }`}
                                >
                                    {ratio}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Image Size (only for supported models) */}
                    {supportsImageSize && (
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Image Size
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {IMAGE_SIZES.map((size) => (
                                    <button
                                        key={size}
                                        onClick={() => setLocalConfig({ ...localConfig, imageSize: size as ImageSize })}
                                        className={`py-2 px-4 rounded-lg text-sm font-medium transition ${localConfig.imageSize === size
                                                ? 'bg-purple-500 text-white'
                                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                                            }`}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Available for Gemini 3 Pro Image model only
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-5 border-t border-zinc-200 dark:border-zinc-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 rounded-lg text-sm font-semibold bg-purple-500 text-white hover:bg-purple-600 transition"
                    >
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImageSettingsModal;
