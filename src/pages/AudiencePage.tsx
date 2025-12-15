import React, { useEffect, useMemo, useState } from 'react';
import AudienceWindow from '../components/AudienceWindow';
import { Slide } from '../types';
import { getActivePresentationSlides } from '../services/db';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; slides: Slide[] }
  | { status: 'empty' }
  | { status: 'error'; message: string };

const AudiencePage: React.FC = () => {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const startIndex = Number.parseInt(params.get('startIndex') || '0', 10) || 0;
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    getActivePresentationSlides()
      .then((slides) => {
        if (cancelled) return;
        if (slides && slides.length > 0) setState({ status: 'ready', slides: slides as Slide[] });
        else setState({ status: 'empty' });
      })
      .catch((error: any) => {
        if (cancelled) return;
        setState({ status: 'error', message: error?.message || 'Failed to load presentation' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === 'loading') {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-xl mb-2">Loading presentation...</p>
        </div>
      </div>
    );
  }

  if (state.status === 'empty') {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-xl mb-2">Waiting for presentation...</p>
          <p className="text-zinc-400 text-sm">This window will display slides from the presenter.</p>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-xl mb-2 text-red-400">Failed to load presentation</p>
          <p className="text-zinc-400 text-sm">{state.message}</p>
        </div>
      </div>
    );
  }

  return <AudienceWindow slides={state.slides} initialIndex={startIndex} />;
};

export default AudiencePage;
