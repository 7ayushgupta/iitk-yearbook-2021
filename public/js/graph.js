// Global variables
let allConfessions = [];
let graphData = { nodes: [], links: [] };
let filteredGraphData = { nodes: [], links: [] };
let Graph = null;
let minInteractions = 4; // Default to 4
let highlightedNodeId = null;
let communityColors = [];
let topPeopleFilterEnabled = true; // Enabled by default
let topPeopleCount = 100;

// Color scheme
const colors = {
    male: '#03dac6',
    female: '#bb86fc',
    unknown: '#a0a0a0',
    link: 'rgba(187, 134, 252, 0.3)',
    linkHighlight: '#bb86fc'
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initializeUIState();
    setupCopyLink();
    loadAllData();
});

// Initialize UI state to match default values
function initializeUIState() {
    // Set minimum interactions display
    const minInteractionsValue = document.getElementById('minInteractionsValue');
    const connectionCount = document.getElementById('connectionCount');
    if (minInteractionsValue) {
        minInteractionsValue.textContent = minInteractions;
    }
    if (connectionCount) {
        connectionCount.textContent = minInteractions;
    }
    
    // Set top people filter UI state
    const topPeopleToggle = document.getElementById('topPeopleToggle');
    const topPeopleSliderContainer = document.getElementById('topPeopleSliderContainer');
    const topPeopleValue = document.getElementById('topPeopleValue');
    const topPeopleDescription = document.getElementById('topPeopleDescription');
    
    if (topPeopleToggle) {
        topPeopleToggle.checked = topPeopleFilterEnabled;
        topPeopleValue.textContent = topPeopleFilterEnabled ? 'On' : 'Off';
    }
    
    if (topPeopleSliderContainer) {
        topPeopleSliderContainer.style.display = topPeopleFilterEnabled ? 'block' : 'none';
    }
    
    if (topPeopleDescription) {
        topPeopleDescription.textContent = 
            topPeopleFilterEnabled ? `Showing top ${topPeopleCount} people by confessions` : 'Show all people';
    }
}

// Setup event listeners
function setupEventListeners() {
    const searchPersonSelect = document.getElementById('searchPersonSelect');
    const minInteractionsSlider = document.getElementById('minInteractionsSlider');
    const closeSidebar = document.getElementById('closeSidebar');
    const topPeopleToggle = document.getElementById('topPeopleToggle');
    const topPeopleSlider = document.getElementById('topPeopleSlider');
    const topPeopleSliderContainer = document.getElementById('topPeopleSliderContainer');

    // Search functionality with dropdown
    if (searchPersonSelect) {
        searchPersonSelect.addEventListener('change', (e) => {
            const selectedName = e.target.value;
            if (selectedName) {
                const matchingNode = filteredGraphData.nodes.find(node => 
                    node.name === selectedName
                );
                if (matchingNode) {
                    highlightNodeByName(matchingNode.name);
                }
            } else {
                resetHighlight();
            }
        });
    }

    // Minimum interactions slider
    if (minInteractionsSlider) {
        minInteractionsSlider.addEventListener('input', (e) => {
            minInteractions = parseInt(e.target.value);
            document.getElementById('minInteractionsValue').textContent = minInteractions;
            document.getElementById('connectionCount').textContent = minInteractions;
            filterGraph();
        });
    }

    // Top people filter toggle
    if (topPeopleToggle) {
        topPeopleToggle.addEventListener('change', (e) => {
            topPeopleFilterEnabled = e.target.checked;
            document.getElementById('topPeopleValue').textContent = topPeopleFilterEnabled ? 'On' : 'Off';
            topPeopleSliderContainer.style.display = topPeopleFilterEnabled ? 'block' : 'none';
            document.getElementById('topPeopleDescription').textContent = 
                topPeopleFilterEnabled ? `Showing top ${topPeopleCount} people by memoirs` : 'Show all people';
            
            // Re-filter graph
            filterGraph();
        });
    }

    // Top people count slider
    if (topPeopleSlider) {
        topPeopleSlider.addEventListener('input', (e) => {
            topPeopleCount = parseInt(e.target.value);
            document.getElementById('topPeopleCount').textContent = topPeopleCount;
            document.getElementById('topPeopleDescription').textContent = 
                topPeopleFilterEnabled ? `Showing top ${topPeopleCount} people by memoirs` : 'Show all people';
            
            // Re-filter graph if toggle is enabled
            if (topPeopleFilterEnabled) {
                filterGraph();
            }
        });
    }

    // Close sidebar
    if (closeSidebar) {
        closeSidebar.addEventListener('click', () => {
            closeSidebarPanel();
        });
    }
}

// Load both CSV files
function loadAllData() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    // Load all confessions first
    fetch('data/allConfessions.csv')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(allConfessionsText => {
            // Parse all confessions
            Papa.parse(allConfessionsText, {
                header: true,
                skipEmptyLines: true,
                complete: function(results) {
                    allConfessions = processConfessions(results.data);
                    console.log(`Loaded ${allConfessions.length} total confessions`);
                    
                    // Build graph with all confessions (both public and private are in allConfessions)
                    buildGraph(allConfessions);
                },
                error: function(error) {
                    loadingOverlay.innerHTML = `<div class="loading-text">Error parsing CSV: ${error.message}</div>`;
                }
            });
        })
        .catch(error => {
            loadingOverlay.innerHTML = `<div class="loading-text">Error loading CSV: ${error.message}</div>`;
            console.error('Error:', error);
        });
}

// Process confession data
function processConfessions(data) {
    return data
        .map(row => ({
            text: (row.text || '').trim(),
            author: (row.author || '').trim() || 'Unknown',
            recipient: (row.recipient_name || '').trim() || 'Unknown',
            authorRoll: (row.author_roll || '').trim(),
            recipientRoll: (row.recipient_roll || '').trim(),
            authorGender: (row.author_gender || '').trim().toUpperCase(),
            recipientGender: (row.recipient_gender || '').trim().toUpperCase(),
            visibility: (row.visibility || 'True').trim()
        }))
        .filter(c => c.text && c.text.length > 0 && c.author !== 'Unknown' && c.recipient !== 'Unknown');
}

// Build graph data structure
function buildGraph(confessions) {
    const nodeMap = new Map();
    const linkMap = new Map();

    // Process confessions to build nodes and links
    confessions.forEach(confession => {
        const author = confession.author;
        const recipient = confession.recipient;

        // Add/update author node
        if (!nodeMap.has(author)) {
            nodeMap.set(author, {
                id: author,
                name: author,
                gender: confession.authorGender || 'UNKNOWN',
                roll: confession.authorRoll || '',
                connections: 0,
                confessionsSent: 0,
                confessionsReceived: 0
            });
        }
        const authorNode = nodeMap.get(author);
        authorNode.confessionsSent++;
        authorNode.connections++;

        // Add/update recipient node
        if (!nodeMap.has(recipient)) {
            nodeMap.set(recipient, {
                id: recipient,
                name: recipient,
                gender: confession.recipientGender || 'UNKNOWN',
                roll: confession.recipientRoll || '',
                connections: 0,
                confessionsSent: 0,
                confessionsReceived: 0
            });
        }
        const recipientNode = nodeMap.get(recipient);
        recipientNode.confessionsReceived++;
        recipientNode.connections++;

        // Create link key (always from smaller to larger for consistency in lookup)
        // This allows us to aggregate bidirectional relationships
        const linkKey = author < recipient ? `${author}->${recipient}` : `${recipient}->${author}`;
        
        if (!linkMap.has(linkKey)) {
            // Store both names in sorted order for the link key, but preserve actual direction in messages
            linkMap.set(linkKey, {
                source: author < recipient ? author : recipient,
                target: author < recipient ? recipient : author,
                messages: [],
                count: 0
            });
        }
        const link = linkMap.get(linkKey);
        // Store the actual confession with its original direction
        link.messages.push(confession);
        link.count++;
    });

    // Convert maps to arrays
    graphData.nodes = Array.from(nodeMap.values());
    graphData.links = Array.from(linkMap.values());

    console.log(`Graph built: ${graphData.nodes.length} nodes, ${graphData.links.length} links`);

    // Initial filter and render (this will also update the dropdown)
    filterGraph();
}

// Label Propagation Algorithm for community detection
function detectCommunities() {
    const nodes = filteredGraphData.nodes;
    const links = filteredGraphData.links;
    
    if (nodes.length === 0) return;
    
    // Build adjacency list
    const adjacencyList = new Map();
    nodes.forEach(node => {
        adjacencyList.set(node.id, []);
    });
    
    links.forEach(link => {
        const source = typeof link.source === 'object' ? link.source.id : link.source;
        const target = typeof link.target === 'object' ? link.target.id : link.target;
        adjacencyList.get(source).push(target);
        adjacencyList.get(target).push(source);
    });
    
    // Initialize labels: each node gets its own unique label
    const labels = new Map();
    nodes.forEach((node, index) => {
        labels.set(node.id, index);
    });
    
    // Label propagation iterations
    const maxIterations = 50;
    let changed = true;
    let iterations = 0;
    
    while (changed && iterations < maxIterations) {
        changed = false;
        iterations++;
        
        // Shuffle nodes for random order (helps convergence)
        const shuffledNodes = [...nodes].sort(() => Math.random() - 0.5);
        
        shuffledNodes.forEach(node => {
            const neighbors = adjacencyList.get(node.id);
            if (neighbors.length === 0) return;
            
            // Count label frequencies among neighbors
            const labelCounts = new Map();
            neighbors.forEach(neighborId => {
                const neighborLabel = labels.get(neighborId);
                labelCounts.set(neighborLabel, (labelCounts.get(neighborLabel) || 0) + 1);
            });
            
            // Find most frequent label
            let maxCount = 0;
            let mostFrequentLabel = labels.get(node.id);
            
            labelCounts.forEach((count, label) => {
                if (count > maxCount || (count === maxCount && Math.random() > 0.5)) {
                    maxCount = count;
                    mostFrequentLabel = label;
                }
            });
            
            // Update label if changed
            if (labels.get(node.id) !== mostFrequentLabel) {
                labels.set(node.id, mostFrequentLabel);
                changed = true;
            }
        });
    }
    
    // Assign community IDs to nodes
    const communityMap = new Map();
    let communityId = 0;
    const labelToCommunity = new Map();
    
    nodes.forEach(node => {
        const label = labels.get(node.id);
        if (!labelToCommunity.has(label)) {
            labelToCommunity.set(label, communityId++);
        }
        const community = labelToCommunity.get(label);
        communityMap.set(node.id, community);
        node.community = community;
    });
    
    // Generate distinct colors for communities
    const numCommunities = communityId;
    communityColors = [];
    for (let i = 0; i < numCommunities; i++) {
        const hue = (i * 137.508) % 360; // Golden angle for color distribution
        const saturation = 60 + (i % 3) * 10; // Vary saturation
        const lightness = 50 + (i % 2) * 10; // Vary lightness
        communityColors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
    }
    
    console.log(`Detected ${numCommunities} communities in ${iterations} iterations`);
}

// Filter graph based on minimum interactions
function filterGraph() {
    // Start with all nodes
    let nodesToFilter = [...graphData.nodes];
    
    // Apply top people filter if enabled
    if (topPeopleFilterEnabled) {
        // Sort nodes by confessions sent (descending) and take top N
        nodesToFilter = nodesToFilter
            .sort((a, b) => (b.confessionsSent || 0) - (a.confessionsSent || 0))
            .slice(0, topPeopleCount);
    }
    
    // Get the set of top people IDs if filter is enabled
    const topPeopleIds = topPeopleFilterEnabled ? new Set(nodesToFilter.map(n => n.id)) : null;
    
    // Filter links based on minimum interactions
    filteredGraphData.links = graphData.links.filter(link => {
        if (link.count < minInteractions) return false;
        
        // If top people filter is enabled, only include links where both nodes are in top people
        if (topPeopleIds) {
            const source = typeof link.source === 'object' ? link.source.id : link.source;
            const target = typeof link.target === 'object' ? link.target.id : link.target;
            return topPeopleIds.has(source) && topPeopleIds.has(target);
        }
        
        return true;
    });
    
    // Get unique node IDs from filtered links
    const activeNodeIds = new Set();
    filteredGraphData.links.forEach(link => {
        const source = typeof link.source === 'object' ? link.source.id : link.source;
        const target = typeof link.target === 'object' ? link.target.id : link.target;
        activeNodeIds.add(source);
        activeNodeIds.add(target);
    });

    // Filter nodes to only include those with active connections
    filteredGraphData.nodes = graphData.nodes.filter(node => activeNodeIds.has(node.id));

    // Update stats
    document.getElementById('nodeCount').textContent = filteredGraphData.nodes.length.toLocaleString();
    document.getElementById('linkCount').textContent = filteredGraphData.links.length.toLocaleString();

    // Always detect communities for coloring
    detectCommunities();

    // Re-render graph
    if (Graph) {
        Graph.graphData(filteredGraphData);
    } else {
        initializeGraph();
    }
    
    // Update search dropdown to reflect filtered nodes
    updateSearchDropdown();
}

// Update search dropdown with currently visible nodes
function updateSearchDropdown() {
    const searchPersonSelect = document.getElementById('searchPersonSelect');
    if (!searchPersonSelect) return;
    
    // Get currently selected value
    const selectedValue = searchPersonSelect.value;
    
    // Clear existing options except the first one
    while (searchPersonSelect.children.length > 1) {
        searchPersonSelect.removeChild(searchPersonSelect.lastChild);
    }
    
    // Get all unique people from filtered graph data, sorted alphabetically
    const visiblePeople = Array.from(new Set(filteredGraphData.nodes.map(node => node.name)))
        .filter(name => name && name !== 'Unknown')
        .sort();
    
    // Add options to dropdown
    visiblePeople.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        searchPersonSelect.appendChild(option);
    });
    
    // Restore selection if it's still valid
    if (selectedValue && visiblePeople.includes(selectedValue)) {
        searchPersonSelect.value = selectedValue;
    } else {
        searchPersonSelect.value = '';
    }
}

// Get node color based on community
function getNodeColor(node) {
    if (highlightedNodeId === node.id) {
        return '#ff6b6b';
    }
    
    // Always use community coloring
    if (node.community !== undefined && communityColors[node.community]) {
        return communityColors[node.community];
    }
    return colors.unknown;
}

// Initialize 3D force graph
function initializeGraph() {
    const container = document.getElementById('graph-container');
    
    Graph = ForceGraph3D()(container)
        .graphData(filteredGraphData)
        .nodeLabel(node => `${node.name}\n${node.connections} connections`)
        .nodeColor(node => getNodeColor(node))
        .nodeRelSize(4)
        .nodeResolution(16)
        .linkColor(() => colors.link)
        .linkWidth(link => Math.sqrt(link.count) * 0.3)
        .linkDirectionalArrowLength(link => Math.sqrt(link.count) * 1.5)
        .linkDirectionalArrowRelPos(1)
        .linkCurvature(0.1)
        .linkDirectionalParticles(link => Math.min(link.count, 3))
        .linkDirectionalParticleSpeed(link => 0.001 * link.count)
        .linkDirectionalParticleWidth(2)
        .onNodeClick(node => {
            showNodeDetails(node);
        })
        .onLinkClick(link => {
            showLinkDetails(link);
        })
        .onNodeHover(node => {
            container.style.cursor = node ? 'pointer' : null;
        })
        .onLinkHover(link => {
            container.style.cursor = link ? 'pointer' : null;
        })
        .onNodeDrag(node => {
            node.fx = node.x;
            node.fy = node.y;
            node.fz = node.z;
        })
        .onNodeDragEnd(node => {
            node.fx = null;
            node.fy = null;
            node.fz = null;
        })
        .cooldownTicks(100)
        .onEngineStop(() => {
            document.getElementById('loadingOverlay').classList.add('hidden');
            // Auto-highlight default person after graph loads
            setTimeout(() => {
                highlightDefaultPerson();
            }, 500);
        });

    // Add camera controls hint
    console.log('3D Graph initialized. Drag to rotate, scroll to zoom, right-click drag to pan.');
}

// Highlight default person on page load
function highlightDefaultPerson() {
    // Search for vaibhav chandra (handle different name formats)
    const searchTerms = ['vaibhav chandra', 'chandra vaibhav'];
    const matchingNode = filteredGraphData.nodes.find(node => {
        const nodeNameLower = node.name.toLowerCase();
        return searchTerms.some(term => nodeNameLower.includes(term));
    });

    if (matchingNode && Graph) {
        // Update dropdown selection
        const searchPersonSelect = document.getElementById('searchPersonSelect');
        if (searchPersonSelect && matchingNode.name) {
            searchPersonSelect.value = matchingNode.name;
        }
        
        highlightedNodeId = matchingNode.id;
        
        // Re-render to update colors
        Graph.graphData(filteredGraphData);
        
        // Focus on the node
        setTimeout(() => {
            focusOnNode(matchingNode);
        }, 200);
        
        // Show details
        showNodeDetails(matchingNode);
    }
}

// Highlight node by name (exact match) and focus on it
function highlightNodeByName(name) {
    const matchingNode = filteredGraphData.nodes.find(node => 
        node.name === name
    );

    if (matchingNode && Graph) {
        highlightedNodeId = matchingNode.id;
        
        // Re-render to update colors
        Graph.graphData(filteredGraphData);
        
        // Focus on the node - wait for graph to stabilize
        setTimeout(() => {
            focusOnNode(matchingNode);
        }, 200);
        
        // Show details
        showNodeDetails(matchingNode);
    }
}

// Focus camera on a specific node
function focusOnNode(node) {
    if (!Graph || !node) return;
    
    // Try multiple times to get node position (graph might still be settling)
    let attempts = 0;
    const maxAttempts = 10;
    
    const tryFocus = () => {
        attempts++;
        
        // Get node position from the graph
        const nodeData = filteredGraphData.nodes.find(n => n.id === node.id);
        if (!nodeData) {
            if (attempts < maxAttempts) {
                setTimeout(tryFocus, 100);
            }
            return;
        }
        
        // Check if node has position data
        if (nodeData.x !== undefined && nodeData.y !== undefined && nodeData.z !== undefined) {
            // Calculate camera position - position it at a good viewing angle
            const distance = 250; // Distance from node
            const cameraX = nodeData.x + distance;
            const cameraY = nodeData.y + distance;
            const cameraZ = nodeData.z + distance;
            
            Graph.cameraPosition(
                { x: cameraX, y: cameraY, z: cameraZ },
                { x: nodeData.x, y: nodeData.y, z: nodeData.z },
                1500
            );
        } else {
            // If no position yet, wait a bit more and try again
            if (attempts < maxAttempts) {
                setTimeout(tryFocus, 100);
            } else {
                // Fallback: use zoomToFit to focus on this node
                Graph.zoomToFit(300, 20, n => n.id === node.id);
            }
        }
    };
    
    tryFocus();
}

// Highlight node by search (for backward compatibility)
function highlightNode(query) {
    const matchingNode = filteredGraphData.nodes.find(node => 
        node.name.toLowerCase().includes(query)
    );

    if (matchingNode) {
        highlightNodeByName(matchingNode.name);
    }
}

// Reset highlight
function resetHighlight() {
    highlightedNodeId = null;
    if (Graph) {
        Graph.graphData(filteredGraphData);
    }
}

// Show node details in sidebar
function showNodeDetails(node) {
    const sidebar = document.getElementById('sidebar');
    const sidebarTitle = document.getElementById('sidebarTitle');
    const sidebarContent = document.getElementById('sidebarContent');

    // Find all confessions involving this node
    // We need to check all links where this node is either source or target
    const relevantLinks = graphData.links.filter(link => 
        link.source === node.id || link.target === node.id
    );
    
    // Get all messages from these links
    const allMessages = relevantLinks.flatMap(link => link.messages);
    
    // Filter by author (sent) and recipient (received)
    const sentConfessions = allMessages.filter(msg => msg.author === node.id);
    const receivedConfessions = allMessages.filter(msg => msg.recipient === node.id);

    sidebarTitle.textContent = node.name;
    
    let html = `
        <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--border-color);">
            <div style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 5px;">
                Gender: <span style="color: var(--text-primary);">${node.gender || 'Unknown'}</span>
            </div>
            ${node.roll ? `<div style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 5px;">
                Roll: <span style="color: var(--text-primary);">${node.roll}</span>
            </div>` : ''}
            ${node.community !== undefined ? `<div style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 5px;">
                Community: <span style="color: ${communityColors[node.community] || 'var(--text-primary)'}; font-weight: 600;">${node.community}</span>
            </div>` : ''}
            <div style="color: var(--text-secondary); font-size: 0.85rem;">
                Connections: <span style="color: var(--text-primary);">${node.connections}</span>
            </div>
        </div>
    `;

    if (sentConfessions.length > 0) {
        html += `<h4 style="color: var(--accent-primary); margin-bottom: 15px; font-size: 1rem;">Sent (${sentConfessions.length})</h4>`;
        sentConfessions.forEach(confession => {
            html += `
                <div class="confession-item">
                    <div class="confession-item-header">
                        <span class="from">To: ${confession.recipient}</span>
                    </div>
                    <div class="confession-item-text">${escapeHtml(confession.text)}</div>
                </div>
            `;
        });
    }

    if (receivedConfessions.length > 0) {
        html += `<h4 style="color: var(--accent-secondary); margin-top: 20px; margin-bottom: 15px; font-size: 1rem;">Received (${receivedConfessions.length})</h4>`;
        receivedConfessions.forEach(confession => {
            html += `
                <div class="confession-item">
                    <div class="confession-item-header">
                        <span class="from">From: ${confession.author}</span>
                    </div>
                    <div class="confession-item-text">${escapeHtml(confession.text)}</div>
                </div>
            `;
        });
    }

    if (sentConfessions.length === 0 && receivedConfessions.length === 0) {
        html = '<div class="empty-state"><p>No confessions found for this person</p></div>';
    }

    sidebarContent.innerHTML = html;
    sidebar.classList.add('open');
}

// Show link details in sidebar
function showLinkDetails(link) {
    const sidebar = document.getElementById('sidebar');
    const sidebarTitle = document.getElementById('sidebarTitle');
    const sidebarContent = document.getElementById('sidebarContent');

    // Extract source and target names (handle both string IDs and node objects)
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    
    // Get node names from the graph data
    const sourceNode = filteredGraphData.nodes.find(n => n.id === sourceId) || graphData.nodes.find(n => n.id === sourceId);
    const targetNode = filteredGraphData.nodes.find(n => n.id === targetId) || graphData.nodes.find(n => n.id === targetId);
    
    const sourceName = sourceNode ? sourceNode.name : sourceId;
    const targetName = targetNode ? targetNode.name : targetId;

    sidebarTitle.textContent = `${sourceName} ↔ ${targetName}`;
    
    let html = `
        <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--border-color);">
            <div style="color: var(--text-secondary); font-size: 0.85rem;">
                Messages exchanged: <span style="color: var(--text-primary); font-weight: 600;">${link.count}</span>
            </div>
        </div>
    `;

    // Sort messages: from source to target first, then target to source
    const sortedMessages = link.messages.sort((a, b) => {
        if (a.author === sourceId && b.author === targetId) return -1;
        if (a.author === targetId && b.author === sourceId) return 1;
        return 0;
    });

    sortedMessages.forEach(confession => {
        html += `
            <div class="confession-item">
                <div class="confession-item-header">
                    <span class="from">${confession.author}</span>
                    <span style="color: var(--text-secondary);">→</span>
                    <span class="to">${confession.recipient}</span>
                </div>
                <div class="confession-item-text">${escapeHtml(confession.text)}</div>
            </div>
        `;
    });

    sidebarContent.innerHTML = html;
    sidebar.classList.add('open');
}

// Close sidebar
function closeSidebarPanel() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.remove('open');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Setup copy link functionality
function setupCopyLink() {
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    if (!copyLinkBtn) return;
    
    const shareUrl = 'https://x.com/ayushGup7/status/2005006627238543657?s=20';
    
    copyLinkBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            copyLinkBtn.classList.add('copied');
            const originalText = copyLinkBtn.querySelector('.copy-text').textContent;
            copyLinkBtn.querySelector('.copy-text').textContent = 'Copied!';
            
            setTimeout(() => {
                copyLinkBtn.classList.remove('copied');
                copyLinkBtn.querySelector('.copy-text').textContent = originalText;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy link:', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = shareUrl;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                copyLinkBtn.classList.add('copied');
                const originalText = copyLinkBtn.querySelector('.copy-text').textContent;
                copyLinkBtn.querySelector('.copy-text').textContent = 'Copied!';
                setTimeout(() => {
                    copyLinkBtn.classList.remove('copied');
                    copyLinkBtn.querySelector('.copy-text').textContent = originalText;
                }, 2000);
            } catch (fallbackErr) {
                console.error('Fallback copy failed:', fallbackErr);
            }
            document.body.removeChild(textArea);
        }
    });
}
