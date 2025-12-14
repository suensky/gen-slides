import React, { useState, useMemo } from 'react';
import { ChevronDown, Check, Palette, Sparkles } from 'lucide-react';
import { THEME_OPTIONS, THEME_CATEGORIES, ThemeOption, getThemesByCategory, PER_SLIDE_OPTION } from '../services/themes';

interface ThemeSelectorProps {
    selectedThemeId: string | null;
    onSelectTheme: (themeId: string | null) => void;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({
    selectedThemeId,
    onSelectTheme
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeCategory, setActiveCategory] = useState<string>('all');

    const filteredThemes = useMemo(() => {
        return getThemesByCategory(activeCategory).slice(0, 8); // Show first 8 for compact view
    }, [activeCategory]);

    const selectedTheme = selectedThemeId
        ? THEME_OPTIONS.find(t => t.id === selectedThemeId)
        : null;

    const allCategories = useMemo(() => [
        { id: 'all', name: 'All', icon: '✨' },
        ...THEME_CATEGORIES
    ], []);

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden transition-all duration-300 shadow-sm">
            {/* Header / Collapsed View */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl">
                        <Palette size={14} className="text-white" />
                    </div>
                    <div className="text-left">
                        <h4 className="font-medium text-sm text-zinc-800 dark:text-white">Background Theme</h4>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            {selectedTheme ? (
                                <span className="flex items-center gap-1">
                                    <span>{selectedTheme.icon}</span>
                                    {selectedTheme.name}
                                </span>
                            ) : (
                                <span className="flex items-center gap-1">
                                    <Sparkles size={10} />
                                    Per-Slide AI Images (Default)
                                </span>
                            )}
                        </p>
                    </div>
                </div>
                <ChevronDown
                    size={16}
                    className={`text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-4 pb-4 border-t border-slate-100 dark:border-zinc-800 pt-3">
                    {/* Category Tabs */}
                    <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
                        {allCategories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`
                  px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all
                  ${activeCategory === cat.id
                                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-black'
                                        : 'bg-slate-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
                                    }
                `}
                            >
                                {cat.icon} {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* Theme Options Grid */}
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                        {/* Per-Slide Option */}
                        {activeCategory === 'all' && (
                            <button
                                onClick={() => {
                                    onSelectTheme(null);
                                    setIsExpanded(false);
                                }}
                                className={`
                  relative group flex flex-col items-center p-2 rounded-xl border-2 transition-all
                  ${selectedThemeId === null
                                        ? 'border-purple-500 dark:border-purple-400 bg-purple-50 dark:bg-purple-900/20'
                                        : 'border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600'
                                    }
                `}
                            >
                                <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center shadow-inner mb-1"
                                    style={{ background: PER_SLIDE_OPTION.previewGradient }}
                                >
                                    <Sparkles size={14} className="text-white" />
                                </div>
                                <span className="text-[9px] font-medium text-zinc-600 dark:text-zinc-400 text-center leading-tight">
                                    Per-Slide
                                </span>
                                {selectedThemeId === null && (
                                    <div className="absolute -top-1 -right-1 bg-purple-500 rounded-full p-0.5">
                                        <Check size={8} className="text-white" />
                                    </div>
                                )}
                            </button>
                        )}

                        {/* Theme Cards */}
                        {filteredThemes.map((theme) => (
                            <button
                                key={theme.id}
                                onClick={() => {
                                    onSelectTheme(theme.id);
                                    setIsExpanded(false);
                                }}
                                className={`
                  relative group flex flex-col items-center p-2 rounded-xl border-2 transition-all
                  ${selectedThemeId === theme.id
                                        ? 'border-purple-500 dark:border-purple-400 bg-purple-50 dark:bg-purple-900/20'
                                        : 'border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600'
                                    }
                `}
                            >
                                <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center shadow-inner mb-1"
                                    style={{ background: theme.previewGradient }}
                                >
                                    <span className="text-sm drop-shadow-md">{theme.icon}</span>
                                </div>
                                <span className="text-[9px] font-medium text-zinc-600 dark:text-zinc-400 text-center leading-tight truncate w-full">
                                    {theme.name.split(' ')[0]}
                                </span>
                                {selectedThemeId === theme.id && (
                                    <div className="absolute -top-1 -right-1 bg-purple-500 rounded-full p-0.5">
                                        <Check size={8} className="text-white" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Hint */}
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 text-center mt-3">
                        {selectedThemeId
                            ? 'Theme will be applied as consistent background for all slides'
                            : 'Each slide will get a unique AI-generated background'
                        }
                    </p>
                </div>
            )}
        </div>
    );
};

export default ThemeSelector;
