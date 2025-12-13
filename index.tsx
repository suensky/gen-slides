import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import AudienceWindow from './components/AudienceWindow';
import { Slide } from './types';
import { getActivePresentationSlides } from './services/db';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Check if this is the audience window
const urlParams = new URLSearchParams(window.location.search);
const isAudienceMode = urlParams.get('mode') === 'audience';

const root = ReactDOM.createRoot(rootElement);

if (isAudienceMode) {
  // Audience window mode - get slides from IndexedDB
  const startIndex = parseInt(urlParams.get('startIndex') || '0', 10);

  // Show loading state while fetching from IndexedDB
  root.render(
    <div className="fixed inset-0 bg-black flex items-center justify-center text-white">
      <div className="text-center">
        <p className="text-xl mb-2">Loading presentation...</p>
      </div>
    </div>
  );

  // Load slides from IndexedDB
  getActivePresentationSlides().then((slides) => {
    if (slides && slides.length > 0) {
      root.render(
        <React.StrictMode>
          <AudienceWindow slides={slides as Slide[]} initialIndex={startIndex} />
        </React.StrictMode>
      );
    } else {
      root.render(
        <div className="fixed inset-0 bg-black flex items-center justify-center text-white">
          <div className="text-center">
            <p className="text-xl mb-2">Waiting for presentation...</p>
            <p className="text-zinc-400 text-sm">This window will display slides from the presenter.</p>
          </div>
        </div>
      );
    }
  }).catch((error) => {
    console.error('Failed to load slides:', error);
    root.render(
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-xl mb-2 text-red-400">Failed to load presentation</p>
          <p className="text-zinc-400 text-sm">{error.message}</p>
        </div>
      </div>
    );
  });
} else {
  // Normal app mode
  root.render(
    <React.StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </React.StrictMode>
  );
}