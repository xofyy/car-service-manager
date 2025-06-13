// DOM Elements
let repairsList;
let searchInput;
let statusFilter;
let totalRepairsElement;
let pendingRepairsElement;
let inProgressRepairsElement;
let completedRepairsElement;
let repairsChart;
let addRepairBtn;
let closeBtn;
let repairForm;
let repairModal;
let exportBtn;
let restoreBtn;
let imageUploadArea;
let imageInput;
let imagePreviewContainer;
let sidebarToggle;
let sidebar;
let mainContent;
let isInitialized = false; // Add flag to track initialization

// Constants
const STORAGE_KEY = 'carRepairData';
const STORAGE_STATS_KEY = 'carRepairStats';

// State
let repairs = [];
let currentFilter = 'all';
let searchTerm = '';
let currentView = 'cards';
let isOffline = false;

// Chart instances
let statusChart = null;
let monthlyChart = null;

// Stats state
let currentStats = null;

// Image Upload State
let currentImages = [];
let currentImageIndex = 0;

// Global state for development mode
const IS_DEVELOPMENT = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Lightbox functionality
const lightboxFunctions = {
    closeLightbox: null,
    navigateLightbox: null,
    updateLightboxImage: null
};

// Initialize offline indicator
const offlineIndicator = document.createElement('div');
offlineIndicator.className = 'offline-indicator';
offlineIndicator.innerHTML = '<i class="fas fa-wifi-slash"></i> Working Offline';
document.body.appendChild(offlineIndicator);

// Check online status
window.addEventListener('online', () => {
    isOffline = false;
    offlineIndicator.classList.remove('show');
    syncWithServer();
});

window.addEventListener('offline', () => {
    isOffline = true;
    offlineIndicator.classList.add('show');
});

// Initialize DOM Elements
function initializeDOMElements() {
    if (isInitialized) {
        console.log('DOM elements already initialized');
        return;
    }
    
    console.log('Initializing DOM elements...');
    
    // Sidebar elements
    sidebarToggle = document.getElementById('sidebarToggle');
    sidebar = document.querySelector('.sidebar');
    mainContent = document.querySelector('.main-content');
    
    console.log('Sidebar elements:', {
        toggle: sidebarToggle,
        sidebar: sidebar,
        mainContent: mainContent
    });
    
    // Load saved sidebar state
    const savedSidebarState = localStorage.getItem('sidebarCollapsed');
    console.log('Saved sidebar state:', savedSidebarState);
    
    if (savedSidebarState === 'true') {
        sidebar?.classList.add('collapsed');
        mainContent?.classList.add('expanded');
        console.log('Applied saved collapsed state');
    }
    
    // Remove any existing event listeners
    if (sidebarToggle) {
        const newToggle = sidebarToggle.cloneNode(true);
        sidebarToggle.parentNode.replaceChild(newToggle, sidebarToggle);
        sidebarToggle = newToggle;
        
        // Add sidebar toggle event listener
        sidebarToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Sidebar toggle clicked');
            console.log('Before toggle - Sidebar classes:', sidebar?.classList.toString());
            console.log('Before toggle - Main content classes:', mainContent?.classList.toString());
            
            sidebar?.classList.toggle('collapsed');
            mainContent?.classList.toggle('expanded');
            
            console.log('After toggle - Sidebar classes:', sidebar?.classList.toString());
            console.log('After toggle - Main content classes:', mainContent?.classList.toString());
            
            const isCollapsed = sidebar?.classList.contains('collapsed');
            localStorage.setItem('sidebarCollapsed', isCollapsed);
            console.log('Saved new sidebar state:', isCollapsed);
        });
    } else {
        console.warn('Sidebar toggle button not found!');
    }

    isInitialized = true;
    // Get all required elements
    repairsList = document.getElementById('repairsTableBody');
    searchInput = document.getElementById('searchInput');
    statusFilter = document.getElementById('statusFilter');
    totalRepairsElement = document.getElementById('totalRepairs');
    pendingRepairsElement = document.getElementById('pendingRepairs');
    inProgressRepairsElement = document.getElementById('inProgressRepairs');
    completedRepairsElement = document.getElementById('completedRepairs');
    repairsChart = document.getElementById('repairsChart');
    addRepairBtn = document.getElementById('addRepairBtn');
    closeBtn = document.querySelector('.close-btn');
    repairForm = document.getElementById('repairForm');
    repairModal = document.getElementById('repairModal');
    exportBtn = document.getElementById('exportBtn');
    restoreBtn = document.getElementById('restoreBtn');
    imageUploadArea = document.getElementById('imageUploadArea');
    imageInput = document.getElementById('repairImages');
    imagePreviewContainer = document.getElementById('imagePreviewContainer');

    // Verify all required elements exist
    const requiredElements = {
        repairsTableBody: repairsList,
        searchInput,
        statusFilter,
        totalRepairsElement,
        pendingRepairsElement,
        inProgressRepairsElement,
        completedRepairsElement,
        repairsChart,
        addRepairBtn,
        closeBtn,
        repairForm,
        repairModal,
        exportBtn,
        restoreBtn
    };

    const missingElements = Object.entries(requiredElements)
        .filter(([_, element]) => !element)
        .map(([name]) => name);

    if (missingElements.length > 0) {
        console.error('Missing required DOM elements:', missingElements);
        return false;
    }

    console.log('All DOM elements initialized successfully');
    return true;
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing application...');
    
    try {
        // Check authentication first
        if (!auth.isAuthenticated()) {
            console.log('User not authenticated, redirecting to login...');
            window.location.href = '/login.html';
            return;
        }

        // Verify token
        const isValid = await auth.verifyToken();
        if (!isValid) {
            console.log('Token invalid, redirecting to login...');
            window.location.href = '/login.html';
            return;
        }

        // Debug: Log current user info
        console.log('Current user info:', {
            user: auth.user,
            role: auth.user?.role,
            isAdmin: auth.user?.role === 'admin'
        });

        // Initialize DOM elements
        if (!initializeDOMElements()) {
            console.error('Failed to initialize DOM elements');
            UI.toast.show('Failed to initialize application', 'error');
            return;
        }
        
        // Initialize chart first
        initializeChart();
        
        // Load initial data
        await loadRepairs();
        await loadStats();
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error initializing application:', error);
        UI.toast.show('Failed to initialize application', 'error');
    }
});

// Load Repairs
async function loadRepairs() {
    try {
        console.log('Loading repairs...');
        const response = await fetch('/api/repairs', {
            headers: {
                'Authorization': `Bearer ${auth.token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw { code: 'INVALID_TOKEN' };
            }
            throw new Error('Failed to fetch repairs');
        }

        const repairs = await response.json();
        console.log('Loaded repairs:', repairs.length);
        updateRepairsTable(repairs);
    } catch (error) {
        console.error('Error loading repairs:', error);
        if (error.code === 'INVALID_TOKEN') {
            throw error; // Let the caller handle auth errors
        }
        UI.toast.show('Failed to load repairs', 'error');
    }
}

// Update Repairs Table
function updateRepairsTable(repairs) {
    console.log('Updating repairs table...');
    const tbody = document.getElementById('repairsTableBody');
    if (!tbody) {
        console.error('Repairs table body not found');
        return;
    }

    if (!repairs || repairs.length === 0) {
        console.log('No repairs to display');
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4 text-gray-500">
                    No repairs found
                </td>
            </tr>
        `;
        return;
    }

    console.log('Rendering repairs:', repairs.length);
    tbody.innerHTML = repairs.map(repair => `
        <tr>
            <td>
                <div class="flex items-center">
                    <div>
                        <div class="font-medium text-gray-900">${repair.customerName}</div>
                        <div class="text-sm text-gray-500">${repair.customerPhone}</div>
                    </div>
                </div>
            </td>
            <td>
                <div class="text-sm text-gray-900">${repair.vehicleBrand} ${repair.vehicleModel}</div>
                <div class="text-sm text-gray-500">${repair.licensePlate}</div>
            </td>
            <td>
                <span class="status-badge status-${repair.status}">
                    ${repair.status.charAt(0).toUpperCase() + repair.status.slice(1)}
                </span>
            </td>
            <td>
                <div class="text-sm text-gray-900">$${repair.estimatedCost}</div>
                ${repair.actualCost ? `<div class="text-sm text-gray-500">Actual: $${repair.actualCost}</div>` : ''}
            </td>
            <td>
                <div class="text-sm text-gray-900">${new Date(repair.createdDate).toLocaleDateString()}</div>
                <div class="text-sm text-gray-500">${new Date(repair.updatedDate).toLocaleDateString()}</div>
            </td>
            <td>
                <div class="flex items-center space-x-3">
                    <button onclick="editRepair('${repair._id}')" class="btn btn-ghost">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                    </button>
                    <button onclick="deleteRepair('${repair._id}')" class="btn btn-ghost text-red-600 hover:text-red-700">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    console.log('Repairs table updated');
}

// Load Stats
async function loadStats() {
    try {
        const statsSection = document.querySelector('.stats-section');
        console.log('Stats section element:', statsSection);
        
        // Always show stats section
        if (statsSection) {
            console.log('Showing stats section');
            statsSection.classList.remove('hidden');
        }

        // Try to load stats data
        try {
            const response = await fetch('/api/stats', {
                headers: {
                    'Authorization': `Bearer ${auth.token}`
                }
            });

            console.log('Stats API response:', {
                status: response.status,
                ok: response.ok,
                statusText: response.statusText
            });

            if (response.ok) {
                const stats = await response.json();
                console.log('Stats data received:', stats);
                updateStatsDisplay(stats);
            } else {
                // If we can't get stats, show zeros
                console.log('Could not load stats, showing zeros');
                updateStatsDisplay({
                    totalRepairs: 0,
                    pendingCount: 0,
                    inProgressCount: 0,
                    completedCount: 0,
                    monthlyData: []
                });
            }
        } catch (error) {
            console.error('Error loading stats data:', error);
            // Show zeros if we can't load stats
            updateStatsDisplay({
                totalRepairs: 0,
                pendingCount: 0,
                inProgressCount: 0,
                completedCount: 0,
                monthlyData: []
            });
        }
    } catch (error) {
        console.error('Error in loadStats:', error);
        // Keep stats section visible even if there's an error
        const statsSection = document.querySelector('.stats-section');
        if (statsSection) {
            statsSection.classList.remove('hidden');
        }
    }
}

// Update Stats Display
function updateStatsDisplay(stats) {
    console.log('Updating stats display with:', stats);
    if (!stats) {
        console.warn('No stats data provided, using zeros');
        stats = {
            totalRepairs: 0,
            pendingCount: 0,
            inProgressCount: 0,
            completedCount: 0,
            monthlyData: []
        };
    }

    // Update stats numbers
    if (totalRepairsElement) {
        console.log('Updating total repairs:', stats.totalRepairs);
        totalRepairsElement.textContent = stats.totalRepairs || 0;
    }
    if (pendingRepairsElement) {
        console.log('Updating pending repairs:', stats.pendingCount);
        pendingRepairsElement.textContent = stats.pendingCount || 0;
    }
    if (inProgressRepairsElement) {
        console.log('Updating in-progress repairs:', stats.inProgressCount);
        inProgressRepairsElement.textContent = stats.inProgressCount || 0;
    }
    if (completedRepairsElement) {
        console.log('Updating completed repairs:', stats.completedCount);
        completedRepairsElement.textContent = stats.completedCount || 0;
    }

    // Initialize chart if it doesn't exist
    if (!statusChart) {
        console.log('Chart not initialized, initializing now');
        initializeChart();
    }

    // Update chart data
    if (statusChart) {
        console.log('Updating chart with new data:', {
            pending: stats.pendingCount || 0,
            inProgress: stats.inProgressCount || 0,
            completed: stats.completedCount || 0
        });
        statusChart.data.datasets[0].data = [
            stats.pendingCount || 0,
            stats.inProgressCount || 0,
            stats.completedCount || 0
        ];
        statusChart.update();
    }

    // Store current stats for other uses
    currentStats = stats;
    console.log('Stats display updated successfully');
}

// Initialize Chart
function initializeChart() {
    console.log('Initializing chart...');
    const ctx = document.getElementById('repairsChart');
    
    if (!ctx) {
        console.log('Chart canvas not found, skipping chart initialization');
        return;
    }

    // Destroy existing chart if it exists
    if (statusChart) {
        console.log('Destroying existing chart');
        statusChart.destroy();
    }

    try {
        console.log('Creating new chart...');
        statusChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Pending', 'In Progress', 'Completed'],
                datasets: [{
                    label: 'Repairs by Status',
                    data: [0, 0, 0],
                    backgroundColor: [
                        '#ffeeba', // Pending - yellow
                        '#b8daff', // In Progress - blue
                        '#c3e6cb'  // Completed - green
                    ],
                    borderColor: [
                        '#856404', // Pending border
                        '#004085', // In Progress border
                        '#155724'  // Completed border
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Repairs by Status',
                        font: {
                            size: 16
                        }
                    }
                }
            }
        });
        console.log('Chart initialized successfully');
    } catch (error) {
        console.error('Error initializing chart:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(async (e) => {
            const query = e.target.value.trim();
            if (query) {
                try {
                    const response = await fetch(`/api/repairs/search?q=${encodeURIComponent(query)}`, {
                        headers: {
                            'Authorization': `Bearer ${auth.token}`
                        }
                    });
                    if (!response.ok) throw new Error('Search failed');
                    const repairs = await response.json();
                    updateRepairsTable(repairs);
                } catch (error) {
                    console.error('Search error:', error);
                    UI.toast.show('Search failed', 'error');
                }
            } else {
                loadRepairs();
            }
        }, 300));
    }

    // Export functionality
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', handleExport);
    }
}

// Handle export functionality
async function handleExport() {
    try {
        const response = await fetch('/api/repairs/export', {
            headers: {
                'Authorization': `Bearer ${auth.token}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || errorData.error || 'Export failed');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `repairs-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
        UI.toast.show('Export successful', 'success');
    } catch (error) {
        console.error('Export error:', error);
        UI.toast.show(error.message || 'Export failed', 'error');
    }
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Repair Management Functions
async function editRepair(id) {
    try {
        const response = await fetch(`/api/repairs/${id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch repair details');
        
        const repair = await response.json();
        UI.modals.repair?.open(repair);
    } catch (error) {
        console.error('Error fetching repair:', error);
        UI.toast.show('Failed to load repair details', 'error');
    }
}

async function deleteRepair(id) {
    if (!confirm('Are you sure you want to delete this repair?')) return;

    try {
        const response = await fetch(`/api/repairs/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Failed to delete repair');

        UI.toast.show('Repair deleted successfully', 'success');
        loadRepairs();
        loadStats();
    } catch (error) {
        console.error('Error deleting repair:', error);
        UI.toast.show('Failed to delete repair', 'error');
    }
}

function viewImages(id) {
    // TODO: Implement image gallery view
    showToast('Image gallery coming soon', 'info');
}

// Image Upload Handling
function setupImageUpload() {
    const imageUpload = document.getElementById('imageUpload');
    const imageInput = document.getElementById('imageInput');
    const imagePreview = document.getElementById('imagePreview');

    if (!imageUpload || !imageInput || !imagePreview) return;

    imageUpload.onclick = () => imageInput.click();

    imageInput.onchange = async (e) => {
        const files = Array.from(e.target.files);
        
        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                showToast('Please upload only image files', 'error');
                continue;
            }

            if (file.size > 5 * 1024 * 1024) {
                showToast('Image size should be less than 5MB', 'error');
                continue;
            }

            const formData = new FormData();
            formData.append('image', file);

            try {
                const response = await fetch('/api/repairs/upload', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: formData
                });

                if (!response.ok) throw new Error('Upload failed');

                const data = await response.json();
                updateImagePreviews(data.image);
            } catch (error) {
                console.error('Upload error:', error);
                showToast('Failed to upload image', 'error');
            }
        }

        // Reset input
        imageInput.value = '';
    };
}

function updateImagePreviews(image) {
    const imagePreview = document.getElementById('imagePreview');
    if (!imagePreview) return;

    const div = document.createElement('div');
    div.className = 'image-preview-item';
    div.innerHTML = `
        <img src="${image.url}" alt="Repair image">
        <button type="button" class="remove-image" onclick="removeImage('${image._id}')">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
        </button>
    `;

    imagePreview.appendChild(div);
}

async function removeImage(imageId) {
    if (!confirm('Are you sure you want to remove this image?')) return;

    try {
        const response = await fetch(`/api/repairs/images/${imageId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Failed to delete image');

        const imageElement = document.querySelector(`[onclick="removeImage('${imageId}')"]`).parentElement;
        imageElement.remove();
        showToast('Image removed successfully', 'success');
    } catch (error) {
        console.error('Error removing image:', error);
        showToast('Failed to remove image', 'error');
    }
}

// Sync with server when coming back online
async function syncWithServer() {
    if (isOffline) return;
    
    try {
        const localRepairs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const response = await fetchWithAuth('/api/repairs/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repairs: localRepairs })
        });
        
        if (!response.ok) throw new Error('Failed to sync with server');
        
        const { repairs: syncedRepairs } = await response.json();
        repairs = syncedRepairs;
        renderRepairs();
        showNotification('Data synchronized successfully', 'success');
    } catch (error) {
        console.error('Sync error:', error);
        showNotification('Error synchronizing data', 'error');
    }
}

// UI Functions
function renderRepairs(repairsToRender = repairs) {
    if (!repairsList) return;
    
    // Filter repairs based on search and status
    let filteredRepairs = repairsToRender;
    
    if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filteredRepairs = filteredRepairs.filter(repair => 
            repair.customerName.toLowerCase().includes(searchLower) ||
            repair.vehicleBrand.toLowerCase().includes(searchLower) ||
            repair.vehicleModel.toLowerCase().includes(searchLower) ||
            repair.licensePlate.toLowerCase().includes(searchLower)
        );
    }
    
    if (currentFilter !== 'all') {
        filteredRepairs = filteredRepairs.filter(repair => repair.status === currentFilter);
    }
    
    // Sort repairs by date (newest first)
    filteredRepairs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Update stats
    updateStatsDisplay(filteredRepairs);
    
    // Render repairs
    repairsList.innerHTML = filteredRepairs.length ? '' : '<div class="no-repairs">No repairs found</div>';
    
    filteredRepairs.forEach(repair => {
        const card = document.createElement('div');
        card.className = 'repair-card';
        card.dataset.repairId = repair._id;
        
        card.innerHTML = `
            <div class="repair-card-header">
                <h3>${repair.customerName}</h3>
                <span class="repair-status status-${repair.status}">${repair.status}</span>
            </div>
            <div class="repair-details">
                <p><strong>Vehicle:</strong> ${repair.vehicleBrand} ${repair.vehicleModel}</p>
                <p><strong>License Plate:</strong> ${repair.licensePlate}</p>
                <p><strong>Phone:</strong> ${repair.customerPhone}</p>
                <p><strong>Description:</strong> ${repair.repairDescription}</p>
                <p><strong>Estimated Cost:</strong> $${repair.estimatedCost.toFixed(2)}</p>
                ${repair.actualCost ? `<p><strong>Actual Cost:</strong> $${repair.actualCost.toFixed(2)}</p>` : ''}
                ${repair.assignedTechnician ? `<p><strong>Technician:</strong> ${repair.assignedTechnician}</p>` : ''}
            </div>
            ${repair.images && repair.images.length > 0 ? `
                <div class="repair-images">
                    ${repair.images.map((image, index) => `
                        <img src="${image.url}" alt="Repair image ${index + 1}" 
                             class="repair-image" data-image-index="${index}">
                    `).join('')}
                </div>
            ` : ''}
            <div class="repair-actions">
                <button class="btn btn-secondary edit-btn" title="Edit repair">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-secondary delete-btn" title="Delete repair">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        
        repairsList.appendChild(card);
    });
}

function showNotification(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = document.createElement('i');
    icon.className = `fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}`;
    
    const text = document.createElement('span');
    text.textContent = message;
    
    toast.appendChild(icon);
    toast.appendChild(text);
    
    const container = document.querySelector('.toast-container');
    container.appendChild(toast);
    
    // Trigger reflow
    toast.offsetHeight;
    
    // Show toast
    toast.classList.add('show');
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Make functions available globally
window.editRepair = editRepair;
window.deleteRepair = deleteRepair;
window.openLightbox = openLightbox;
window.closeLightbox = lightboxFunctions.closeLightbox;
window.navigateLightbox = lightboxFunctions.navigateLightbox;
window.updateLightboxImage = lightboxFunctions.updateLightboxImage;
window.removeImage = removeImage;

// Initialize stats and charts
async function initializeStats() {
    await fetchStats();
    createCharts();
}

// Create charts
function createCharts() {
    // Status Distribution Chart
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    statusChart = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
            labels: ['Pending', 'In Progress', 'Completed'],
            datasets: [{
                data: [
                    currentStats.pendingCount,
                    currentStats.inProgressCount,
                    currentStats.completedCount
                ],
                backgroundColor: [
                    'rgba(241, 196, 15, 0.8)',  // Warning color
                    'rgba(74, 144, 226, 0.8)',  // Primary color
                    'rgba(46, 204, 113, 0.8)'   // Success color
                ],
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: 'white',
                        font: {
                            size: 12
                        }
                    }
                }
            },
            animation: {
                animateScale: true,
                animateRotate: true
            }
        }
    });

    // Monthly Volume Chart
    const monthlyCtx = document.getElementById('monthlyChart').getContext('2d');
    monthlyChart = new Chart(monthlyCtx, {
        type: 'bar',
        data: {
            labels: currentStats.monthlyData.map(d => d.month),
            datasets: [{
                label: 'Repairs',
                data: currentStats.monthlyData.map(d => d.count),
                backgroundColor: 'rgba(74, 144, 226, 0.8)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 2,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'white'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'white'
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
}

// Update status chart
function updateStatusChart(stats) {
    statusChart.data.datasets[0].data = [
        stats.pendingCount,
        stats.inProgressCount,
        stats.completedCount
    ];
    statusChart.update();
}

// Update monthly chart
function updateMonthlyChart(monthlyData) {
    monthlyChart.data.labels = monthlyData.map(d => d.month);
    monthlyChart.data.datasets[0].data = monthlyData.map(d => d.count);
    monthlyChart.update();
}

// Setup image upload handlers
function setupImageUpload() {
    const imageInput = document.getElementById('repairImages');
    const previewContainer = document.getElementById('imagePreview');
    
    if (!imageInput || !previewContainer) return;
    
    imageInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        try {
            for (const file of files) {
                if (!file.type.startsWith('image/')) {
                    showNotification('Only image files are allowed', 'error');
                    continue;
                }
                
                if (file.size > 5 * 1024 * 1024) { // 5MB limit
                    showNotification('Image size should be less than 5MB', 'error');
                    continue;
                }
                
                const formData = new FormData();
                formData.append('image', file);
                
                const response = await fetchWithAuth('/api/repairs/upload', {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) throw new Error('Failed to upload image');
                
                const data = await response.json();
                currentImages.push({
                    url: data.url,
                    filename: data.filename
                });
            }
            
            updateImagePreviews();
            showNotification('Images uploaded successfully', 'success');
        } catch (error) {
            console.error('Image upload error:', error);
            showNotification('Error uploading images', 'error');
        }
        
        // Reset input
        imageInput.value = '';
    });
}

function updateImagePreviews() {
    const container = document.getElementById('imagePreview');
    if (!container) return;
    
    container.innerHTML = '';
    
    currentImages.forEach((image, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'image-preview-item';
        
        const img = document.createElement('img');
        img.src = image.url;
        img.alt = 'Repair image';
        img.className = 'repair-image';
        img.onclick = () => openLightbox(index);
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-image';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.onclick = async (e) => {
            e.stopPropagation();
            if (await removeImage(image.filename, index)) {
                currentImages.splice(index, 1);
                updateImagePreviews();
            }
        };
        
        wrapper.appendChild(img);
        wrapper.appendChild(removeBtn);
        container.appendChild(wrapper);
    });
}

async function removeImage(filename, index) {
    try {
        const response = await fetchWithAuth(`/api/repairs/images/${filename}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete image');
        
        showNotification('Image removed successfully', 'success');
        return true;
    } catch (error) {
        console.error('Error removing image:', error);
        showNotification('Error removing image', 'error');
        return false;
    }
}

// Lightbox functionality
function setupLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) {
        console.warn('Lightbox element not found');
        return;
    }
    
    const lightboxImg = document.getElementById('lightboxImage');
    const closeBtn = document.querySelector('.lightbox-close');
    const prevBtn = document.querySelector('.lightbox-nav.prev');
    const nextBtn = document.querySelector('.lightbox-nav.next');

    if (!lightboxImg || !closeBtn || !prevBtn || !nextBtn) {
        console.warn('Some lightbox elements are missing');
        return;
    }

    // Define lightbox functions
    lightboxFunctions.closeLightbox = () => {
        lightbox.classList.remove('show');
        document.body.style.overflow = ''; // Restore scrolling
    };

    lightboxFunctions.navigateLightbox = (direction) => {
        if (!currentImages || !currentImages.length) return;
        
        if (direction === 'prev') {
            currentImageIndex = (currentImageIndex - 1 + currentImages.length) % currentImages.length;
        } else {
            currentImageIndex = (currentImageIndex + 1) % currentImages.length;
        }
        lightboxFunctions.updateLightboxImage();
    };

    lightboxFunctions.updateLightboxImage = () => {
        if (!lightboxImg || !currentImages || !currentImages.length) return;
        
        const image = currentImages[currentImageIndex];
        if (image) {
            lightboxImg.src = image.url;
            lightboxImg.alt = `Repair image ${currentImageIndex + 1}`;
        }
    };

    // Event listeners
    closeBtn.addEventListener('click', lightboxFunctions.closeLightbox);
    prevBtn.addEventListener('click', () => lightboxFunctions.navigateLightbox('prev'));
    nextBtn.addEventListener('click', () => lightboxFunctions.navigateLightbox('next'));

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            lightboxFunctions.closeLightbox();
        }
    });

    // Make functions available globally
    window.closeLightbox = lightboxFunctions.closeLightbox;
    window.navigateLightbox = lightboxFunctions.navigateLightbox;
    window.updateLightboxImage = lightboxFunctions.updateLightboxImage;
}

// Open lightbox with proper error handling
function openLightbox(index) {
    try {
        if (!currentImages || !currentImages.length) {
            console.warn('No images available to display');
            return;
        }

        if (index < 0 || index >= currentImages.length) {
            console.warn('Invalid image index:', index);
            return;
        }

        const lightbox = document.getElementById('lightbox');
        if (!lightbox) {
            console.error('Lightbox element not found');
            return;
        }

        currentImageIndex = index;
        lightboxFunctions.updateLightboxImage();
        lightbox.classList.add('show');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    } catch (error) {
        console.error('Error opening lightbox:', error);
        showNotification('Error displaying image', 'error');
    }
}

// API and Authentication functions
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('token');
    if (!token) {
        throw { error: 'No authentication token found', code: 'NO_TOKEN' };
    }

    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    try {
        const response = await fetch(url, { ...defaultOptions, ...options });
        
        // Check for new token
        const newToken = response.headers.get('X-New-Token');
        if (newToken) {
            console.log('Received new token');
            localStorage.setItem('token', newToken);
        }
        
        if (response.status === 401) {
            const data = await response.json();
            localStorage.removeItem('token');
            throw data;
        }
        
        return response;
    } catch (error) {
        if (error.code) {
            // This is an auth error from our backend
            throw error;
        }
        // This is a network or other error
        console.error('Fetch error:', error);
        throw { error: 'Network error', code: 'NETWORK_ERROR' };
    }
}

// Update initializeApp to include user menu and event listeners
function initializeApp() {
    // Initialize chart
    initializeChart();
    
    // Setup event listeners
    setupEventListeners();
    
    // Fetch initial data
    loadRepairs();
    
    addUserMenu();
}

let repairsChartInstance = null;

// Initialize chart
function initializeChart() {
    const ctx = document.getElementById('repairsChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (statusChart) {
        statusChart.destroy();
    }
    
    statusChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Pending', 'In Progress', 'Completed'],
            datasets: [{
                label: 'Repairs by Status',
                data: [0, 0, 0],
                backgroundColor: [
                    '#ffeeba', // Pending - yellow
                    '#b8daff', // In Progress - blue
                    '#c3e6cb'  // Completed - green
                ],
                borderColor: [
                    '#856404', // Pending border
                    '#004085', // In Progress border
                    '#155724'  // Completed border
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Repairs by Status',
                    font: {
                        size: 16
                    }
                }
            }
        }
    });
}

// Update chart with new data
function updateChart(stats) {
    if (!repairsChartInstance) {
        initializeChart();
    }

    if (repairsChartInstance) {
        repairsChartInstance.data.datasets[0].data = [
            stats.total,
            stats.pending,
            stats.inProgress,
            stats.completed
        ];
        repairsChartInstance.update();
    }
}

// Add user menu to header
function addUserMenu() {
    const user = localStorage.getItem('token') ? JSON.parse(localStorage.getItem('token')).user : null;
    const header = document.querySelector('header');
    const userMenu = document.createElement('div');
    userMenu.className = 'user-menu';
    userMenu.innerHTML = `
        <button class="user-menu-button">
            <i class="fas fa-user-circle"></i>
            <span>${user?.username || ''}</span>
            <i class="fas fa-chevron-down"></i>
        </button>
        <div class="user-menu-dropdown">
            <div class="user-menu-item">
                <i class="fas fa-user"></i>
                <span>${user?.role || ''}</span>
            </div>
            <div class="user-menu-divider"></div>
            <a href="#" class="user-menu-item" id="logoutButton">
                <i class="fas fa-sign-out-alt"></i>
                <span>Logout</span>
            </a>
        </div>
    `;
    
    header.appendChild(userMenu);
    
    // Add click handlers
    const menuButton = userMenu.querySelector('.user-menu-button');
    const logoutButton = userMenu.querySelector('#logoutButton');
    
    menuButton.addEventListener('click', () => {
        userMenu.classList.toggle('show');
    });
    
    logoutButton.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.href = '/login.html';
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!userMenu.contains(e.target)) {
            userMenu.classList.remove('show');
        }
    });
}

// Close all modals
function closeAllModals() {
    closeModal();
    closeLightbox();
}

// Make functions available globally
window.editRepair = editRepair;
window.deleteRepair = deleteRepair;
window.openLightbox = openLightbox;
window.closeLightbox = lightboxFunctions.closeLightbox;
window.navigateLightbox = lightboxFunctions.navigateLightbox;
window.updateLightboxImage = lightboxFunctions.updateLightboxImage;
window.removeImage = removeImage;

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing application...');
    
    if (!initializeDOMElements()) {
        console.error('Failed to initialize DOM elements');
        return;
    }

    try {
        await loadRepairs();
        await loadStats();
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error initializing application:', error);
        UI.toast.show('Failed to initialize application', 'error');
    }
}); 