// Function to set the view type and update UI
function setView(viewType) {
    const resultsContainer = document.getElementById('results');
    const cardViewBtn = document.getElementById('cardViewBtn');
    const listViewBtn = document.getElementById('listViewBtn');
    
    if (!resultsContainer) return;
    
    // Update the view
    if (viewType === 'card') {
        // Remove list view classes and add grid classes
        resultsContainer.classList.remove('list-view');
        resultsContainer.classList.add('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'gap-6');
        
        // Update button states
        if (cardViewBtn) cardViewBtn.classList.add('active');
        if (listViewBtn) listViewBtn.classList.remove('active');
    } else {
        // Remove grid classes and add list view class
        resultsContainer.classList.add('list-view');
        resultsContainer.classList.remove('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'gap-6');
        
        // Update button states
        if (listViewBtn) listViewBtn.classList.add('active');
        if (cardViewBtn) cardViewBtn.classList.remove('active');
    }
    
    // Save preference
    localStorage.setItem('preferredView', viewType);
    
    // Trigger window resize to handle any responsive adjustments
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 50);
}

// Function to initialize view toggle
export function initViewToggle() {
    const resultsContainer = document.getElementById('results');
    const cardViewBtn = document.getElementById('cardViewBtn');
    const listViewBtn = document.getElementById('listViewBtn');
    
    if (!resultsContainer || !cardViewBtn || !listViewBtn) return;
    
    // Set initial view from localStorage or default to 'card'
    const savedView = localStorage.getItem('preferredView') || 'card';
    
    // Set initial view
    setView(savedView);
    
    // Event listeners for view toggle buttons
    cardViewBtn.addEventListener('click', (e) => {
        e.preventDefault();
        setView('card');
    });
    
    listViewBtn.addEventListener('click', (e) => {
        e.preventDefault();
        setView('list');
    });
    
    // Make setView available globally for app.js
    window.setView = setView;
}

// Function to be called when new results are loaded
export function updateViewForNewResults() {
    const currentView = localStorage.getItem('preferredView') || 'card';
    const resultsContainer = document.getElementById('results');
    const cardViewBtn = document.getElementById('cardViewBtn');
    const listViewBtn = document.getElementById('listViewBtn');
    
    if (!resultsContainer) return;
    
    // Update view class
    if (currentView === 'list') {
        resultsContainer.classList.add('list-view');
    } else {
        resultsContainer.classList.remove('list-view');
    }
    
    // Update button states
    if (cardViewBtn && listViewBtn) {
        if (currentView === 'card') {
            cardViewBtn.classList.add('active');
            listViewBtn.classList.remove('active');
        } else {
            listViewBtn.classList.add('active');
            cardViewBtn.classList.remove('active');
        }
    }
    
    // Ensure the view is properly updated after a short delay
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 100);
}

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
    initViewToggle();
});
