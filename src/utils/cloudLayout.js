import { getCloudIcon, getCloudBadge, normalizeServiceName } from './cloudIcons';
import { getGroupStyle } from './cloudGroupStyles';

export const layoutCloudDiagram = (architecture, systemName, { isMobile, isTablet }) => {
    const COMP_WIDTH = 180;
    const COMP_HEIGHT = 180;   // taller to fit icon + label + service + techs
    const GAP = 80;
    const GROUP_PADDING = 80;  // space for group label + border
    const TITLE_SPACE = 120;   // Generous title space for top positioning

    // 1. Build group tree
    // Initialize map with all groups
    const groupMap = new Map();
    if (architecture.groups) {
        architecture.groups.forEach(g => {
            groupMap.set(g.id, { ...g, children: [], bounds: null });
        });
    }

    const rootGroups = [];
    const orphanComponentIds = new Set(architecture.components.map(c => c.id));

    // Build tree structure
    groupMap.forEach(group => {
        if (group.parentGroupId && groupMap.has(group.parentGroupId)) {
            groupMap.get(group.parentGroupId).children.push(group);
        } else {
            rootGroups.push(group);
        }
        // Mark components in this group as not orphans
        if (group.componentIds) {
            group.componentIds.forEach(id => orphanComponentIds.delete(id));
        }
    });

    // Helper to sort groups recursively based on priority terms
    const sortGroupsRecursively = (groups) => {
        if (!groups || groups.length === 0) return;

        const priorityTerms = ['user', 'client', 'external', 'presentation'];
        groups.sort((a, b) => {
            const aName = (a.name || '').toLowerCase();
            const bName = (b.name || '').toLowerCase();
            const aType = (a.groupType || '').toLowerCase();
            const bType = (b.groupType || '').toLowerCase();

            const aPriority = priorityTerms.some(term => aName.includes(term) || aType.includes(term));
            const bPriority = priorityTerms.some(term => bName.includes(term) || bType.includes(term));

            if (aPriority && !bPriority) return -1;
            if (!aPriority && bPriority) return 1;
            return 0; // Keep original order if possible
        });

        // Recurse into children
        groups.forEach(g => {
            if (g.children && g.children.length > 0) {
                sortGroupsRecursively(g.children);
            }
        });
    };

    // Apply recursive sorting starting from root
    sortGroupsRecursively(rootGroups);

    // 1b. Fix Orphan Detection: Check components that declare membership via groupId
    // (This fixes the issue where components with valid groupId were incorrectly flagged as orphans)
    architecture.components.forEach(c => {
        if (c.groupId && groupMap.has(c.groupId)) {
            orphanComponentIds.delete(c.id);
        }
    });

    // 2. Recursively calculate bounds and positions
    const positionedComponents = new Map();
    const positionedGroups = [];

    const layoutGroup = (group, startX, startY) => {
        let curX = startX + GROUP_PADDING;
        let curY = startY + GROUP_PADDING + 20; // +20 for label
        let maxRowHeight = 0;
        let maxWidth = 0;

        // Layout direct components in this group
        const directComps = architecture.components.filter(c => c.groupId === group.id || (group.componentIds && group.componentIds.includes(c.id)));

        // Remove from orphan set
        directComps.forEach(c => orphanComponentIds.delete(c.id));

        // Group components by Tier for vertical stacking
        const tiers = {
            top: [],    // user, frontend, external
            middle: [], // api, service, queue, compute
            bottom: []  // database, cache, storage
        };

        directComps.forEach(comp => {
            const type = comp.type?.toLowerCase() || 'service';
            if (['user', 'frontend', 'external', 'client'].includes(type) || comp.name.toLowerCase().includes('client') || comp.name.toLowerCase().includes('frontend')) {
                tiers.top.push(comp);
            } else if (['database', 'cache', 'storage', 'db'].includes(type) || comp.name.toLowerCase().includes('db') || comp.name.toLowerCase().includes('database') || comp.name.toLowerCase().includes('s3') || comp.name.toLowerCase().includes('bucket')) {
                tiers.bottom.push(comp);
            } else {
                tiers.middle.push(comp);
            }
        });

        // Layout Tiers Vertically
        ['top', 'middle', 'bottom'].forEach(tierName => {
            const tierComps = tiers[tierName];
            if (tierComps.length === 0) return;

            // Sort tier components by connection topology (simple heuristic)
            tierComps.sort((a, b) => a.name.localeCompare(b.name));

            // Grid Layout Constants
            const MAX_COLS = 4;
            let currentTierHeight = 0;
            let currentTierWidth = 0;

            tierComps.forEach((comp, i) => {
                const normalizedService = comp.cloudService ? normalizeServiceName(comp.cloudService) : '';
                const cloudIconUrl = comp.cloudProvider ? getCloudIcon(comp.cloudProvider, normalizedService) : null;

                const col = i % MAX_COLS;
                const row = Math.floor(i / MAX_COLS);

                const compX = startX + GROUP_PADDING + col * (COMP_WIDTH + GAP);
                const compY = curY + row * (COMP_HEIGHT + GAP);

                positionedComponents.set(comp.id, {
                    ...comp,
                    x: compX + COMP_WIDTH / 2,
                    y: compY + COMP_HEIGHT / 2,
                    width: COMP_WIDTH,
                    height: COMP_HEIGHT,
                    cloudIconUrl,
                    normalizedService,
                    cloudProvider: comp.cloudProvider || architecture.cloudProvider
                });

                currentTierWidth = Math.max(currentTierWidth, (col + 1) * (COMP_WIDTH + GAP));
                currentTierHeight = (row + 1) * (COMP_HEIGHT + GAP);
            });

            // Update group dimensions based on this tier
            maxWidth = Math.max(maxWidth, currentTierWidth);

            // Move Y down for next tier
            curY += currentTierHeight; // GAP is already included in row height calculation
            maxRowHeight += currentTierHeight;
        });

        // Layout child groups VERTICALLY (with conditional horizontal for small siblings)
        if (group.children && group.children.length > 0) {
            let childGroupsX = startX + GROUP_PADDING;
            let i = 0;

            const getCompCount = (g) => architecture.components.filter(c => c.groupId === g.id || (g.componentIds && g.componentIds.includes(c.id))).length;

            while (i < group.children.length) {
                const current = group.children[i];
                const next = group.children[i + 1];

                const countCurrent = getCompCount(current);
                const countNext = next ? getCompCount(next) : 999;

                if ((countCurrent + countNext) <= 4) {
                    // Place side-by-side
                    const b1 = layoutGroup(current, childGroupsX, curY);
                    const b2 = layoutGroup(next, childGroupsX + b1.width + GAP, curY);

                    // Row height is max of both
                    const rowHeight = Math.max(b1.height, b2.height);

                    // Row width is sum of both + gap
                    const rowWidth = b1.width + GAP + b2.width;

                    curY += rowHeight + GAP;

                    // Update maxWidth relative to parent group start
                    // childGroupsX - startX = GROUP_PADDING
                    maxWidth = Math.max(maxWidth, rowWidth + GROUP_PADDING);

                    i += 2;
                } else {
                    // Standard vertical
                    const b = layoutGroup(current, childGroupsX, curY);
                    curY += b.height + GAP;
                    maxWidth = Math.max(maxWidth, b.width + GROUP_PADDING);
                    i++;
                }
            }
        }

        const myWidth = Math.max(maxWidth, 200) + GROUP_PADDING;

        // Final bounds calculation
        const bounds = {
            x: startX,
            y: startY,
            width: myWidth,
            height: (curY - startY) + GROUP_PADDING / 2
        };

        positionedGroups.push({ ...group, ...bounds });
        return bounds;
    };

    let x = 60; // Increased from 20 to prevents left-side label cutoff
    let totalHeight = TITLE_SPACE;

    // Layout orphaned components first (if any)
    const orphans = Array.from(orphanComponentIds).map(id => architecture.components.find(c => c.id === id)).filter(Boolean);
    if (orphans.length > 0) {
        // Wrap them in a "Default" group? Or just place them?
        // Let's place them in a row at top?
        // Or create a dummy group.
        const dummyGroup = {
            id: 'orphans',
            name: 'Ungrouped Resources',
            groupType: 'region', // styling fallback
            children: [],
            componentIds: orphans.map(c => c.id)
        };
        // Add to root groups
        rootGroups.unshift(dummyGroup);
    }

    rootGroups.forEach(group => {
        const bounds = layoutGroup(group, x, TITLE_SPACE);
        x += bounds.width + GAP;
        totalHeight = Math.max(totalHeight, bounds.height + TITLE_SPACE + 40);
    });

    const EXTRA_PADDING = 200; // Extra space for connectors/labels that might detour outside groups

    // Filter out empty groups (no components AND no children)
    const finalGroups = positionedGroups.filter(g => {
        // A group is empty if:
        // 1. It has no components assigned to it (via groupId or componentIds)
        // 2. AND it has no children groups

        const hasComponents = architecture.components.some(c => c.groupId === g.id || (g.componentIds && g.componentIds.includes(c.id)));
        const hasChildren = g.children && g.children.length > 0;

        return hasComponents || hasChildren;
    });

    // Center the content horizontally
    const minX = Math.min(...finalGroups.map(g => g.x), ...Array.from(positionedComponents.values()).map(c => c.x - c.width / 2));
    const maxX = Math.max(...finalGroups.map(g => g.x + g.width), ...Array.from(positionedComponents.values()).map(c => c.x + c.width / 2));
    const contentWidth = maxX - minX;

    const finalWidth = Math.max(contentWidth + EXTRA_PADDING * 2, 1200);

    // Calculate how much to shift everything to perfectly center it in finalWidth
    const currentCenter = minX + (contentWidth / 2);
    const targetCenter = finalWidth / 2;
    const offsetX = targetCenter - currentCenter;

    if (offsetX !== 0) {
        positionedComponents.forEach(comp => {
            comp.x += offsetX;
        });
        finalGroups.forEach(group => {
            group.x += offsetX;
        });
    }

    return {
        systemName,
        width: finalWidth,
        height: totalHeight + EXTRA_PADDING,
        components: Array.from(positionedComponents.values()),
        connections: architecture.connections,
        groups: finalGroups,
        cloudProvider: architecture.cloudProvider,
        isCloudMode: true
    };
};

