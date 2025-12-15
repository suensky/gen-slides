import React from 'react';
import { useNavigate } from 'react-router-dom';
import Home from '../components/Home';
import { Attachment } from '../types';
import { ImageConfig } from '../services/geminiService';
import { usePresentationStore } from '../store/usePresentationStore';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const createDraft = usePresentationStore((s) => s.createDraft);

  const onSubmit = async (topic: string, attachments: Attachment[], imageConfig: ImageConfig) => {
    const id = await createDraft(topic, attachments, imageConfig);
    navigate(`/presentations/${id}/outline`);
  };

  return <Home onSubmit={onSubmit} />;
};

export default HomePage;
