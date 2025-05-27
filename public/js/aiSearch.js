document.addEventListener('DOMContentLoaded', () => {
    const aiSearchForm = document.getElementById('aiSearchForm');
    const aiSearchResults = document.getElementById('aiSearchResults');
    const searchForm = document.getElementById('searchForm');
    const businessInput = document.getElementById('business');
    const locationInput = document.getElementById('location');
    const loadingIndicator = document.getElementById('aiLoading');
    const errorMessage = document.getElementById('aiError');

    if (aiSearchForm) {
        aiSearchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const idea = document.getElementById('idea').value.trim();
            const state = document.getElementById('state').value.trim();
            
            if (!idea || !state) {
                showError('Please enter both an idea and a state');
                return;
            }
            
            try {
                showLoading(true);
                errorMessage.classList.add('hidden');
                
                const response = await fetch('/api/ai-suggest', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ idea, state })
                });
                
                if (!response.ok) {
                    throw new Error('Failed to get suggestions');
                }
                
                const data = await response.json();
                displaySuggestions(data.suggestions);
                
            } catch (error) {
                console.error('Error:', error);
                showError('Failed to get suggestions. Please try again.');
            } finally {
                showLoading(false);
            }
        });
    }

    function displaySuggestions(suggestions) {
        if (!suggestions || suggestions.length === 0) {
            aiSearchResults.innerHTML = '<p class="text-gray-600">No suggestions found. Try a different idea.</p>';
            return;
        }

        const suggestionsHTML = suggestions.map(suggestion => `
            <div class="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer" 
                 onclick="window.useSuggestion('${suggestion.businessType}', '${suggestion.location}')">
                <h3 class="font-semibold text-lg text-gray-800">${suggestion.businessType}</h3>
                <p class="text-gray-600">${suggestion.location}</p>
                <button class="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium">
                    Use this search
                </button>
            </div>
        `).join('');

        aiSearchResults.innerHTML = `
            <div class="mb-4">
                <h3 class="text-lg font-semibold text-gray-800 mb-2">Suggested Searches:</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${suggestionsHTML}
                </div>
            </div>
        `;
    }

    function showLoading(show) {
        loadingIndicator.classList.toggle('hidden', !show);
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }
});

// Global function to be called when a suggestion is clicked
window.useSuggestion = function(business, location) {
    document.getElementById('business').value = business;
    document.getElementById('location').value = location;
    document.getElementById('aiSearchSection').classList.add('hidden');
    document.getElementById('searchSection').classList.remove('hidden');
    document.getElementById('business').focus();
};
