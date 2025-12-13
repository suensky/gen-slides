import React from 'react';
import SlideShow from './SlideShow';
import { Slide } from '../types';

const MOCK_SLIDES: Slide[] = [
    {
        id: 'mock-1',
        title: 'The Future of AI',
        content: 'Artificial Intelligence is reshaping our world.\nFrom healthcare to transportation, AI is everywhere.\nThe future is automated and intelligent.',
        visualDescription: 'Futuristic city skyline with neon lights, digital aesthetic, cyberpunk style, dark background',
        isGeneratingImage: false,
    },
    {
        id: 'mock-2',
        title: 'Challenges Ahead',
        content: 'Ethical considerations are paramount.\nBias in algorithms needs addressing.\nJob market transformation requires adaptation.',
        visualDescription: 'Abstract representation of neural networks, glowing nodes, complex connections, dark blue theme',
        isGeneratingImage: false,
    },
    {
        id: 'mock-3',
        title: 'Conclusion',
        content: 'Embrace the change.\nLearn continuously.\nBuild a better tomorrow with AI.',
        visualDescription: 'Sunrise over a digital horizon, hopeful and inspiring, warm colors mixed with technology',
        isGeneratingImage: false,
    }
];

interface TestPageProps {
    onBack: () => void;
}

const TestPage: React.FC<TestPageProps> = ({ onBack }) => {
    return (
        <SlideShow 
            slides={MOCK_SLIDES}
            onBack={onBack}
            topic="Test Presentation Deck"
            presentationId="mock-presentation-id"
        />
    )
}

export default TestPage;