import React, { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './app/AppLayout';
import ErrorBoundary from './app/ErrorBoundary';
import AudiencePage from './pages/AudiencePage';
import HomePage from './pages/HomePage';
import OutlinePage from './pages/OutlinePage';
import SlideshowPage from './pages/SlideshowPage';
import { usePresentationStore } from './store/usePresentationStore';

const App: React.FC = () => {
  const loadHistory = usePresentationStore((s) => s.loadHistory);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/audience" element={<AudiencePage />} />

          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="/history" element={<HomePage />} />
            <Route path="/presentations/:presentationId/outline" element={<OutlinePage />} />
            <Route path="/presentations/:presentationId/slides" element={<SlideshowPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
