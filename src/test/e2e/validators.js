export const validators = {
    validateStructure: (data) => {
        const errors = [];
        if (!data.systemName) errors.push('Missing systemName');
        if (!Array.isArray(data.components)) errors.push('Missing components array');
        if (!Array.isArray(data.connections)) errors.push('Missing connections array');
        if (!Array.isArray(data.layers)) errors.push('Missing layers array');

        data.components?.forEach((comp, index) => {
            if (!comp.id) errors.push(`Component at index ${index} missing id`);
            if (!comp.name) errors.push(`Component at index ${index} missing name`);
            if (!comp.type) errors.push(`Component at index ${index} missing type`);
        });

        data.connections?.forEach((conn, index) => {
            if (!conn.from) errors.push(`Connection at index ${index} missing from`);
            if (!conn.to) errors.push(`Connection at index ${index} missing to`);

            // Check referential integrity
            const fromExists = data.components.some(c => c.id === conn.from);
            const toExists = data.components.some(c => c.id === conn.to);

            if (!fromExists) errors.push(`Connection from '${conn.from}' points to non-existent component`);
            if (!toExists) errors.push(`Connection to '${conn.to}' points to non-existent component`);
        });

        // Validate Components
        data.components?.forEach((comp, index) => {
            if (!comp.id) errors.push(`Component at index ${index} missing id`);
            if (!comp.name) errors.push(`Component at index ${index} missing name`);
            if (!comp.type) errors.push(`Component at index ${index} missing type`);

            // Check for duplicate IDs
            const duplicateCount = data.components.filter(c => c.id === comp.id).length;
            if (duplicateCount > 1) errors.push(`Duplicate component ID found: ${comp.id}`);
        });

        return errors;
    },

    validateCloudIcons: (data, cloudProvider) => {
        if (!cloudProvider || cloudProvider === 'none') return [];

        const errors = [];
        // Only count components that are likely to be cloud services (exclude user, frontend client, etc.)
        const cloudEligibleComponents = data.components.filter(c =>
            !['user', 'client', 'browser', 'frontend-app'].includes(c.type.toLowerCase())
        );

        if (cloudEligibleComponents.length === 0) return [];

        const componentsWithTargetIcon = cloudEligibleComponents.filter(c => c.cloudProvider === cloudProvider);
        const iconPercentage = componentsWithTargetIcon.length / cloudEligibleComponents.length;

        // Detection for multi-cloud: metadata or component names
        const promptText = (data.systemName + " " + (data.components?.map(c => c.name + " " + (c.technologies?.join(" ") || "")).join(" ") || "")).toLowerCase();
        const mentionsOtherCloud = (cloudProvider !== 'aws' && /aws|amazon/i.test(promptText)) ||
            (cloudProvider !== 'azure' && /azure/i.test(promptText)) ||
            (cloudProvider !== 'gcp' && /gcp|google/i.test(promptText));

        const isMultiCloud = mentionsOtherCloud || cloudEligibleComponents.some(c => c.cloudProvider && c.cloudProvider !== cloudProvider);
        const threshold = isMultiCloud ? 0.3 : 0.6;

        if (iconPercentage < threshold && cloudProvider !== 'none') {
            errors.push(`Low cloud icon coverage for ${cloudProvider}: ${(iconPercentage * 100).toFixed(1)}% (Expected > ${(threshold * 100).toFixed(0)}%)`);
        }

        return errors;
    },

    validatePerformance: (latency, provider) => {
        const errors = [];
        // Gemini can be slow for complex prompts, increasing limit to 60s
        const maxLatency = provider === 'groq' ? 10000 : 60000;

        if (latency > maxLatency) {
            errors.push(`Response time exceeded limit: ${latency}ms > ${maxLatency}ms`);
        }

        return errors;
    },

    validateLayout: (data) => {
        const errors = [];

        // Dynamic import of layout tools inside the function if needed, 
        // but it's better to assume we can import them at top level if environment allows.
        // For E2E tests running in Vitest/Node, we need to ensure the imports work.

        try {
            // Note: Since this is purely a heuristic or we need actual layout logic,
            // we'll implement a simplified box-collision check for connections and labels.

            // 1. Check for overlapping components (sanity check)
            data.components?.forEach((c1, i) => {
                data.components?.forEach((c2, j) => {
                    if (i <= j) return;
                    // Mock coordinates if not provided (server returns structure, frontend does layout)
                    // If server does NOT return coordinates, we can't check overlaps without simulating layout.
                    if (c1.x !== undefined && c2.x !== undefined) {
                        const dx = Math.abs(c1.x - c2.x);
                        const dy = Math.abs(c1.y - c2.y);
                        if (dx < 100 && dy < 60) {
                            errors.push(`Overlapping components: ${c1.id} and ${c2.id}`);
                        }
                    }
                });
            });

            // 2. Connector length/path check (if coordinates available)
            // If the LLM generates coords (it doesn't usually, the frontend does), we validate.
            // But usually we validate that the schema allows for good layout.

            // 3. Label Text Length Heuristic
            data.connections?.forEach((conn, index) => {
                if (conn.label && conn.label.length > 40) {
                    errors.push(`Connection label too long (unlikely to fit): "${conn.label.substring(0, 20)}..."`);
                }
            });

            // 4. Overcrowded nodes (too many connections on one node can lead to overlap)
            data.components?.forEach(comp => {
                const connectionCount = data.connections.filter(c => c.from === comp.id || c.to === comp.id).length;
                if (connectionCount > 8) {
                    errors.push(`Component '${comp.id}' has too many connections (${connectionCount}), likely to cause layout overlaps.`);
                }
            });

        } catch (err) {
            errors.push(`Layout validation crashed: ${err.message}`);
        }

        return errors;
    }
};
