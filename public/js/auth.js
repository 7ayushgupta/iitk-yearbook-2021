// Authentication check for protected pages
// Checks if user is authenticated, redirects to index.html if not

(function() {
    const AUTH_STORAGE_KEY = 'yearbook_authenticated';
    
    // Check authentication status
    const isAuthenticated = localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
    
    if (!isAuthenticated) {
        // Redirect to index.html if not authenticated
        window.location.href = 'index.html';
    }
})();

