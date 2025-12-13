import React, { useState } from 'react';
import { Clock, Trash2, Play, PanelLeftClose, PanelLeft, Plus, MessageSquare } from 'lucide-react';
import { PresentationData } from '../types';
import ConfirmationModal from './ConfirmationModal';

interface SidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
    history: PresentationData[];
    onLoadHistory: (presentation: PresentationData) => void;
    onDeleteHistory: (id: string) => void;
    onNewChat: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    isCollapsed,
    onToggle,
    history,
    onLoadHistory,
    onDeleteHistory,
    onNewChat
}) => {
    const [presentationToDelete, setPresentationToDelete] = useState<string | null>(null);

    const formatDate = (ts: number) => {
        return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    const confirmDelete = () => {
        if (presentationToDelete) {
            onDeleteHistory(presentationToDelete);
            setPresentationToDelete(null);
        }
    };

    return (
        <>
            <aside
                className={`
                    h-full flex flex-col
                    bg-slate-100 dark:bg-zinc-900
                    border-r border-slate-200 dark:border-zinc-800
                    transition-all duration-300 ease-in-out
                    ${isCollapsed ? 'w-16' : 'w-64'}
                `}
            >
                {/* Header with Toggle */}
                <div className={`flex items-center p-3 border-b border-slate-200 dark:border-zinc-800 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                    {!isCollapsed && (
                        <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                            History
                        </span>
                    )}
                    <button
                        onClick={onToggle}
                        className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-lg transition"
                        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {isCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
                    </button>
                </div>

                {/* New Chat Button */}
                <div className={`p-2 ${isCollapsed ? 'px-2' : 'px-3'}`}>
                    <button
                        onClick={onNewChat}
                        className={`
                            w-full flex items-center gap-2 p-2.5 rounded-lg
                            bg-gradient-to-r from-purple-500 to-blue-500
                            text-white font-medium text-sm
                            hover:from-purple-600 hover:to-blue-600
                            transition-all duration-200
                            ${isCollapsed ? 'justify-center' : 'justify-start'}
                        `}
                        title="New presentation"
                    >
                        <Plus size={18} />
                        {!isCollapsed && <span>New</span>}
                    </button>
                </div>

                {/* History List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    {history.length === 0 ? (
                        <div className={`py-8 text-center ${isCollapsed ? 'px-1' : 'px-2'}`}>
                            {isCollapsed ? (
                                <Clock size={16} className="mx-auto text-zinc-400 dark:text-zinc-600" />
                            ) : (
                                <p className="text-xs text-zinc-400 dark:text-zinc-600">No history yet</p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {history.sort((a, b) => b.createdAt - a.createdAt).map((deck) => (
                                <div
                                    key={deck.id}
                                    className={`
                                        group relative rounded-lg
                                        hover:bg-slate-200 dark:hover:bg-zinc-800
                                        transition-colors cursor-pointer
                                        ${isCollapsed ? 'p-2 flex justify-center' : 'p-2.5'}
                                    `}
                                    onClick={() => onLoadHistory(deck)}
                                    title={deck.topic}
                                >
                                    {isCollapsed ? (
                                        /* Collapsed: Icon only */
                                        <MessageSquare size={18} className="text-zinc-500 dark:text-zinc-400" />
                                    ) : (
                                        /* Expanded: Full content */
                                        <>
                                            <div className="flex items-start gap-2 pr-12">
                                                <MessageSquare size={16} className="text-zinc-400 dark:text-zinc-500 mt-0.5 flex-shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm text-zinc-700 dark:text-zinc-200 truncate font-medium">
                                                        {deck.topic}
                                                    </p>
                                                    <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-0.5">
                                                        {formatDate(deck.createdAt)} · {deck.slides.length} slides
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Action buttons - show on hover */}
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setPresentationToDelete(deck.id); }}
                                                    className="p-1 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-slate-300 dark:hover:bg-zinc-700 rounded transition"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onLoadHistory(deck); }}
                                                    className="p-1 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded transition"
                                                    title="Open"
                                                >
                                                    <Play size={14} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </aside>

            <ConfirmationModal
                isOpen={!!presentationToDelete}
                title="Delete Presentation"
                message="Are you sure you want to delete this presentation? This action cannot be undone."
                confirmText="Delete"
                isDangerous={true}
                onClose={() => setPresentationToDelete(null)}
                onConfirm={confirmDelete}
            />
        </>
    );
};

export default Sidebar;
