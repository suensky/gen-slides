import React, { useState, useEffect } from 'react';
import Home from './components/Home';
import OutlineEditor from './components/OutlineEditor';
import SlideShow from './components/SlideShow';
import TestPage from './components/TestPage';
import { Slide, ViewState, PresentationData, Attachment } from './types';
import { getAllPresentations, savePresentation, deletePresentation } from './services/db';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('HOME');
  const [currentPresentation, setCurrentPresentation] = useState<PresentationData | null>(null);
  const [history, setHistory] = useState<PresentationData[]>([]);
  
  // Temporary state to pass attachments to outline editor
  const [tempAttachments, setTempAttachments] = useState<Attachment[]>([]);

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
  const handleCreateOutline = (newTopic: string, attachments: Attachment[] = []) => {
    setCurrentPresentation({
        id: crypto.randomUUID(),
        topic: newTopic || 'Untitled Presentation',
        slides: [],
        createdAt: Date.now()
    });
    setTempAttachments(attachments);
    setView('OUTLINE');
  };

  // Called when user clicks "Generate Slides" from Outline Editor
  const handleGenerateSlides = async (finalizedSlides: Slide[]) => {
    if (!currentPresentation) return;

    const newPresentation: PresentationData = {
        ...currentPresentation,
        slides: finalizedSlides,
        createdAt: Date.now()
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

  const renderView = () => {
    switch (view) {
      case 'HOME':
        return (
            <Home 
                onSubmit={handleCreateOutline} 
                history={history}
                onLoadHistory={handleLoadHistory}
                onDeleteHistory={handleDeleteHistory}
                onTestPage={() => setView('TEST')}
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
            topic={currentPresentation.topic}
            slides={currentPresentation.slides} 
            presentationId={currentPresentation.id}
            onBack={() => {
                loadHistory(); // Refresh history to capture any new images generated
                setView('HOME');
            }} 
          />
        );
      case 'TEST':
        return <TestPage onBack={() => setView('HOME')} />;
      default:
        return (
            <Home 
                onSubmit={handleCreateOutline} 
                history={history} 
                onLoadHistory={handleLoadHistory} 
                onDeleteHistory={handleDeleteHistory}
                onTestPage={() => setView('TEST')}
            />
        );
    }
  };

  return (
    <div className="h-full w-full">
      {renderView()}
    </div>
  );
};

export default App;