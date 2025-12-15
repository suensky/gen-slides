import yaml from 'js-yaml';

// Theme types
export interface ThemeCategory {
    id: string;
    name: string;
    icon: string;
}

export interface ThemeOption {
    id: string;
    name: string;
    category: string;
    description: string;
    previewGradient: string;
    icon: string;
    promptSnippet: string;
}

interface ThemesConfig {
    categories: ThemeCategory[];
    themes: ThemeOption[];
}

// Theme YAML content - loaded at build time via Vite's ?raw import
import themesYaml from '../config/themes.yaml?raw';

// Parse the YAML configuration
const config = yaml.load(themesYaml) as ThemesConfig;

export const THEME_CATEGORIES: ThemeCategory[] = config.categories;
export const THEME_OPTIONS: ThemeOption[] = config.themes;

// Helper function to get themes by category
export const getThemesByCategory = (categoryId: string): ThemeOption[] => {
    if (categoryId === 'all') return THEME_OPTIONS;
    return THEME_OPTIONS.filter(theme => theme.category === categoryId);
};

// Helper function to get a single theme by ID
export const getThemeById = (themeId: string): ThemeOption | undefined => {
    return THEME_OPTIONS.find(theme => theme.id === themeId);
};

// Helper function to get category by ID
export const getCategoryById = (categoryId: string): ThemeCategory | undefined => {
    return THEME_CATEGORIES.find(cat => cat.id === categoryId);
};

// Special "per-slide" option for individual image generation
export const PER_SLIDE_OPTION = {
    id: 'per-slide',
    name: 'Per-Slide Images',
    category: 'default',
    description: 'Generate unique AI images for each slide',
    previewGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    icon: '🎯',
    promptSnippet: ''
} as const;
