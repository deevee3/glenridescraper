// Global variables to store search results
let currentResults = [];
let currentSearchResults = [];

// Import view toggle functionality
import { initViewToggle, updateViewForNewResults } from './viewToggle.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize view toggle
    initViewToggle();
    const searchForm = document.getElementById('searchForm');
    const errorDiv = document.getElementById('error');
    const loadingDiv = document.getElementById('loading');
    const resultsDiv = document.getElementById('results');
    const downloadBtn = document.getElementById('downloadCsv');

    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const business = document.getElementById('business').value;
        const location = document.getElementById('location').value;
        const limit = document.getElementById('limit').value;

        // Show loading, hide error and clear previous results
        loadingDiv.classList.remove('hidden');
        errorDiv.classList.add('hidden');
        resultsDiv.innerHTML = '';

        try {
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ business, location, limit })
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error('Too many requests. Please wait a few minutes before trying again.');
                }
                throw new Error(data.error || 'Something went wrong');
            }

            currentResults = data;
            currentSearchResults = [...data]; // Create a copy of the data
            displayResults(data); // Display the results
            updateViewForNewResults(); // Update the view toggle state
            // Show download button if we have results
            if (data.length > 0) {
                downloadBtn.classList.remove('hidden');
            }
        } catch (error) {
            showError(error.message);
        } finally {
            loadingDiv.classList.add('hidden');
        }
    });

    // Function to save search to history
    function saveToHistory(searchTerm, location, results) {
        console.log('Saving to history:', { searchTerm, location, results });
        
        const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
        
        // Log the first business to check its structure
        if (results.length > 0) {
            console.log('First business data:', results[0]);
        }
        
        const searchData = {
            id: Date.now(),
            searchTerm,
            location,
            timestamp: new Date().toISOString(),
            results: results.map(business => {
                // Log each business being saved
                console.log('Saving business:', {
                    name: business.name,
                    place_id: business.place_id,
                    vicinity: business.vicinity,
                    formatted_address: business.formatted_address,
                    rating: business.rating,
                    user_ratings_total: business.user_ratings_total,
                    openNow: business.openNow
                });
                
                return {
                    name: business.name,
                    address: business.vicinity || business.formatted_address || '',
                    place_id: business.place_id,
                    formatted_address: business.formatted_address,
                    rating: business.rating,
                    user_ratings_total: business.user_ratings_total,
                    openNow: business.openNow,
                    reviewed: false,
                    // Save all original business data for reference
                    originalData: business
                };
            })
        };
        
        // Add to beginning of array (most recent first)
        history.unshift(searchData);
        
        // Keep only the 10 most recent searches
        if (history.length > 10) {
            history.pop();
        }
        
        localStorage.setItem('searchHistory', JSON.stringify(history));
        console.log('Saved to history. New history length:', history.length);
        return searchData.id; // Return the search ID for reference
    }
    
    // Function to mark a business as reviewed
    function markAsReviewed(placeId, searchId) {
        try {
            console.log('markAsReviewed called with:', { placeId, searchId });
            
            // Ensure searchId is a number for comparison
            searchId = typeof searchId === 'string' ? parseInt(searchId, 10) : searchId;
            
            const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
            console.log('Current history entries:', history.map(h => ({
                id: h.id,
                searchTerm: h.searchTerm,
                resultCount: h.results ? h.results.length : 0
            })));
            
            // Find the search in history
            const searchIndex = history.findIndex(item => {
                // Handle both string and number IDs
                const itemId = typeof item.id === 'string' ? parseInt(item.id, 10) : item.id;
                return itemId === searchId;
            });
            
            console.log('Found search index:', searchIndex);
            
            if (searchIndex === -1) {
                console.error('Search not found with ID:', searchId, 'Type:', typeof searchId);
                console.log('Available search IDs:', history.map(h => ({
                    id: h.id,
                    type: typeof h.id,
                    searchTerm: h.searchTerm
                })));
                return false;
            }
            
            const searchResults = history[searchIndex].results || [];
            console.log(`Found ${searchResults.length} businesses in search results`);
            
            // Try to find the business by place_id first
            let businessIndex = searchResults.findIndex(biz => biz.place_id === placeId);
            
            // If not found by place_id, try to find by name and address
            if (businessIndex === -1 && placeId.includes('|')) {
                const [name, address] = placeId.split('|');
                businessIndex = searchResults.findIndex(biz => 
                    biz.name === name && 
                    (biz.address === address || biz.vicinity === address || biz.formatted_address === address)
                );
                
                if (businessIndex !== -1) {
                    console.log('Found business by name and address:', name, address);
                }
            }
            
            console.log('Found business index:', businessIndex);
            
            if (businessIndex === -1) {
                console.error('Business not found with place_id:', placeId);
                console.log('Available businesses:', searchResults.map(b => ({
                    name: b.name,
                    place_id: b.place_id,
                    address: b.address || b.vicinity || b.formatted_address
                })));
                return false;
            }
            
            // Mark as reviewed
            history[searchIndex].results[businessIndex].reviewed = true;
            history[searchIndex].results[businessIndex].reviewedAt = new Date().toISOString();
            
            // Save back to localStorage
            localStorage.setItem('searchHistory', JSON.stringify(history));
            console.log('Successfully marked as reviewed:', {
                name: history[searchIndex].results[businessIndex].name,
                place_id: placeId,
                search_id: searchId
            });
            
            return true;
        } catch (error) {
            console.error('Error in markAsReviewed:', error);
            return false;
        }
    }
    
    function displayResults(places) {
        resultsDiv.innerHTML = '';
        
        if (places.length === 0) {
            resultsDiv.innerHTML = '<p class="text-center text-gray-600 col-span-3">No results found. Try a different search.</p>';
            return;
        }
        
        // Get search parameters
        const searchTerm = document.getElementById('business').value;
        const location = document.getElementById('location').value;
        
        // Save to history and get search ID
        const searchId = saveToHistory(searchTerm, location, places);
        
        // Reset the view classes
        resultsDiv.className = '';
        resultsDiv.classList.add('results-grid');
        
        // Update the view based on the saved preference
        const currentView = localStorage.getItem('preferredView') || 'card';
        if (currentView === 'list') {
            resultsDiv.classList.add('list-view');
        } else {
            resultsDiv.classList.add('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'gap-6');
        }
        
        // Ensure the view toggle buttons reflect the current state
        const cardViewBtn = document.getElementById('cardViewBtn');
        const listViewBtn = document.getElementById('listViewBtn');
        
        if (cardViewBtn && listViewBtn) {
            if (currentView === 'card') {
                cardViewBtn.classList.add('active');
                listViewBtn.classList.remove('active');
            } else {
                listViewBtn.classList.add('active');
                cardViewBtn.classList.remove('active');
            }
        }

        const results = places.map(business => {
            return `
                <div class="result-card">
                    ${business.photoUrl ? `
                        <img src="${business.photoUrl}" alt="${business.name}" loading="lazy">
                    ` : `
                        <div class="bg-gray-200 h-48 flex items-center justify-center text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                    `}
                    
                    <div class="card-body">
                        <div class="flex justify-between items-start">
                            <h3>${business.name}</h3>
                            <div class="business-status">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${business.openNow === 'Open' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                    ${business.openNow || 'N/A'}
                                </span>
                            </div>
                        </div>
                        
                        <div class="mt-2 space-y-2">
                            <div class="business-info">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>${business.vicinity || 'Address not available'}</span>
                            </div>
                            
                            ${business.rating ? `
                                <div class="business-info">
                                    <svg class="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                    <span>${business.rating} (${business.user_ratings_total || 0} reviews)</span>
                                </div>
                            ` : ''}
                            
                            ${business.phone ? `
                                <div class="business-info">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498A1 1 0 0121 19.97V19a2 2 0 00-2-2h-1C9.716 17 3 10.284 3 2V5z" />
                                    </svg>
                                    <a href="tel:${business.phone}" class="hover:text-blue-600">${business.phone}</a>
                                </div>
                            ` : ''}
                            
                            ${business.website ? `
                                <div class="business-info">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                    <a href="${business.website}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">
                                        Visit Website
                                    </a>
                                </div>
                            ` : ''}
                            
                            <div class="business-info">
                                <button type="button" class="mark-reviewed-btn text-sm text-blue-600 hover:text-blue-800 flex items-center" 
                                        data-business-id="${business.place_id || ''}"
                                        data-business-name="${business.name.replace(/"/g, '&quot;')}"
                                        data-business-address="${(business.vicinity || business.formatted_address || '').replace(/"/g, '&quot;')}"
                                        data-search-id="${searchId}">
                                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Mark as Reviewed
                                </button>
                                <div class="hidden business-data" 
                                     data-json='${JSON.stringify(business).replace(/'/g, "&#39;")}'>
                                </div>
                            </div>
                        </div>
                        
                        <div class="mt-4 pt-4 border-t border-gray-100">
                            ${business.opening_hours && business.opening_hours.weekday_text ? `
                                <details class="text-sm text-gray-600">
                                    <summary class="cursor-pointer font-medium text-blue-600 hover:text-blue-800">View Opening Hours</summary>
                                    <div class="mt-2 space-y-1">
                                        ${business.opening_hours.weekday_text.map(time => `
                                            <div class="flex justify-between">
                                                <span>${time.split(': ')[0]}</span>
                                                <span>${time.split(': ')[1] || 'Closed'}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </details>
                            ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        resultsDiv.innerHTML = results;
    }

    function showError(message) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }

    // Function to handle mark as reviewed button clicks
    function setupMarkAsReviewedButtons() {
        console.log('Setting up mark as reviewed button handlers');
        
        // Use event delegation on the document
        document.addEventListener('click', function(e) {
            const button = e.target.closest('.mark-reviewed-btn');
            if (!button) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            console.log('Mark as reviewed button clicked');
            
            // Get the hidden business data element
            const businessDataElement = button.closest('.business-info').querySelector('.business-data');
            let businessData = null;
            
            // Try to parse business data from the hidden element
            if (businessDataElement) {
                try {
                    businessData = JSON.parse(businessDataElement.getAttribute('data-json').replace(/&#39;/g, "'"));
                    console.log('Found business data in hidden element:', businessData);
                } catch (e) {
                    console.error('Error parsing business data:', e);
                }
            }
            
            // Get data from attributes as fallback
            const businessId = button.getAttribute('data-business-id');
            const businessName = button.getAttribute('data-business-name') || (businessData ? businessData.name : '');
            const businessAddress = button.getAttribute('data-business-address') || 
                                  (businessData ? (businessData.vicinity || businessData.formatted_address || '') : '');
            const searchId = button.getAttribute('data-search-id');
            
            console.log('Business info:', {
                fromData: !!businessData,
                id: businessId,
                name: businessName,
                address: businessAddress,
                searchId: searchId
            });
            
            // Get the current history or initialize empty array
            const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
            console.log('Current history entries:', history.map(h => ({
                id: h.id,
                searchTerm: h.searchTerm,
                resultCount: h.results ? h.results.length : 0
            })));
            
            // Find the search in history
            const searchIndex = history.findIndex(item => {
                const itemId = item.id ? item.id.toString() : '';
                const searchIdStr = searchId ? searchId.toString() : '';
                return itemId === searchIdStr;
            });
            
            console.log('Found search index:', searchIndex);
            
            if (searchIndex === -1) {
                console.error('Search not found with ID:', searchId);
                console.log('Available search IDs:', history.map(h => ({
                    id: h.id,
                    type: typeof h.id,
                    searchTerm: h.searchTerm
                })));
                return;
            }
            
            const searchResults = history[searchIndex].results || [];
            console.log(`Found ${searchResults.length} businesses in search results`);
            
            // Try to find the business by place_id first
            let businessIndex = searchResults.findIndex(biz => 
                (businessId && biz.place_id === businessId) ||
                (businessData && businessData.place_id && biz.place_id === businessData.place_id)
            );
            
            // If not found by place_id, try to find by name and address
            if (businessIndex === -1 && businessName) {
                console.log('Trying to find business by name and address:', businessName, businessAddress);
                businessIndex = searchResults.findIndex(biz => {
                    const nameMatches = biz.name === businessName;
                    const addressMatches = businessAddress ? (
                        biz.address === businessAddress || 
                        biz.vicinity === businessAddress || 
                        biz.formatted_address === businessAddress
                    ) : true;
                    
                    return nameMatches && addressMatches;
                });
                
                if (businessIndex !== -1) {
                    console.log('Found business by name and address');
                }
            }
            
            console.log('Found business index:', businessIndex);
            
            if (businessIndex === -1) {
                console.error('Business not found with the given details');
                console.log('Search criteria:', { businessName, businessAddress, businessId });
                console.log('Available businesses:', searchResults.map(b => ({
                    name: b.name,
                    place_id: b.place_id,
                    address: b.address || b.vicinity || b.formatted_address,
                    match: (b.name === businessName) && 
                           (b.address === businessAddress || 
                            b.vicinity === businessAddress || 
                            b.formatted_address === businessAddress)
                })));
                return;
            }
            
            // Mark the business as reviewed
            history[searchIndex].results[businessIndex].reviewed = true;
            history[searchIndex].results[businessIndex].reviewedAt = new Date().toISOString();
            
            // Save back to localStorage
            localStorage.setItem('searchHistory', JSON.stringify(history));
            
            console.log('Successfully marked as reviewed:', {
                name: history[searchIndex].results[businessIndex].name,
                place_id: businessId,
                search_id: searchId
            });
            
            // Update the button UI
            button.innerHTML = `
                <svg class="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Reviewed
            `;
            button.classList.remove('text-blue-600', 'hover:text-blue-800');
            button.classList.add('text-green-600', 'cursor-default');
            button.disabled = true;
            
            // Show success notification
            const notification = document.createElement('div');
            notification.className = 'notification fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg';
            notification.textContent = 'Marked as reviewed';
            document.body.appendChild(notification);
            
            // Remove notification after 3 seconds
            
            return false;
        });
    }
    
    // Make the markAsReviewed function available globally
    window.markBusinessAsReviewed = function(button, placeId, searchId) {
        console.log('markBusinessAsReviewed called directly', { placeId, searchId });
        if (markAsReviewed(placeId, searchId)) {
            // Update the button to show it's been reviewed
            button.innerHTML = `
                <svg class="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Reviewed
            `;
            button.classList.remove('text-blue-600', 'hover:text-blue-800');
            button.classList.add('text-green-600', 'cursor-default');
            button.disabled = true;
            
            // Show a success message
            const notification = document.createElement('div');
            notification.className = 'notification fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg';
            notification.textContent = 'Marked as reviewed';
            document.body.appendChild(notification);
            
            // Remove the notification after 3 seconds
            setTimeout(() => {
                notification.remove();
            }, 3000);
            
            return true;
        }
        return false;
    };

    // Setup the click handler when the page loads
    setupMarkAsReviewedButtons();
    
    // Handle CSV download
    downloadBtn.addEventListener('click', () => {
        if (currentSearchResults.length === 0) {
            alert('No results to download. Please perform a search first.');
            return;
        }
        
        const business = document.getElementById('business').value || 'businesses';
        const location = document.getElementById('location').value || 'location';
        const date = new Date().toISOString().split('T')[0];
        
        // Format the data for CSV
        const headers = ['Name', 'Address', 'Phone', 'Website', 'Rating', 'Status'];
        const csvContent = [
            headers.join(','),
            ...currentSearchResults.map(business => [
                `"${business.name.replace(/"/g, '""')}"`,
                `"${(business.address || '').replace(/"/g, '""')}"`,
                `"${(business.phone || '').replace(/"/g, '""')}"`,
                `"${(business.website || '').replace(/"/g, '""')}"`,
                business.rating || '',
                business.openNow || ''
            ].join(','))
        ].join('\n');
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${business}-${location}-${date}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});
