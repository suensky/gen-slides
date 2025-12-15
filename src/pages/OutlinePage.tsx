import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import OutlineEditor from '../components/OutlineEditor';
import { Attachment, PresentationData, Slide } from '../types';
import { savePresentation } from '../services/db';
import { usePresentationStore } from '../store/usePresentationStore';

const OutlinePage: React.FC = () => {
  const navigate = useNavigate();
  const { presentationId } = useParams();

  const loadPresentation = usePresentationStore((s) => s.loadPresentation);
  const presentation = usePresentationStore((s) => (presentationId ? s.presentationsById[presentationId] : undefined));
  const getDraftAttachments = usePresentationStore((s) => s.getDraftAttachments);
  const clearDraft = usePresentationStore((s) => s.clearDraft);
  const deletePresentation = usePresentationStore((s) => s.deletePresentation);
  const setCurrentPresentation = usePresentationStore((s) => s.setCurrentPresentation);
  const addToHistory = usePresentationStore((s) => s.addToHistory);

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

  const initialAttachments: Attachment[] = useMemo(() => {
    if (!presentationId) return [];
    return getDraftAttachments(presentationId);
  }, [getDraftAttachments, presentationId]);

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

  const topic = presentation?.topic || '';

  const onGenerateSlides = async (finalizedSlides: Slide[], themeId: string | null) => {
    const base: PresentationData = presentation || {
      id: presentationId,
      topic: topic || 'Untitled Presentation',
      slides: [],
      createdAt: Date.now(),
    };

    const newPresentation: PresentationData = {
      ...base,
      slides: finalizedSlides,
      createdAt: Date.now(),
      themeId: themeId || undefined,
    };

    await savePresentation(newPresentation);
    addToHistory(newPresentation);
    setCurrentPresentation(newPresentation);

    clearDraft(presentationId);
    navigate(`/presentations/${presentationId}/slides`);
  };

  return (
    <OutlineEditor
      topic={topic}
      initialAttachments={initialAttachments}
      onBack={() => {
        clearDraft(presentationId);
        if ((presentation?.slides?.length || 0) === 0) void deletePresentation(presentationId);
        navigate('/');
      }}
      onGenerateSlides={onGenerateSlides}
    />
  );
};

export default OutlinePage;
