
export const mockDiagramResponse = {
    success: true,
    diagram: {
        systemName: "Mock System",
        layers: [
            { name: "Frontend", componentIds: ["c1"] },
            { name: "Backend", componentIds: ["c2"] }
        ],
        components: [
            { id: "c1", name: "Client", type: "frontend" },
            { id: "c2", name: "Server", type: "backend" }
        ],
        connections: [
            { from: "c1", to: "c2", label: "Request", type: "async" }
        ]
    }
};
