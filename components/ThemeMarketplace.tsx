import React, { useState, useMemo } from 'react';
import { X, Check, Palette, Sparkles, ChevronRight } from 'lucide-react';
import { THEME_OPTIONS, THEME_CATEGORIES, ThemeOption, getThemesByCategory, PER_SLIDE_OPTION } from '../services/themes';

interface ThemeMarketplaceProps {
    isOpen: boolean;
    onClose: () => void;
    selectedThemeId: string | null;
    onSelectTheme: (theme: ThemeOption | null) => void;
    onApplyTheme?: () => void;
    isApplying?: boolean;
    showApplyButton?: boolean;
    mode?: 'selection' | 'application'; // 'selection' for OutlineEditor, 'application' for SlideShow
}

const ThemeMarketplace: React.FC<ThemeMarketplaceProps> = ({
    isOpen,
    onClose,
    selectedThemeId,
    onSelectTheme,
    onApplyTheme,
    isApplying = false,
    showApplyButton = false,
    mode = 'selection'
}) => {
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [hoveredTheme, setHoveredTheme] = useState<string | null>(null);

    const filteredThemes = useMemo(() => {
        return getThemesByCategory(activeCategory);
    }, [activeCategory]);

    const allCategories = useMemo(() => [
        { id: 'all', name: 'All', icon: '✨' },
        ...THEME_CATEGORIES
    ], []);

    if (!isOpen) return null;

    return (
        <div className="h-full flex flex-col bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-800 overflow-hidden">
            {/* Header */}
            <div className="flex-none px-4 py-4 border-b border-slate-200 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl">
                            <Palette size={16} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-zinc-800 dark:text-white text-sm">Theme Market</h3>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Choose a style for your slides</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Category Tabs */}
            <div className="flex-none px-3 py-3 border-b border-slate-100 dark:border-zinc-800/50 overflow-x-auto">
                <div className="flex gap-1.5 min-w-max">
                    {allCategories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`
                px-3 py-1.5 rounded-full text-xs font-medium transition-all
                ${activeCategory === cat.id
                                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow-sm'
                                    : 'bg-slate-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
                                }
              `}
                        >
                            <span className="mr-1">{cat.icon}</span>
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Theme Grid */}
            <div className="flex-1 overflow-y-auto p-3">
                <div className="space-y-2">
                    {/* Per-Slide Images Option */}
                    {activeCategory === 'all' && (
                        <button
                            onClick={() => onSelectTheme(null)}
                            onMouseEnter={() => setHoveredTheme('per-slide')}
                            onMouseLeave={() => setHoveredTheme(null)}
                            className={`
                w-full p-3 rounded-xl border-2 transition-all duration-200 text-left
                ${selectedThemeId === null
                                    ? 'border-purple-500 dark:border-purple-400 bg-purple-50 dark:bg-purple-900/20 shadow-lg shadow-purple-500/20'
                                    : 'border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-800/50'
                                }
                ${hoveredTheme === 'per-slide' ? 'transform scale-[1.01]' : ''}
              `}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-12 h-12 rounded-lg flex items-center justify-center text-lg"
                                    style={{ background: PER_SLIDE_OPTION.previewGradient }}
                                >
                                    <Sparkles size={20} className="text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-zinc-800 dark:text-white text-sm">
                                            {PER_SLIDE_OPTION.name}
                                        </span>
                                        {selectedThemeId === null && (
                                            <Check size={14} className="text-purple-500 dark:text-purple-400" />
                                        )}
                                    </div>
                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                                        {PER_SLIDE_OPTION.description}
                                    </p>
                                </div>
                                <ChevronRight size={14} className="text-zinc-400 flex-none" />
                            </div>
                        </button>
                    )}

                    {/* Theme Cards */}
                    {filteredThemes.map((theme) => (
                        <button
                            key={theme.id}
                            onClick={() => onSelectTheme(theme)}
                            onMouseEnter={() => setHoveredTheme(theme.id)}
                            onMouseLeave={() => setHoveredTheme(null)}
                            className={`
                w-full p-3 rounded-xl border-2 transition-all duration-200 text-left
                ${selectedThemeId === theme.id
                                    ? 'border-purple-500 dark:border-purple-400 bg-purple-50 dark:bg-purple-900/20 shadow-lg shadow-purple-500/20'
                                    : 'border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-800/50'
                                }
                ${hoveredTheme === theme.id ? 'transform scale-[1.01]' : ''}
              `}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-12 h-12 rounded-lg flex items-center justify-center text-lg shadow-inner"
                                    style={{ background: theme.previewGradient }}
                                >
                                    <span className="drop-shadow-md">{theme.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-zinc-800 dark:text-white text-sm">
                                            {theme.name}
                                        </span>
                                        {selectedThemeId === theme.id && (
                                            <Check size={14} className="text-purple-500 dark:text-purple-400" />
                                        )}
                                    </div>
                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                                        {theme.description}
                                    </p>
                                </div>
                                <ChevronRight size={14} className="text-zinc-400 flex-none" />
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Footer with Apply Button */}
            {showApplyButton && (
                <div className="flex-none px-4 py-3 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50">
                    <button
                        onClick={onApplyTheme}
                        disabled={isApplying || selectedThemeId === null}
                        className={`
              w-full py-2.5 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all
              ${selectedThemeId !== null
                                ? 'bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-700 dark:hover:bg-zinc-200 shadow-lg'
                                : 'bg-slate-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
                            }
            `}
                    >
                        {isApplying ? (
                            <>
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                Applying...
                            </>
                        ) : (
                            <>
                                <Sparkles size={16} />
                                Apply to Selected Slides
                            </>
                        )}
                    </button>
                    <p className="text-[10px] text-center text-zinc-400 dark:text-zinc-500 mt-2">
                        {selectedThemeId
                            ? 'Generate consistent themed background'
                            : 'Select a theme to apply'
                        }
                    </p>
                </div>
            )}
        </div>
    );
};

export default ThemeMarketplace;
