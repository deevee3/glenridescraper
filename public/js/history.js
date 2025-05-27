document.addEventListener('DOMContentLoaded', () => {
    const historyModal = document.getElementById('historyModal');
    const toggleHistoryBtn = document.getElementById('toggleHistory');
    const closeHistoryBtn = document.getElementById('closeHistory');
    const historyList = document.getElementById('historyList');
    const searchForm = document.getElementById('searchForm');
    const businessInput = document.getElementById('business');
    const locationInput = document.getElementById('location');

    // Toggle history modal
    toggleHistoryBtn?.addEventListener('click', () => {
        historyModal.classList.toggle('hidden');
        displayHistory();
    });

    // Close history modal
    closeHistoryBtn?.addEventListener('click', () => {
        historyModal.classList.add('hidden');
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === historyModal) {
            historyModal.classList.add('hidden');
        }
    });

    // Load search history
    function displayHistory() {
        const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
        
        if (history.length === 0) {
            historyList.innerHTML = '<p class="text-gray-500">No search history yet.</p>';
            return;
        }
        
        historyList.innerHTML = history.map(item => {
            // Count reviewed businesses
            const totalBusinesses = item.results?.length || 0;
            const reviewedCount = item.results?.filter(biz => biz.reviewed).length || 0;
            const progressPercentage = totalBusinesses > 0 ? Math.round((reviewedCount / totalBusinesses) * 100) : 0;
            
            // Create business list items
            const businessItems = (item.results || []).map(biz => `
                <div class="flex items-center justify-between py-1 px-2 rounded ${biz.reviewed ? 'bg-green-50' : 'hover:bg-gray-50'}">
                    <span class="truncate">${biz.name || 'Unknown Business'}</span>
                    ${biz.reviewed ? `
                        <span class="text-green-600 text-xs flex items-center">
                            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                            </svg>
                            Reviewed
                        </span>
                    ` : ''}
                </div>
            `).join('');
            
            return `
                <div class="border-b border-gray-200 pb-4 mb-4">
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <div class="flex justify-between items-center">
                                <h4 class="font-semibold">${item.searchTerm || 'Untitled Search'}</h4>
                                <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                    ${reviewedCount}/${totalBusinesses} reviewed
                                </span>
                            </div>
                            <p class="text-sm text-gray-600">${item.location || 'No location'}</p>
                            <p class="text-xs text-gray-500 mb-2">${item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Unknown date'}</p>
                            
                            <!-- Progress bar -->
                            <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                                <div class="bg-blue-600 h-2 rounded-full" style="width: ${progressPercentage}%"></div>
                            </div>
                            
                            <!-- Business list -->
                            <div class="mt-2 space-y-1 max-h-40 overflow-y-auto text-sm">
                                ${businessItems}
                            </div>
                            
                            <!-- Search Again Button -->
                            <div class="mt-3">
                                <button class="text-blue-600 hover:text-blue-800 text-sm font-medium" 
                                        onclick="document.getElementById('business').value='${item.searchTerm || ''}'; document.getElementById('location').value='${item.location || ''}'; document.getElementById('searchForm').dispatchEvent(new Event('submit')); document.getElementById('historyModal').classList.add('hidden');">
                                    Search Again
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Load a saved search
    window.loadSearch = async (searchId) => {
        try {
            const response = await fetch(`/api/history/${searchId}`);
            const search = await response.json();
            
            // Fill the form
            if (businessInput) businessInput.value = search.query || '';
            if (locationInput) locationInput.value = search.location || '';
            
            // Close the history modal
            if (historyModal) historyModal.classList.add('hidden');
            
            // Trigger search if form exists
            if (searchForm) {
                searchForm.dispatchEvent(new Event('submit'));
            }
        } catch (error) {
            console.error('Error loading search:', error);
            alert('Error loading search. Please try again.');
        }
    };

    // Delete a saved search
    window.deleteSearch = async (searchId, button) => {
        if (!confirm('Are you sure you want to delete this search?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/history/${searchId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                // Remove the search item from the UI
                if (button && button.closest('.border')) {
                    button.closest('.border').remove();
                }
                
                // If no more items, show message
                if (historyList && !document.querySelector('#historyList > div')) {
                    historyList.innerHTML = '<p class="text-gray-500">No search history found.</p>';
                }
            } else {
                throw new Error('Failed to delete search');
            }
        } catch (error) {
            console.error('Error deleting search:', error);
            alert('Error deleting search. Please try again.');
        }
    };

    // Download history report
    document.getElementById('downloadHistoryReport')?.addEventListener('click', () => {
        const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
        
        if (history.length === 0) {
            alert('No search history available to download.');
            return;
        }
        
        // Create CSV content
        let csvContent = 'Search Term,Location,Date,Total Businesses,Reviewed,Review Percentage\n';
        
        // Add search summaries
        history.forEach(item => {
            const totalBusinesses = item.results?.length || 0;
            const reviewedCount = item.results?.filter(biz => biz.reviewed).length || 0;
            const reviewPercentage = totalBusinesses > 0 ? (reviewedCount / totalBusinesses * 100).toFixed(1) : 0;
            const date = item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Unknown date';
            
            csvContent += `"${item.searchTerm || 'Untitled Search'}",`;
            csvContent += `"${item.location || 'No location'}",`;
            csvContent += `"${date}",`;
            csvContent += `${totalBusinesses},`;
            csvContent += `${reviewedCount},`;
            csvContent += `${reviewPercentage}%\n`;
            
            // Add reviewed businesses
            const reviewedBusinesses = (item.results || []).filter(biz => biz.reviewed);
            if (reviewedBusinesses.length > 0) {
                csvContent += '\n,Reviewed Businesses\n';
                csvContent += ',Name,Address,Rating,Review Count,Reviewed At\n';
                
                reviewedBusinesses.forEach(biz => {
                    csvContent += ','; // Empty first column for indentation
                    csvContent += `"${biz.name || 'Unknown Business'}",`;
                    csvContent += `"${biz.address || biz.vicinity || biz.formatted_address || 'No address'}",`;
                    csvContent += `${biz.rating || 'N/A'},`;
                    csvContent += `${biz.user_ratings_total || 'N/A'},`;
                    csvContent += `${biz.reviewedAt ? new Date(biz.reviewedAt).toLocaleString() : 'Unknown'}\n`;
                });
                
                csvContent += '\n';
            }
            
            // Add a separator between searches
            csvContent += '\n';
        });
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        link.setAttribute('href', url);
        link.setAttribute('download', `business-search-report-${timestamp}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Show success message
        const notification = document.createElement('div');
        notification.className = 'notification fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg';
        notification.textContent = 'Report downloaded successfully';
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    });
});
