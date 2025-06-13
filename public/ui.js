// UI State Management
const UI = {
    sidebar: {
        isCollapsed: false,
        isMobileOpen: false,
        toggle() {
            this.isCollapsed = !this.isCollapsed;
            document.body.classList.toggle('sidebar-collapsed', this.isCollapsed);
            localStorage.setItem('sidebarCollapsed', this.isCollapsed);
        },
        toggleMobile() {
            this.isMobileOpen = !this.isMobileOpen;
            document.querySelector('.sidebar')?.classList.toggle('open', this.isMobileOpen);
        }
    },
    modals: {
        repair: null,
        lightbox: null,
        closeAll() {
            this.repair?.close();
            this.lightbox?.close();
        }
    },
    currentView: 'dashboard',
    toast: {
        container: null,
        show(message, type = 'info') {
            if (!this.container) {
                this.container = document.createElement('div');
                this.container.className = 'toast-container';
                document.body.appendChild(this.container);
            }

            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            
            const icon = {
                success: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',
                error: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>',
                warning: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
                info: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
            }[type];

            toast.innerHTML = `
                <div class="flex items-center">
                    ${icon}
                    <span class="ml-2">${message}</span>
                </div>
            `;

            this.container.appendChild(toast);
            setTimeout(() => toast.classList.add('show'), 100);
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    }
};

// Initialize UI Components
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing UI components...');
    
    // Initialize sidebar state
    const savedSidebarState = localStorage.getItem('sidebarCollapsed');
    if (savedSidebarState) {
        UI.sidebar.isCollapsed = savedSidebarState === 'true';
        document.body.classList.toggle('sidebar-collapsed', UI.sidebar.isCollapsed);
    }
    
    // Initialize sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    
    sidebarToggle?.addEventListener('click', () => UI.sidebar.toggle());
    mobileMenuToggle?.addEventListener('click', () => UI.sidebar.toggleMobile());
    
    // Close sidebar on mobile when clicking outside
    document.addEventListener('click', (e) => {
        const sidebar = document.querySelector('.sidebar');
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        
        if (UI.sidebar.isMobileOpen && 
            sidebar && 
            !sidebar.contains(e.target) && 
            e.target !== mobileMenuToggle) {
            UI.sidebar.toggleMobile();
        }
    });

    // Initialize modals
    initializeModals();
    
    // Initialize form handlers
    initializeFormHandlers();
    
    // Initialize other UI components
    initializeToasts();
    setupEventListeners();
    
    console.log('UI components initialized');
});

// Modal Management
function initializeModals() {
    console.log('Initializing modals...');
    
    // Repair Modal
    const repairModal = document.getElementById('repairModal');
    const closeBtn = document.getElementById('closeBtn');
    
    if (repairModal) {
        UI.modals.repair = {
            element: repairModal,
            open: async (repair = null) => {
                console.log('Opening repair modal...');
                const form = repairModal.querySelector('#repairForm');
                const title = repairModal.querySelector('#modalTitle');
                
                if (!form || !title) {
                    console.error('Required modal elements not found');
                    return;
                }

                // Set modal title
                title.textContent = repair ? 'Edit Repair' : 'Add New Repair';

                // Get user role from auth
                const userRole = auth.user?.role;

                // Get customers list if user is admin/technician
                let customers = [];
                if (userRole === 'admin' || userRole === 'technician') {
                    try {
                        console.log('Fetching customers list...', { userRole, token: auth.token ? 'present' : 'missing' });
                        const response = await fetch('/api/users/customers', {
                            headers: {
                                'Authorization': `Bearer ${auth.token}`
                            }
                        });
                        console.log('Customers response:', { 
                            status: response.status, 
                            ok: response.ok,
                            statusText: response.statusText
                        });
                        
                        if (response.ok) {
                            customers = await response.json();
                            console.log('Fetched customers:', customers);
                            if (customers.length === 0) {
                                console.log('No customers found in database');
                                UI.toast.show('No customers found in database. Please register a customer account first.', 'warning');
                            }
                        } else {
                            const errorData = await response.json();
                            console.error('Failed to fetch customers:', errorData);
                            UI.toast.show(errorData.details || errorData.error || 'Failed to load customers list', 'error');
                        }
                    } catch (error) {
                        console.error('Error fetching customers:', error);
                        UI.toast.show('Failed to load customers list', 'error');
                    }
                }

                // Populate form fields
                form.innerHTML = `
                    <div class="space-y-4">
                        ${(userRole === 'admin' || userRole === 'technician') && !repair ? `
                            <div class="form-group">
                                <label for="customerId" class="form-label">Customer (Optional)</label>
                                <select name="customerId" id="customerId" class="form-input">
                                    <option value="">No specific customer</option>
                                    ${customers && customers.length > 0 ? customers.map(customer => `
                                        <option value="${customer._id}">${customer.name} (${customer.phone || 'No phone'})</option>
                                    `).join('') : ''}
                                </select>
                                <p class="text-sm text-gray-500 mt-1">
                                    If no customer is selected, the repair will be associated with your account.
                                </p>
                            </div>
                        ` : ''}
                        <div class="form-group">
                            <label for="customerName" class="form-label">Customer Name</label>
                            <input type="text" name="customerName" id="customerName" class="form-input" 
                                value="${repair?.customerName || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="customerPhone" class="form-label">Phone Number</label>
                            <input type="tel" name="customerPhone" id="customerPhone" class="form-input" 
                                value="${repair?.customerPhone || ''}" required>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div class="form-group">
                                <label for="vehicleBrand" class="form-label">Vehicle Brand</label>
                                <input type="text" name="vehicleBrand" id="vehicleBrand" class="form-input" 
                                    value="${repair?.vehicleBrand || ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="vehicleModel" class="form-label">Vehicle Model</label>
                                <input type="text" name="vehicleModel" id="vehicleModel" class="form-input" 
                                    value="${repair?.vehicleModel || ''}" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="licensePlate" class="form-label">License Plate</label>
                            <input type="text" name="licensePlate" id="licensePlate" class="form-input" 
                                value="${repair?.licensePlate || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="repairDescription" class="form-label">Repair Description</label>
                            <textarea name="repairDescription" id="repairDescription" class="form-input" 
                                rows="3" required>${repair?.repairDescription || ''}</textarea>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div class="form-group">
                                <label for="estimatedCost" class="form-label">Estimated Cost</label>
                                <input type="number" name="estimatedCost" id="estimatedCost" class="form-input" 
                                    value="${repair?.estimatedCost || ''}" min="0" step="0.01" required>
                            </div>
                            <div class="form-group">
                                <label for="status" class="form-label">Status</label>
                                <select name="status" id="status" class="form-input" required>
                                    <option value="pending" ${repair?.status === 'pending' ? 'selected' : ''}>Pending</option>
                                    <option value="in-progress" ${repair?.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                                    <option value="completed" ${repair?.status === 'completed' ? 'selected' : ''}>Completed</option>
                                </select>
                            </div>
                        </div>
                        ${repair ? `
                            <div class="form-group">
                                <label for="actualCost" class="form-label">Actual Cost</label>
                                <input type="number" name="actualCost" id="actualCost" class="form-input" 
                                    value="${repair?.actualCost || ''}" min="0" step="0.01">
                            </div>
                        ` : ''}
                        <div class="form-group">
                            <label for="assignedTechnician" class="form-label">Assigned Technician</label>
                            <input type="text" name="assignedTechnician" id="assignedTechnician" class="form-input" 
                                value="${repair?.assignedTechnician || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Images</label>
                            <div id="imageUploadArea" class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                                <input type="file" id="repairImages" name="repairImages" multiple accept="image/*" class="hidden">
                                <label for="repairImages" class="cursor-pointer text-blue-600 hover:text-blue-800">
                                    Click to upload images
                                </label>
                                <p class="text-sm text-gray-500 mt-1">or drag and drop</p>
                            </div>
                            <div id="imagePreviewContainer" class="grid grid-cols-4 gap-4 mt-4"></div>
                        </div>
                    </div>
                    <div class="flex justify-end space-x-3 mt-6">
                        <button type="button" class="btn btn-secondary" onclick="UI.modals.repair.close()">Cancel</button>
                        <button type="submit" class="btn btn-primary">${repair ? 'Update' : 'Create'} Repair</button>
                    </div>
                `;

                // Setup image upload
                setupImageUpload();

                // Show modal
                repairModal.classList.remove('hidden');
                document.body.style.overflow = 'hidden';

                // Focus first input
                const firstInput = repairModal.querySelector('input, select, textarea');
                if (firstInput) firstInput.focus();

                // Handle form submission
                form.onsubmit = async (e) => {
                    e.preventDefault();
                    
                    const formData = new FormData(form);
                    const data = Object.fromEntries(formData.entries());
                    
                    // Convert numeric fields
                    data.estimatedCost = parseFloat(data.estimatedCost);
                    if (data.actualCost) {
                        data.actualCost = parseFloat(data.actualCost);
                    }
                    
                    try {
                        const url = repair ? `/api/repairs/${repair._id}` : '/api/repairs';
                        const method = repair ? 'PUT' : 'POST';
                        
                        const response = await fetch(url, {
                            method,
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${auth.token}`
                            },
                            body: JSON.stringify(data)
                        });

                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.details || errorData.error || 'Failed to save repair');
                        }

                        UI.toast.show(`Repair ${repair ? 'updated' : 'created'} successfully`, 'success');
                        UI.modals.repair.close();
                        loadRepairs();
                        loadStats();
                    } catch (error) {
                        console.error('Error saving repair:', error);
                        UI.toast.show(error.message || 'Failed to save repair', 'error');
                    }
                };
            },
            close: () => {
                console.log('Closing repair modal...');
                repairModal.classList.add('hidden');
                document.body.style.overflow = '';
                // Reset form if exists
                const form = repairModal.querySelector('form');
                if (form) {
                    form.reset();
                    // Clear image previews
                    const imagePreview = document.getElementById('imagePreviewContainer');
                    if (imagePreview) imagePreview.innerHTML = '';
                }
            }
        };

        // Add close button handler
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                UI.modals.repair.close();
            });
        }

        // Close on backdrop click
        repairModal.addEventListener('click', (e) => {
            if (e.target === repairModal) {
                UI.modals.repair.close();
            }
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !repairModal.classList.contains('hidden')) {
                UI.modals.repair.close();
            }
        });
    }

    // Lightbox Modal
    const lightbox = document.getElementById('imageLightbox');
    if (lightbox) {
        UI.modals.lightbox = {
            element: lightbox,
            open: (images, startIndex = 0) => {
                // Implementation for lightbox modal
            },
            close: () => {
                lightbox.classList.add('hidden');
                document.body.style.overflow = '';
            }
        };
    }

    console.log('Modals initialized');
}

// Form Handlers
function initializeFormHandlers() {
    console.log('Initializing form handlers...');
    
    // Add Repair Button
    const addRepairBtn = document.getElementById('addRepairBtn');
    if (addRepairBtn) {
        console.log('Found add repair button, adding click handler');
        addRepairBtn.addEventListener('click', () => {
            console.log('Add repair button clicked');
            if (UI.modals.repair) {
                UI.modals.repair.open();
            } else {
                console.error('Repair modal not initialized');
            }
        });
    } else {
        console.error('Add repair button not found');
    }

    // Logout Button
    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        auth.clearAuth();
        window.location.replace('/login.html');
    });

    // Search and Filter
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            loadRepairs();
        }, 300));
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            loadRepairs();
        });
    }
    
    console.log('Form handlers initialized');
}

// Image Upload Setup
function setupImageUpload() {
    const imageUploadArea = document.getElementById('imageUploadArea');
    const imageInput = document.getElementById('repairImages');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');

    if (!imageUploadArea || !imageInput || !imagePreviewContainer) return;

    imageUploadArea.addEventListener('click', () => imageInput.click());
    imageUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        imageUploadArea.classList.add('border-primary');
    });
    imageUploadArea.addEventListener('dragleave', () => {
        imageUploadArea.classList.remove('border-primary');
    });
    imageUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        imageUploadArea.classList.remove('border-primary');
        if (e.dataTransfer.files.length > 0) {
            imageInput.files = e.dataTransfer.files;
            handleImageUpload(e.dataTransfer.files);
        }
    });

    imageInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleImageUpload(e.target.files);
        }
    });
}

// Handle image upload
async function handleImageUpload(files) {
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    if (!imagePreviewContainer) return;

    for (const file of files) {
        if (!file.type.startsWith('image/')) continue;

        const reader = new FileReader();
        reader.onload = (e) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'image-preview-item';
            
            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = 'Repair image preview';
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-image';
            removeBtn.innerHTML = `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            `;
            removeBtn.onclick = () => wrapper.remove();
            
            wrapper.appendChild(img);
            wrapper.appendChild(removeBtn);
            imagePreviewContainer.appendChild(wrapper);
        };
        reader.readAsDataURL(file);
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

// Initialize toasts
function initializeToasts() {
    UI.toast.container = document.createElement('div');
    UI.toast.container.className = 'toast-container';
    document.body.appendChild(UI.toast.container);
}

// Setup event listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Navigation
    document.querySelectorAll('.sidebar nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const view = e.currentTarget.getAttribute('href').substring(1);
            if (view) {
                navigateTo(view);
            }
        });
    });

    // Image Upload
    const imageUpload = document.getElementById('imageUpload');
    const imageInput = document.getElementById('imageInput');
    
    if (imageUpload && imageInput) {
        imageUpload.addEventListener('click', () => imageInput.click());
        imageInput.addEventListener('change', handleImageUpload);
    }
    
    console.log('Event listeners set up');
}

// Navigation
function navigateTo(view) {
    UI.currentView = view;
    
    // Update active state in sidebar
    document.querySelectorAll('.sidebar nav a').forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${view}`);
    });

    // Update header title
    const headerTitle = document.querySelector('header h2');
    if (headerTitle) {
        headerTitle.textContent = view.charAt(0).toUpperCase() + view.slice(1);
    }

    // Close mobile sidebar
    if (window.innerWidth <= 768) {
        UI.sidebar.isMobileOpen = false;
        document.querySelector('.sidebar')?.classList.remove('open');
    }

    // Load view content
    loadViewContent(view);
}

// View Content Loading
function loadViewContent(view) {
    const contentArea = document.querySelector('.main-content > div');
    if (!contentArea) return;

    // Show loading state
    contentArea.innerHTML = `
        <div class="p-6">
            <div class="animate-pulse space-y-4">
                <div class="h-4 bg-gray-200 rounded w-1/4"></div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    ${Array(4).fill().map(() => `
                        <div class="card p-6">
                            <div class="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                            <div class="h-8 bg-gray-200 rounded w-3/4"></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    // Load actual content based on view
    switch (view) {
        case 'dashboard':
            // Dashboard content is loaded by default
            break;
        case 'vehicles':
            // TODO: Load vehicles view
            break;
        case 'repairs':
            // TODO: Load repairs view
            break;
        case 'customers':
            // TODO: Load customers view
            break;
        case 'reports':
            // TODO: Load reports view
            break;
        case 'settings':
            // TODO: Load settings view
            break;
    }
}

// Export UI functions
window.UI = UI; 