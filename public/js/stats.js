// Global variables
let allConfessions = [];
let hiddenConfessions = [];

// Initialize the statistics page
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Set Chart.js defaults for Dark Theme
        if (typeof Chart !== 'undefined') {
            Chart.defaults.color = '#e0e0e0';
            Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
            Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        }
        
        setupCopyLink();
        loadAllData();
    } catch (error) {
        console.error('Error initializing statistics page:', error);
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.style.display = 'block';
            errorMessage.textContent = `Application error: ${error.message}`;
        }
    }
});

// Load both CSV files
function loadAllData() {
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');
    
    loadingMessage.textContent = 'Loading memoirs data...';
    
    // Load all confessions first
    fetch('data/allConfessions.csv')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(allConfessionsText => {
            loadingMessage.textContent = 'Parsing all memoirs...';
            
            // Parse all confessions
            Papa.parse(allConfessionsText, {
                header: true,
                skipEmptyLines: true,
                complete: function(results) {
                    allConfessions = processConfessions(results.data);
                    console.log(`Loaded ${allConfessions.length} total confessions`);
                    calculateAndDisplayStats();
                },
                error: function(error) {
                    loadingMessage.style.display = 'none';
                    errorMessage.style.display = 'block';
                    errorMessage.textContent = `Error parsing all confessions CSV: ${error.message}`;
                }
            });
        })
        .catch(error => {
            loadingMessage.style.display = 'none';
            errorMessage.style.display = 'block';
            errorMessage.textContent = `Error loading all confessions CSV: ${error.message}`;
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
            authorGender: (row.author_gender || '').trim(),
            recipientGender: (row.recipient_gender || '').trim(),
            visibility: (row.visibility || 'True').trim()
        }))
        .filter(c => c.text && c.text.length > 0);
}

// Calculate and display statistics
function calculateAndDisplayStats() {
    const loadingMessage = document.getElementById('loadingMessage');
    const statsContent = document.getElementById('statsContent');
    
    loadingMessage.style.display = 'none';
    
    // Calculate statistics
    const stats = calculateStats();
    
    // Display statistics
    displayStats(stats);
    
    statsContent.style.display = 'block';
    
    // Render charts
    renderCharts(stats);
}

// Calculate all statistics
function calculateStats() {
    const totalAll = allConfessions.length;
    
    // Visibility breakdown
    const publicConfessions = allConfessions.filter(c => c.visibility === 'True' || c.visibility === 'true').length;
    const privateConfessions = allConfessions.filter(c => c.visibility === 'False' || c.visibility === 'false').length;
    
    // Unique counts
    const uniqueAuthors = new Set(allConfessions.map(c => c.author)).size;
    const uniqueRecipients = new Set(allConfessions.map(c => c.recipient)).size;
    
    // Text statistics
    const textLengths = allConfessions.map(c => c.text.length);
    const avgTextLength = textLengths.reduce((a, b) => a + b, 0) / textLengths.length;
    const minTextLength = Math.min(...textLengths);
    const maxTextLength = Math.max(...textLengths);
    const medianTextLength = calculateMedian(textLengths);
    
    // Gender statistics
    const authorGenders = allConfessions.filter(c => c.authorGender);
    const recipientGenders = allConfessions.filter(c => c.recipientGender);
    
    const authorGenderCounts = countGenders(authorGenders.map(c => c.authorGender));
    const recipientGenderCounts = countGenders(recipientGenders.map(c => c.recipientGender));
    
    // Most active authors and recipients
    const authorCounts = countOccurrences(allConfessions.map(c => c.author));
    const recipientCounts = countOccurrences(allConfessions.map(c => c.recipient));
    
    const topAuthors = getTopN(authorCounts, 10);
    const topRecipients = getTopN(recipientCounts, 10);
    
    return {
        totalAll,
        publicConfessions,
        privateConfessions,
        uniqueAuthors,
        uniqueRecipients,
        avgTextLength,
        minTextLength,
        maxTextLength,
        medianTextLength,
        authorGenderCounts,
        recipientGenderCounts,
        topAuthors,
        topRecipients
    };
}

// Helper functions
function calculateMedian(arr) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function countGenders(genders) {
    const counts = { M: 0, F: 0, Unknown: 0 };
    genders.forEach(g => {
        const gender = g.toUpperCase();
        if (gender === 'M') counts.M++;
        else if (gender === 'F') counts.F++;
        else counts.Unknown++;
    });
    return counts;
}

function countOccurrences(arr) {
    const counts = {};
    arr.forEach(item => {
        if (item && item !== 'Unknown') {
            counts[item] = (counts[item] || 0) + 1;
        }
    });
    return counts;
}

function getTopN(counts, n) {
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([name, count]) => ({ name, count }));
}

// Display statistics on the page
function displayStats(stats) {
    const statsContent = document.getElementById('statsContent');
    
    statsContent.innerHTML = `
        <!-- Overview Statistics -->
        <div class="stats-container">
            <div class="stat-section">
                <h2>Overview</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>${stats.totalAll.toLocaleString()}</h3>
                        <p>Total Confessions</p>
                    </div>
                    <div class="stat-card">
                        <h3>${stats.publicConfessions.toLocaleString()}</h3>
                        <p>Public</p>
                    </div>
                    <div class="stat-card">
                        <h3>${stats.privateConfessions.toLocaleString()}</h3>
                        <p>Private</p>
                    </div>
                    <div class="stat-card">
                        <h3>${stats.uniqueAuthors.toLocaleString()}</h3>
                        <p>Unique Authors</p>
                    </div>
                    <div class="stat-card">
                        <h3>${stats.uniqueRecipients.toLocaleString()}</h3>
                        <p>Unique Recipients</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Visualizations Grid -->
        <div class="stats-grid" style="margin-bottom: 30px;">
            <!-- Visibility Chart -->
            <div class="stats-container">
                <div class="stat-section">
                    <h2>Visibility Breakdown</h2>
                    <div class="chart-container">
                        <canvas id="visibilityChart"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- Gender Chart -->
            <div class="stats-container">
                <div class="stat-section">
                    <h2>Gender Distribution</h2>
                    <div class="chart-container">
                        <canvas id="genderChart"></canvas>
                    </div>
                </div>
            </div>
        </div>

        <!-- Top Lists Grid -->
        <div class="stats-grid">
            <!-- Top Authors -->
            <div class="stats-container">
                <div class="stat-section">
                    <h2>Top Active Authors</h2>
                    <div class="chart-container" style="height: 400px;">
                        <canvas id="authorsChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Top Recipients -->
            <div class="stats-container">
                <div class="stat-section">
                    <h2>Most Mentioned</h2>
                    <div class="chart-container" style="height: 400px;">
                        <canvas id="recipientsChart"></canvas>
                    </div>
                </div>
            </div>
        </div>

        <!-- Text Statistics (Compact) -->
        <div class="stats-container">
            <div class="stat-section">
                <h2>Message Lengths</h2>
                <div class="stats-grid">
                    <div class="stat-card" style="padding: 15px;">
                        <h3>${Math.round(stats.avgTextLength)}</h3>
                        <p>Average Chars</p>
                    </div>
                    <div class="stat-card" style="padding: 15px;">
                        <h3>${Math.round(stats.medianTextLength)}</h3>
                        <p>Median Chars</p>
                    </div>
                    <div class="stat-card" style="padding: 15px;">
                        <h3>${stats.maxTextLength.toLocaleString()}</h3>
                        <p>Longest</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Render Charts using Chart.js
function renderCharts(stats) {
    if (typeof Chart === 'undefined') return;

    // Common Options
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    padding: 20,
                    usePointStyle: true
                }
            }
        }
    };

    // 1. Visibility Chart
    const ctxVisibility = document.getElementById('visibilityChart').getContext('2d');
    new Chart(ctxVisibility, {
        type: 'doughnut',
        data: {
            labels: ['Public', 'Private'],
            datasets: [{
                data: [stats.publicConfessions, stats.privateConfessions],
                backgroundColor: ['#03dac6', '#bb86fc'],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            ...commonOptions,
            cutout: '70%'
        }
    });

    // 2. Gender Chart (Authors vs Recipients)
    // We'll combine them or just show Authors for now to keep it clean, or create a grouped bar.
    // Let's do a grouped bar for Gender Distribution since we have M/F for both.
    const ctxGender = document.getElementById('genderChart').getContext('2d');
    new Chart(ctxGender, {
        type: 'bar',
        data: {
            labels: ['Male', 'Female'],
            datasets: [
                {
                    label: 'Authors',
                    data: [stats.authorGenderCounts.M, stats.authorGenderCounts.F],
                    backgroundColor: '#bb86fc',
                    borderRadius: 5
                },
                {
                    label: 'Recipients',
                    data: [stats.recipientGenderCounts.M, stats.recipientGenderCounts.F],
                    backgroundColor: '#03dac6',
                    borderRadius: 5
                }
            ]
        },
        options: {
            ...commonOptions,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });

    // 3. Top Authors (Horizontal Bar)
    const ctxAuthors = document.getElementById('authorsChart').getContext('2d');
    new Chart(ctxAuthors, {
        type: 'bar',
        data: {
            labels: stats.topAuthors.map(a => a.name),
            datasets: [{
                label: 'Confessions Written',
                data: stats.topAuthors.map(a => a.count),
                backgroundColor: '#bb86fc',
                borderRadius: 4,
                barPercentage: 0.6,
                categoryPercentage: 0.8
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                y: {
                    grid: { display: false },
                    ticks: {
                        autoSkip: false,
                        maxRotation: 0,
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });

    // 4. Top Recipients (Horizontal Bar)
    const ctxRecipients = document.getElementById('recipientsChart').getContext('2d');
    new Chart(ctxRecipients, {
        type: 'bar',
        data: {
            labels: stats.topRecipients.map(a => a.name),
            datasets: [{
                label: 'Confessions Received',
                data: stats.topRecipients.map(a => a.count),
                backgroundColor: '#03dac6',
                borderRadius: 4,
                barPercentage: 0.6,
                categoryPercentage: 0.8
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                y: {
                    grid: { display: false },
                    ticks: {
                        autoSkip: false,
                        maxRotation: 0,
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
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
