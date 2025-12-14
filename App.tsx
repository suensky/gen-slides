import React, { useState, useEffect } from 'react';
import Home from './components/Home';
import OutlineEditor from './components/OutlineEditor';
import SlideShow from './components/SlideShow';
import Sidebar from './components/Sidebar';
import { Slide, ViewState, PresentationData, Attachment } from './types';
import { getAllPresentations, savePresentation, deletePresentation } from './services/db';
import { ImageConfig, DEFAULT_IMAGE_CONFIG } from './services/geminiService';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('HOME');
  const [currentPresentation, setCurrentPresentation] = useState<PresentationData | null>(null);
  const [history, setHistory] = useState<PresentationData[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Temporary state to pass attachments to outline editor
  const [tempAttachments, setTempAttachments] = useState<Attachment[]>([]);

  // Image generation config
  const [imageConfig, setImageConfig] = useState<ImageConfig>(DEFAULT_IMAGE_CONFIG);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const decks = await getAllPresentations();
      setHistory(decks);
    } catch (error) {
      console.error("Failed to load history", error);
    }
  };

  // Navigate to Outline Editor
  const handleCreateOutline = (newTopic: string, attachments: Attachment[], config: ImageConfig = DEFAULT_IMAGE_CONFIG) => {
    setCurrentPresentation({
      id: crypto.randomUUID(),
      topic: newTopic || 'Untitled Presentation',
      slides: [],
      createdAt: Date.now()
    });
    setTempAttachments(attachments);
    setImageConfig(config);
    setView('OUTLINE');
  };

  // Called when user clicks "Generate Slides" from Outline Editor
  const handleGenerateSlides = async (finalizedSlides: Slide[], themeId: string | null) => {
    if (!currentPresentation) return;

    const newPresentation: PresentationData = {
      ...currentPresentation,
      slides: finalizedSlides,
      createdAt: Date.now(),
      themeId: themeId || undefined
    };

    // Save initial structure (without images mostly) to DB
    await savePresentation(newPresentation);

    // Update local history state immediately
    setHistory(prev => [newPresentation, ...prev]);

    setCurrentPresentation(newPresentation);
    setTempAttachments([]); // Clear temp attachments
    setView('SLIDESHOW');
  };

  // Called when clicking a history item on Home
  const handleLoadHistory = (presentation: PresentationData) => {
    setCurrentPresentation(presentation);
    setView('SLIDESHOW');
  };

  const handleDeleteHistory = async (id: string) => {
    await deletePresentation(id);
    loadHistory();
  }

  const handleNewChat = () => {
    setCurrentPresentation(null);
    setView('HOME');
  };

  const renderView = () => {
    switch (view) {
      case 'HOME':
        return (
          <Home
            onSubmit={handleCreateOutline}
          />
        );
      case 'OUTLINE':
        return (
          <OutlineEditor
            topic={currentPresentation?.topic || ''}
            initialAttachments={tempAttachments}
            onBack={() => setView('HOME')}
            onGenerateSlides={handleGenerateSlides}
          />
        );
      case 'SLIDESHOW':
        if (!currentPresentation) return null;
        return (
          <SlideShow
            key={currentPresentation.id}
            topic={currentPresentation.topic}
            slides={currentPresentation.slides}
            presentationId={currentPresentation.id}
            imageConfig={imageConfig}
            initialThemeId={currentPresentation.themeId || null}
            onBack={() => {
              loadHistory(); // Refresh history to capture any new images generated
              setView('HOME');
            }}
          />
        );
      default:
        return (
          <Home
            onSubmit={handleCreateOutline}
          />
        );
    }
  };

  return (
    <div className="h-full w-full flex">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        history={history}
        onLoadHistory={handleLoadHistory}
        onDeleteHistory={handleDeleteHistory}
        onNewChat={handleNewChat}
      />
      <main className="flex-1 overflow-hidden">
        {renderView()}
      </main>
    </div>
  );
};

export default App;