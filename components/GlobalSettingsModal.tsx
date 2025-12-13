import React, { useEffect, useState } from 'react';
import { X, Globe, Moon, Sun, Monitor, Github, Info, ChevronRight } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface GlobalSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({ isOpen, onClose }) => {
    const { theme, toggleTheme } = useTheme();
    const [activeTab, setActiveTab] = useState<'general' | 'appearance'>('general');
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible && !isOpen) return null;

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Window */}
            <div className={`
                relative w-full max-w-2xl bg-white dark:bg-zinc-900 
                rounded-2xl shadow-2xl overflow-hidden
                transform transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1)
                ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}
                border border-slate-200 dark:border-zinc-800
                flex flex-col md:flex-row h-[500px]
            `}>
                {/* Sidebar */}
                <div className="w-full md:w-64 bg-slate-50 dark:bg-zinc-950/50 border-r border-slate-200 dark:border-zinc-800 p-4 flex flex-col gap-2">
                    <h2 className="text-sm font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-3 mb-2">Settings</h2>

                    <button
                        onClick={() => setActiveTab('general')}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'general'
                                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                                : 'text-zinc-600 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-zinc-800/50'
                            }`}
                    >
                        <Globe size={18} />
                        General
                    </button>

                    <button
                        onClick={() => setActiveTab('appearance')}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'appearance'
                                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                                : 'text-zinc-600 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-zinc-800/50'
                            }`}
                    >
                        <Monitor size={18} />
                        Appearance
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-900">
                    <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-zinc-800">
                        <h1 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight">
                            {activeTab === 'general' ? 'General' : 'Appearance'}
                        </h1>
                        <button
                            onClick={onClose}
                            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-full transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {activeTab === 'general' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <section>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
                                            <span className="text-2xl">✨</span>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-medium text-zinc-900 dark:text-white">Gen Slides</h3>
                                            <p className="text-sm text-zinc-500 dark:text-zinc-400">Version 1.0.0 (Beta)</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                        Gen Slides is an AI-powered presentation generator designed to help you create stunning slide decks in seconds. Built with Google Gemini.
                                    </p>
                                </section>

                                <div className="h-px bg-slate-100 dark:bg-zinc-800" />

                                <section className="space-y-3">
                                    <h4 className="text-sm font-medium text-zinc-900 dark:text-white">About</h4>
                                    <a href="#" className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white dark:bg-zinc-900 rounded-lg text-zinc-600 dark:text-white shadow-sm border border-slate-200 dark:border-zinc-700">
                                                <Github size={18} />
                                            </div>
                                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">GitHub Repository</span>
                                        </div>
                                        <ChevronRight size={16} className="text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 transition-colors" />
                                    </a>
                                    <a href="#" className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white dark:bg-zinc-900 rounded-lg text-blue-500 shadow-sm border border-slate-200 dark:border-zinc-700">
                                                <Info size={18} />
                                            </div>
                                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Documentation</span>
                                        </div>
                                        <ChevronRight size={16} className="text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 transition-colors" />
                                    </a>
                                </section>
                            </div>
                        )}

                        {activeTab === 'appearance' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <section className="space-y-4">
                                    <h3 className="text-sm font-medium text-zinc-900 dark:text-white">Theme</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => theme === 'dark' && toggleTheme()}
                                            className={`
                                                relative p-4 rounded-xl border-2 text-left transition-all duration-200
                                                ${theme === 'light'
                                                    ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-900/20'
                                                    : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="p-2 bg-white rounded-lg shadow-sm text-orange-500">
                                                    <Sun size={20} />
                                                </div>
                                                <span className="font-medium text-zinc-900 dark:text-white">Light</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                <div className="h-full w-2/3 bg-slate-300 dark:bg-zinc-700" />
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => theme === 'light' && toggleTheme()}
                                            className={`
                                                relative p-4 rounded-xl border-2 text-left transition-all duration-200
                                                ${theme === 'dark'
                                                    ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-900/20'
                                                    : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="p-2 bg-zinc-800 rounded-lg shadow-sm text-blue-400">
                                                    <Moon size={20} />
                                                </div>
                                                <span className="font-medium text-zinc-900 dark:text-white">Dark</span>
                                            </div>
                                            <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                                                <div className="h-full w-2/3 bg-zinc-700" />
                                            </div>
                                        </button>
                                    </div>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        Choose a theme for the application interface. This does not affect presentation templates.
                                    </p>
                                </section>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GlobalSettingsModal;
