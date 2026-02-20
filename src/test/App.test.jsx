import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock Lucide icons
// Mock Lucide icons
vi.mock('lucide-react', () => ({
    Loader2: () => <div data-testid="loader">Loading...</div>,
    Sparkles: () => <div data-testid="sparkles" />,
    Network: () => <div data-testid="network" />,
    Download: () => <div data-testid="download" />,
    ZoomIn: () => <div data-testid="zoom-in" />,
    ZoomOut: () => <div data-testid="zoom-out" />,
    AlertCircle: () => <div data-testid="alert" />,
    Info: () => <div data-testid="info" />,
    AlertTriangle: () => <div data-testid="alert-triangle" />,
    Linkedin: () => <div data-testid="linkedin" />,
    Edit: () => <div data-testid="edit" />,
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

    it('loads example when option is selected', async () => {
        const user = userEvent.setup();
        render(<App />);
        const exampleSelect = screen.getByTestId('load-example-select');
        await user.selectOptions(exampleSelect, 'TC026');
        const input = screen.getByPlaceholderText(/Describe your system architecture/i);
        await waitFor(() => expect(input.value).toContain('scalable e-commerce platform'));
    });

    it('renders cloud icons when cloudProvider data is present in the API response', async () => {
        // Mock success response
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                success: true,
                diagram: {
                    systemName: "AWS System",
                    width: 1000,
                    height: 800,
                    paddingTop: 100,
                    layerHeight: 200,
                    components: [
                        { id: "c1", name: "Lambda", type: "backend", cloudProvider: "aws", cloudService: "Lambda", x: 200, y: 200, width: 150, height: 100 },
                        { id: "c2", name: "EC2", type: "compute", cloudProvider: "aws", cloudService: "EC2", x: 400, y: 200, width: 150, height: 100 }
                    ],
                    connections: [],
                    layers: [{ name: "App", componentIds: ["c1", "c2"] }]
                }
            })
        });

        const user = userEvent.setup();
        render(<App />);

        // Enter description
        const textarea = screen.getByPlaceholderText(/Describe your system architecture/i);
        await user.type(textarea, "AWS System");

        // Click generate
        const generateBtn = screen.getByText('Generate Diagram');
        fireEvent.click(generateBtn);

        // Wait for rendering
        await waitFor(() => {
            expect(screen.getByText("AWS System")).toBeInTheDocument();
        });

        // Verify icons
        const images = document.querySelectorAll('image');
        const hrefs = Array.from(images).map(img => img.getAttribute('href'));

        // Check for presence of AWS specific icon paths (case sensitive matching actual files)
        expect(hrefs.some(h => h.includes('AWS-Lambda'))).toBe(true);
        // EC2 icon path contains "Amazon-EC2" (e.g. Arch_Amazon-EC2_64.svg)
        expect(hrefs.some(h => h.includes('Amazon-EC2'))).toBe(true);
    });

    it('renders Azure icons correctly', async () => {
        // Mock success response with Azure services
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                success: true,
                diagram: {
                    systemName: "Azure System",
                    width: 1000,
                    height: 800,
                    paddingTop: 100,
                    layerHeight: 200,
                    components: [
                        { id: "c1", name: "SQL Edge", type: "database", cloudProvider: "azure", cloudService: "Azure SQL Edge", x: 200, y: 200, width: 150, height: 100 },
                        { id: "c2", name: "Load Testing", type: "other", cloudProvider: "azure", cloudService: "Azure Load Testing", x: 400, y: 200, width: 150, height: 100 },
                        { id: "c3", name: "AKS", type: "compute", cloudProvider: "azure", cloudService: "AKS", x: 600, y: 200, width: 150, height: 100 }
                    ],
                    connections: [],
                    layers: [{ name: "App", componentIds: ["c1", "c2", "c3"] }]
                }
            })
        });

        const user = userEvent.setup();
        render(<App />);

        // Enter description
        const textarea = screen.getByPlaceholderText(/Describe your system architecture/i);
        await user.type(textarea, "Azure System");

        // Click generate
        const generateBtn = screen.getByText('Generate Diagram');
        fireEvent.click(generateBtn);

        // Wait for rendering
        await waitFor(() => {
            expect(screen.getByText("Azure System")).toBeInTheDocument();
        });

        // Verify icons
        const images = document.querySelectorAll('image');
        const hrefs = Array.from(images).map(img => img.getAttribute('href'));

        // Check for presence of Azure specific icon paths
        // Note: The actual paths depend on localIconMap resolution
        expect(hrefs.some(h => h.includes('02750-icon-service-Azure-SQL-Edge'))).toBe(true);
        expect(hrefs.some(h => h.includes('02944-icon-service-Azure-Load-Testing'))).toBe(true);
        expect(hrefs.some(h => h.includes('10023-icon-service-Kubernetes-Services'))).toBe(true);
    });
});
