import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-full transition-all duration-300 hover:scale-110
        dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-yellow-400
        bg-slate-200 hover:bg-slate-300 text-slate-700"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
            {theme === 'dark' ? (
                <Sun size={18} className="transition-transform duration-300" />
            ) : (
                <Moon size={18} className="transition-transform duration-300" />
            )}
        </button>
    );
};

export default ThemeToggle;
