// Global variables
let allConfessions = [];
let filteredConfessions = [];
let currentPage = 1;
const itemsPerPage = 20;

// User page state
let currentUser = null;
let currentUserRoll = null;
let userViewMode = 'received'; // 'received' or 'written'

// Visibility filter state
let visibilityMode = 'public'; // 'public' or 'private'

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    try {
        parseQueryParameters();
        setupEventListeners();
        loadCSV();
    } catch (error) {
        console.error('Error initializing application:', error);
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.style.display = 'block';
            errorMessage.textContent = `Application error: ${error.message}`;
        }
    }
});

// Load and parse CSV file
function loadCSV() {
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');
    
    loadingMessage.textContent = 'Loading confessions...';
    
    fetch('data/allConfessions.csv')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(csvText => {
            loadingMessage.textContent = 'Parsing CSV...';
            // Parse CSV using PapaParse with optimized settings for large files
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: false, // Keep as strings for better performance
                worker: false, // Use main thread but with chunking
                step: undefined, // Process all at once but with try-catch
                complete: function(results) {
                    try {
                        if (results.errors.length > 0) {
                            console.warn('CSV parsing warnings:', results.errors);
                        }
                        
                        // Process data asynchronously in chunks to prevent browser freeze
                    const totalRows = results.data.length;
                    loadingMessage.textContent = `Processing ${totalRows} rows...`;
                    
                    const chunkSize = 2000; // Smaller chunks for better responsiveness
                    allConfessions = [];
                    let processedCount = 0;
                    
                    function processChunk(startIndex) {
                        try {
                            const endIndex = Math.min(startIndex + chunkSize, totalRows);
                            const chunk = results.data.slice(startIndex, endIndex);
                            
                            const processedChunk = chunk.map((row, idx) => {
                                try {
                                    const globalIndex = startIndex + idx;
                                    return {
                                        id: row._id || String(globalIndex),
                                        text: (row.text || '').trim(),
                                        author: (row.author || '').trim() || 'Unknown',
                                        recipient: (row.recipient_name || '').trim() || 'Unknown',
                                        authorRoll: (row.author_roll || '').trim(),
                                        recipientRoll: (row.recipient_roll || '').trim(),
                                        authorGender: (row.author_gender || '').trim(),
                                        recipientGender: (row.recipient_gender || '').trim(),
                                        visibility: (row.visibility || 'True').trim()
                                    };
                                } catch (e) {
                                    return null;
                                }
                            }).filter(confession => confession && confession.text && confession.text.length > 0);
                            
                            allConfessions = allConfessions.concat(processedChunk);
                            processedCount = endIndex;
                            
                            // Update progress
                            if (loadingMessage) {
                                loadingMessage.textContent = `Processing... ${processedCount}/${totalRows} rows`;
                            }
                            
                            // Continue with next chunk after a short delay to allow UI updates
                            if (endIndex < totalRows) {
                                setTimeout(() => processChunk(endIndex), 10);
                            } else {
                                // Finished processing
                                finishProcessing();
                            }
                        } catch (error) {
                            console.error('Error processing chunk:', error);
                            loadingMessage.style.display = 'none';
                            if (errorMessage) {
                                errorMessage.style.display = 'block';
                                errorMessage.textContent = `Error processing data: ${error.message}`;
                            }
                        }
                    }
                    
                    function finishProcessing() {
                        try {
                            if (loadingMessage) loadingMessage.style.display = 'none';
                            
                            // Setup user page UI if on user page
                            if (currentUser || currentUserRoll) {
                                setupUserPage();
                            }
                            
                            populateFilters();
                            applyFilters();
                            renderConfessions();
                            updateStats();
                        } catch (error) {
                            console.error('Error finishing processing:', error);
                            if (loadingMessage) loadingMessage.style.display = 'none';
                            if (errorMessage) {
                                errorMessage.style.display = 'block';
                                errorMessage.textContent = `Error finalizing: ${error.message}`;
                            }
                        }
                    }
                    
                    // Start processing
                    processChunk(0);
                    } catch (error) {
                        console.error('Error processing CSV data:', error);
                        loadingMessage.style.display = 'none';
                        errorMessage.style.display = 'block';
                        errorMessage.textContent = `Error processing data: ${error.message}`;
                    }
                },
                error: function(error) {
                    loadingMessage.style.display = 'none';
                    errorMessage.style.display = 'block';
                    errorMessage.textContent = `Error parsing CSV: ${error.message}`;
                }
            });
        })
        .catch(error => {
            loadingMessage.style.display = 'none';
            errorMessage.style.display = 'block';
            errorMessage.textContent = `Error loading CSV file: ${error.message}`;
            console.error('Error:', error);
        });
}

// Parse URL query parameters
function parseQueryParameters() {
    const params = new URLSearchParams(window.location.search);
    currentUser = params.get('user');
    currentUserRoll = params.get('roll');
}

// Setup event listeners
function setupEventListeners() {
    try {
        const searchInput = document.getElementById('searchInput');
        const filterAuthor = document.getElementById('filterAuthor');
        const filterRecipient = document.getElementById('filterRecipient');
        const togglePublic = document.getElementById('togglePublic');
        const togglePrivate = document.getElementById('togglePrivate');
        const toggleReceived = document.getElementById('toggleReceived');
        const toggleWritten = document.getElementById('toggleWritten');
        
        if (!searchInput) {
            console.error('Search input not found');
            return;
        }
        
        // Debounce search input
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                try {
                    applyFilters();
                } catch (error) {
                    console.error('Error applying filters:', error);
                }
            }, 300);
        });
        
        if (filterAuthor) {
            filterAuthor.addEventListener('change', () => {
                try {
                    applyFilters();
                } catch (error) {
                    console.error('Error applying filters:', error);
                }
            });
        }
        
        if (filterRecipient) {
            filterRecipient.addEventListener('change', () => {
                try {
                    applyFilters();
                } catch (error) {
                    console.error('Error applying filters:', error);
                }
            });
        }
        
        // Visibility toggle buttons
        if (togglePublic) {
            togglePublic.addEventListener('click', () => {
                try {
                    visibilityMode = 'public';
                    togglePublic.classList.add('active');
                    if (togglePrivate) togglePrivate.classList.remove('active');
                    applyFilters();
                } catch (error) {
                    console.error('Error toggling public view:', error);
                }
            });
        }
        
        if (togglePrivate) {
            togglePrivate.addEventListener('click', () => {
                try {
                    visibilityMode = 'private';
                    togglePrivate.classList.add('active');
                    if (togglePublic) togglePublic.classList.remove('active');
                    applyFilters();
                } catch (error) {
                    console.error('Error toggling private view:', error);
                }
            });
        }
        
        // User page toggles
        if (toggleReceived) {
            toggleReceived.addEventListener('click', () => {
                try {
                    userViewMode = 'received';
                    toggleReceived.classList.add('active');
                    if (toggleWritten) toggleWritten.classList.remove('active');
                    applyUserFilter();
                    applyFilters();
                } catch (error) {
                    console.error('Error toggling received view:', error);
                }
            });
        }
        
        if (toggleWritten) {
            toggleWritten.addEventListener('click', () => {
                try {
                    userViewMode = 'written';
                    toggleWritten.classList.add('active');
                    if (toggleReceived) toggleReceived.classList.remove('active');
                    applyUserFilter();
                    applyFilters();
                } catch (error) {
                    console.error('Error toggling written view:', error);
                }
            });
        }
    } catch (error) {
        console.error('Error setting up event listeners:', error);
    }
}

// Populate filter dropdowns
function populateFilters() {
    try {
        const filterAuthor = document.getElementById('filterAuthor');
        const filterRecipient = document.getElementById('filterRecipient');
        
        if (!filterAuthor || !filterRecipient) {
            console.error('Filter elements not found');
            return;
        }
        
        // Get unique authors and recipients (limit to prevent UI lag)
        const authorSet = new Set();
        const recipientSet = new Set();
        
        allConfessions.forEach(c => {
            if (c.author && c.author !== 'Unknown') authorSet.add(c.author);
            if (c.recipient && c.recipient !== 'Unknown') recipientSet.add(c.recipient);
        });
        
        const authors = Array.from(authorSet).sort();
        const recipients = Array.from(recipientSet).sort();
        
        // Populate author filter
        authors.forEach(author => {
            const option = document.createElement('option');
            option.value = author;
            option.textContent = author;
            filterAuthor.appendChild(option);
        });
        
        // Populate recipient filter
        recipients.forEach(recipient => {
            const option = document.createElement('option');
            option.value = recipient;
            option.textContent = recipient;
            filterRecipient.appendChild(option);
        });
    } catch (error) {
        console.error('Error populating filters:', error);
    }
}

// Setup user page UI
function setupUserPage() {
    if (!currentUser && !currentUserRoll) return;
    
    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');
    const backToAll = document.getElementById('backToAll');
    const userPageToggle = document.getElementById('userPageToggle');
    
    // Update header
    const userName = currentUser || `Roll ${currentUserRoll}`;
    pageTitle.textContent = `Confessions for ${userName}`;
    pageSubtitle.textContent = userViewMode === 'received' 
        ? 'Confessions received by this user' 
        : 'Confessions written by this user';
    
    // Show user page elements
    backToAll.style.display = 'block';
    userPageToggle.style.display = 'flex';
}

// Apply user-specific filtering
function applyUserFilter() {
    try {
        if (!currentUser && !currentUserRoll) {
            // Apply visibility filter based on mode
            filteredConfessions = allConfessions.filter(c => {
                try {
                    if (visibilityMode === 'public') {
                        return c.visibility === 'True';
                    } else if (visibilityMode === 'private') {
                        return c.visibility === 'False';
                    }
                    return true;
                } catch (e) {
                    return c.visibility === 'True';
                }
            });
            return;
        }
        
        // Filter by user
        let baseFilter = allConfessions.filter(confession => {
            try {
                if (currentUserRoll) {
                    // Match by roll number
                    const matchesRoll = confession.recipientRoll === currentUserRoll || 
                                      confession.authorRoll === currentUserRoll;
                    if (!matchesRoll) return false;
                    
                    if (userViewMode === 'received') {
                        return confession.recipientRoll === currentUserRoll;
                    } else {
                        return confession.authorRoll === currentUserRoll;
                    }
                } else {
                    // Match by name (case-insensitive)
                    const userName = currentUser.toLowerCase();
                    const recipientName = (confession.recipient || '').toLowerCase();
                    const authorName = (confession.author || '').toLowerCase();
                    const matchesName = recipientName === userName || authorName === userName;
                    if (!matchesName) return false;
                    
                    if (userViewMode === 'received') {
                        return recipientName === userName;
                    } else {
                        return authorName === userName;
                    }
                }
            } catch (e) {
                console.error('Error filtering confession:', e, confession);
                return false;
            }
        });
        
        // Apply visibility filter based on mode
        filteredConfessions = baseFilter.filter(c => {
            try {
                if (visibilityMode === 'public') {
                    return c.visibility === 'True';
                } else if (visibilityMode === 'private') {
                    return c.visibility === 'False';
                }
                return true;
            } catch (e) {
                return c.visibility === 'True';
            }
        });
    } catch (error) {
        console.error('Error in applyUserFilter:', error);
        filteredConfessions = [];
    }
}

// Apply filters and search
function applyFilters() {
    try {
        // Start with user filter if on user page, otherwise visibility filter
        if (currentUser || currentUserRoll) {
            applyUserFilter();
        } else {
            // Apply visibility filter based on mode
            filteredConfessions = allConfessions.filter(c => {
                try {
                    if (visibilityMode === 'public') {
                        return c.visibility === 'True';
                    } else if (visibilityMode === 'private') {
                        return c.visibility === 'False';
                    }
                    return true;
                } catch (e) {
                    return c.visibility === 'True';
                }
            });
        }
        
        const searchInput = document.getElementById('searchInput');
        const filterAuthor = document.getElementById('filterAuthor');
        const filterRecipient = document.getElementById('filterRecipient');
        
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const authorFilter = filterAuthor ? filterAuthor.value : '';
        const recipientFilter = filterRecipient ? filterRecipient.value : '';
        
        filteredConfessions = filteredConfessions.filter(confession => {
            try {
                // Author filter
                if (authorFilter && confession.author !== authorFilter) {
                    return false;
                }
                
                // Recipient filter
                if (recipientFilter && confession.recipient !== recipientFilter) {
                    return false;
                }
                
                // Search filter
                if (searchTerm) {
                    const searchText = `${confession.text || ''} ${confession.author || ''} ${confession.recipient || ''}`.toLowerCase();
                    if (!searchText.includes(searchTerm)) {
                        return false;
                    }
                }
                
                return true;
            } catch (e) {
                console.error('Error filtering confession:', e, confession);
                return false;
            }
        });
        
        currentPage = 1;
        renderConfessions();
        updateStats();
    } catch (error) {
        console.error('Error in applyFilters:', error);
        filteredConfessions = [];
        renderConfessions();
        updateStats();
    }
}

// Render confessions on the page
function renderConfessions() {
    const container = document.getElementById('confessionsContainer');
    container.innerHTML = '';
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageConfessions = filteredConfessions.slice(startIndex, endIndex);
    
    if (pageConfessions.length === 0) {
        container.innerHTML = '<div class="no-results">No confessions found matching your criteria.</div>';
        document.getElementById('pagination').innerHTML = '';
        return;
    }
    
    pageConfessions.forEach(confession => {
        const card = createConfessionCard(confession);
        container.appendChild(card);
    });
    
    renderPagination();
}

// Navigate to user page
function navigateToUser(userName, userRoll) {
    if (userRoll) {
        window.location.href = `?roll=${encodeURIComponent(userRoll)}`;
    } else if (userName) {
        window.location.href = `?user=${encodeURIComponent(userName)}`;
    }
}

// Make navigateToUser globally accessible
window.navigateToUser = navigateToUser;

// Create a confession card element
function createConfessionCard(confession) {
    const card = document.createElement('div');
    card.className = 'confession-card';
    
    // Truncate text for preview
    const maxLength = 300;
    const isLong = confession.text.length > maxLength;
    const displayText = isLong ? confession.text.substring(0, maxLength) + '...' : confession.text;
    
    // Create clickable names with event listeners
    const authorSpan = document.createElement('span');
    authorSpan.className = 'clickable-name';
    authorSpan.textContent = confession.author;
    authorSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        navigateToUser(confession.author, confession.authorRoll);
    });
    
    const recipientSpan = document.createElement('span');
    recipientSpan.className = 'clickable-name';
    recipientSpan.textContent = confession.recipient;
    recipientSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        navigateToUser(confession.recipient, confession.recipientRoll);
    });
    
    const headerDiv = document.createElement('div');
    headerDiv.className = 'confession-header';
    
    const authorDiv = document.createElement('div');
    const authorLabel = document.createElement('div');
    authorLabel.className = 'confession-author';
    authorLabel.appendChild(document.createTextNode('From: '));
    authorLabel.appendChild(authorSpan);
    authorDiv.appendChild(authorLabel);
    if (confession.authorRoll) {
        const authorMeta = document.createElement('div');
        authorMeta.className = 'confession-meta';
        authorMeta.textContent = `Roll: ${confession.authorRoll}`;
        authorDiv.appendChild(authorMeta);
    }
    
    const recipientDiv = document.createElement('div');
    const recipientLabel = document.createElement('div');
    recipientLabel.className = 'confession-recipient';
    recipientLabel.appendChild(document.createTextNode('To: '));
    recipientLabel.appendChild(recipientSpan);
    recipientDiv.appendChild(recipientLabel);
    if (confession.recipientRoll) {
        const recipientMeta = document.createElement('div');
        recipientMeta.className = 'confession-meta';
        recipientMeta.textContent = `Roll: ${confession.recipientRoll}`;
        recipientDiv.appendChild(recipientMeta);
    }
    
    headerDiv.appendChild(authorDiv);
    headerDiv.appendChild(recipientDiv);
    
    const textDiv = document.createElement('div');
    textDiv.className = 'confession-text';
    textDiv.id = `text-${confession.id}`;
    // Use textContent for safety (automatically escapes HTML)
    textDiv.textContent = displayText;
    
    card.appendChild(headerDiv);
    card.appendChild(textDiv);
    
    if (isLong) {
        const readMoreSpan = document.createElement('span');
        readMoreSpan.className = 'read-more';
        readMoreSpan.textContent = 'Read more';
        readMoreSpan.addEventListener('click', () => toggleReadMore(confession.id));
        card.appendChild(readMoreSpan);
    }
    
    return card;
}

// Toggle read more/less
function toggleReadMore(id) {
    const confession = allConfessions.find(c => c.id == id);
    if (!confession) return;
    
    const textElement = document.getElementById(`text-${id}`);
    const readMoreBtn = textElement.nextElementSibling;
    
    if (textElement.classList.contains('expanded')) {
        const truncated = confession.text.substring(0, 300) + '...';
        textElement.textContent = truncated;
        textElement.classList.remove('expanded');
        readMoreBtn.textContent = 'Read more';
    } else {
        textElement.textContent = confession.text;
        textElement.classList.add('expanded');
        readMoreBtn.textContent = 'Read less';
    }
}

// Make toggleReadMore globally accessible
window.toggleReadMore = toggleReadMore;

// Render pagination controls
function renderPagination() {
    const totalPages = Math.ceil(filteredConfessions.length / itemsPerPage);
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    pagination.innerHTML = `
        <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
            Previous
        </button>
        <span class="page-info">Page ${currentPage} of ${totalPages}</span>
        <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
            Next
        </button>
    `;
}

// Change page
function changePage(page) {
    const totalPages = Math.ceil(filteredConfessions.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    renderConfessions();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Make changePage globally accessible
window.changePage = changePage;

// Update statistics
function updateStats() {
    const resultCount = document.getElementById('resultCount');
    const total = filteredConfessions.length;
    const totalAll = allConfessions.length;
    
    if (total === totalAll) {
        resultCount.textContent = `Showing all ${total.toLocaleString()} confessions`;
    } else {
        resultCount.textContent = `Showing ${total.toLocaleString()} of ${totalAll.toLocaleString()} confessions`;
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

