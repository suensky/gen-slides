import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SlideShow from '../components/SlideShow';
import { usePresentationStore } from '../store/usePresentationStore';

const SlideshowPage: React.FC = () => {
  const navigate = useNavigate();
  const { presentationId } = useParams();

  const loadPresentation = usePresentationStore((s) => s.loadPresentation);
  const presentation = usePresentationStore((s) => (presentationId ? s.presentationsById[presentationId] : undefined));
  const getImageConfig = usePresentationStore((s) => s.getImageConfig);
  const loadHistory = usePresentationStore((s) => s.loadHistory);

  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!presentationId) return;
    let cancelled = false;
    loadPresentation(presentationId)
      .then((p) => {
        if (cancelled) return;
        if (!p) setNotFound(true);
      })
      .catch(() => {
        if (cancelled) return;
        setNotFound(true);
      });
    return () => {
      cancelled = true;
    };
  }, [loadPresentation, presentationId]);

  if (!presentationId || notFound) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold">Presentation not found</p>
          <button
            className="mt-4 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition"
            onClick={() => navigate('/')}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!presentation) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  return (
    <SlideShow
      topic={presentation.topic}
      slides={presentation.slides}
      presentationId={presentation.id}
      imageConfig={getImageConfig(presentationId)}
      initialThemeId={presentation.themeId || null}
      onBack={() => {
        void loadHistory();
        navigate('/');
      }}
    />
  );
};

export default SlideshowPage;
