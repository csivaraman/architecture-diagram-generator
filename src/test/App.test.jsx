import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
    Loader2: () => <div data-testid="loader">Loading...</div>,
    Sparkles: () => <div data-testid="sparkles" />,
    Network: () => <div data-testid="network" />,
    Download: () => <div data-testid="download" />,
    ZoomIn: () => <div data-testid="zoom-in" />,
    ZoomOut: () => <div data-testid="zoom-out" />,
    AlertCircle: () => <div data-testid="alert" />,
    Activity: () => <div data-testid="activity" />
}));

// Mock GoogleGenerativeAI
const mockGenerateContent = vi.fn();
vi.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: vi.fn(() => ({
        getGenerativeModel: vi.fn(() => ({
            generateContent: mockGenerateContent
        }))
    }))
}));

describe('App Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Setup env vars for test
        import.meta.env.VITE_GEMINI_API_KEY_1 = 'test-key-1';
    });

    it('renders the title and input form', () => {
        render(<App />);
        expect(screen.getByText('Architecture Diagram Generator')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Describe your system architecture/i)).toBeInTheDocument();
        expect(screen.getByText('Generate Diagram')).toBeInTheDocument();
    });

    it('updates description input value', () => {
        render(<App />);
        const input = screen.getByPlaceholderText(/Describe your system architecture/i);
        fireEvent.change(input, { target: { value: 'A simple web server' } });
        expect(input.value).toBe('A simple web server');
    });

    it('shows error when description is empty and generate is clicked', () => {
        render(<App />);
        const generateBtn = screen.getByText('Generate Diagram');
        fireEvent.click(generateBtn);
        expect(screen.getByText('Please provide a system description')).toBeInTheDocument();
    });

    it('loads example when button is clicked', () => {
        render(<App />);
        const exampleBtn = screen.getByText('Load Example');
        fireEvent.click(exampleBtn);
        const input = screen.getByPlaceholderText(/Describe your system architecture/i);
        expect(input.value).toContain('scalable e-commerce platform');
    });
});
