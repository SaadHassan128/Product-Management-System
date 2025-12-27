// ===================================
// PRODUCT MANAGEMENT SYSTEM - SCRIPT
// Modern Professional JavaScript
// ===================================

// ========== UTILITY FUNCTIONS ==========

/**
 * Sanitize HTML to prevent XSS attacks
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, delay = 300) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Announce to screen readers
 * @param {string} message - Message to announce
 */
function announceToScreenReader(message) {
    const announcement = document.getElementById('ariaAnnouncements');
    if (announcement) {
        announcement.textContent = message;
        setTimeout(() => {
            announcement.textContent = '';
        }, 1000);
    }
}

/**
 * Animate number counter
 * @param {HTMLElement} element - Element to animate
 * @param {number} end - End value
 * @param {number} duration - Animation duration in ms
 */
function animateCounter(element, end, duration = 1000) {
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const value = Math.floor(progress * (end - start) + start);
        element.textContent = element.id === 'avgPrice' || element.id === 'totalValue'
            ? `$${value.toFixed(2)}`
            : value;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// ========== TOAST NOTIFICATION SYSTEM ==========

class ToastNotification {
    constructor() {
        this.container = document.getElementById('toastContainer');
    }

    show(title, message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icon = this.getIcon(type);

        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${icon}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${sanitizeHTML(title)}</div>
                <div class="toast-message">${sanitizeHTML(message)}</div>
            </div>
            <button class="toast-close" aria-label="Close notification">
                <i class="fas fa-times"></i>
            </button>
        `;

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.remove(toast));

        this.container.appendChild(toast);

        // Auto dismiss after 5 seconds
        setTimeout(() => this.remove(toast), 5000);

        // Announce to screen readers
        announceToScreenReader(`${type}: ${title}. ${message}`);
    }

    getIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    remove(toast) {
        toast.style.animation = 'slideInRight 0.3s ease-in-out reverse';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }
}

const toast = new ToastNotification();

// ========== CONFIRMATION MODAL ==========

class ConfirmModal {
    constructor() {
        this.modal = document.getElementById('confirmModal');
        this.titleEl = document.getElementById('confirm-title');
        this.messageEl = document.getElementById('confirm-message');
        this.yesBtn = document.getElementById('confirmYes');
        this.noBtn = document.getElementById('confirmNo');
        this.onConfirmCallback = null;

        this.noBtn.addEventListener('click', () => this.hide());

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display === 'flex') {
                this.hide();
            }
        });

        // Close on background click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });
    }

    show(title, message, onConfirm) {
        this.titleEl.textContent = title;
        this.messageEl.textContent = message;
        this.onConfirmCallback = onConfirm;

        // Remove old listener and add new one
        const newYesBtn = this.yesBtn.cloneNode(true);
        this.yesBtn.parentNode.replaceChild(newYesBtn, this.yesBtn);
        this.yesBtn = newYesBtn;

        this.yesBtn.addEventListener('click', () => {
            if (this.onConfirmCallback) {
                this.onConfirmCallback();
            }
            this.hide();
        });

        this.modal.style.display = 'flex';
        this.yesBtn.focus();

        // Trap focus
        this.trapFocus();
    }

    hide() {
        this.modal.style.display = 'none';
    }

    trapFocus() {
        const focusableElements = this.modal.querySelectorAll('button');
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        this.modal.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey && document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                } else if (!e.shiftKey && document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        });
    }
}

const confirmModal = new ConfirmModal();

// ========== PRODUCT MANAGER ==========

class ProductManager {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.sortBy = null;
        this.sortOrder = 'asc';
        this.selectedProducts = new Set();

        this.init();
    }

    init() {
        this.loadProducts();
        this.setupEventListeners();
        this.renderTable();
        this.updateStatistics();
        this.hideSkeleton();
        this.hideLoading();
    }

    // ========== DATA MANAGEMENT ==========

    loadProducts() {
        const stored = localStorage.getItem('products');
        if (stored) {
            try {
                this.products = JSON.parse(stored);
                this.filteredProducts = [...this.products];
            } catch (e) {
                console.error('Error loading products:', e);
                this.products = [];
                this.filteredProducts = [];
            }
        }
    }

    saveProducts() {
        localStorage.setItem('products', JSON.stringify(this.products));
    }

    addProduct(product) {
        this.products.push(product);
        this.saveProducts();
        this.filteredProducts = [...this.products];
        this.currentPage = 1;
        this.renderTable();
        this.updateStatistics();
        toast.show('Success', 'Product added successfully!', 'success');
        announceToScreenReader('Product added successfully');
    }

    updateProduct(index, product) {
        this.products[index] = product;
        this.saveProducts();
        this.filteredProducts = [...this.products];
        this.renderTable();
        this.updateStatistics();
        toast.show('Success', 'Product updated successfully!', 'success');
        announceToScreenReader('Product updated successfully');
    }

    deleteProduct(index) {
        const product = this.products[index];
        confirmModal.show(
            'Delete Product',
            `Are you sure you want to delete "${product.name}"?`,
            () => {
                this.products.splice(index, 1);
                this.saveProducts();
                this.filteredProducts = [...this.products];
                this.renderTable();
                this.updateStatistics();
                toast.show('Success', 'Product deleted successfully!', 'success');
                announceToScreenReader('Product deleted');
            }
        );
    }

    clearAllProducts() {
        confirmModal.show(
            'Clear All Products',
            'Are you sure you want to delete all products? This action cannot be undone.',
            () => {
                this.products = [];
                this.filteredProducts = [];
                this.saveProducts();
                this.selectedProducts.clear();
                this.renderTable();
                this.updateStatistics();
                toast.show('Success', 'All products cleared!', 'success');
                announceToScreenReader('All products cleared');
            }
        );
    }

    // ========== SEARCH & FILTER ==========

    searchProducts(query) {
        const lowerQuery = query.toLowerCase().trim();

        if (!lowerQuery) {
            this.filteredProducts = [...this.products];
        } else {
            this.filteredProducts = this.products.filter(product =>
                product.name.toLowerCase().includes(lowerQuery)
            );
        }

        this.currentPage = 1;
        this.renderTable();
        announceToScreenReader(`Found ${this.filteredProducts.length} products`);
    }

    // ========== SORTING ==========

    sortProducts(field) {
        if (this.sortBy === field) {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortBy = field;
            this.sortOrder = 'asc';
        }

        this.filteredProducts.sort((a, b) => {
            let aVal = a[field];
            let bVal = b[field];

            if (field === 'price') {
                aVal = parseFloat(aVal);
                bVal = parseFloat(bVal);
            } else if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (aVal < bVal) return this.sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        this.renderTable();
        this.updateSortIcons();
        announceToScreenReader(`Sorted by ${field} ${this.sortOrder}ending`);
    }

    updateSortIcons() {
        document.querySelectorAll('.sortable i').forEach(icon => {
            icon.className = 'fas fa-sort';
        });

        if (this.sortBy) {
            const activeHeader = document.querySelector(`[data-sort="${this.sortBy}"]`);
            if (activeHeader) {
                const icon = activeHeader.querySelector('i');
                icon.className = this.sortOrder === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
            }
        }
    }

    // ========== PAGINATION ==========

    changePage(page) {
        const totalPages = Math.ceil(this.filteredProducts.length / this.itemsPerPage);
        if (page < 1 || page > totalPages) return;

        this.currentPage = page;
        this.renderTable();
        announceToScreenReader(`Page ${page} of ${totalPages}`);
    }

    changeItemsPerPage(items) {
        this.itemsPerPage = parseInt(items);
        this.currentPage = 1;
        this.renderTable();
    }

    renderPagination() {
        const totalPages = Math.ceil(this.filteredProducts.length / this.itemsPerPage);
        const pageNumbers = document.getElementById('pageNumbers');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');

        pageNumbers.innerHTML = '';

        // Disable/enable prev/next buttons
        prevBtn.disabled = this.currentPage === 1;
        nextBtn.disabled = this.currentPage === totalPages || totalPages === 0;

        // Show page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('div');
            pageBtn.className = `page-number ${i === this.currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.setAttribute('role', 'button');
            pageBtn.setAttribute('tabindex', '0');
            pageBtn.setAttribute('aria-label', `Go to page ${i}`);
            pageBtn.setAttribute('aria-current', i === this.currentPage ? 'page' : 'false');

            pageBtn.addEventListener('click', () => this.changePage(i));
            pageBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.changePage(i);
                }
            });

            pageNumbers.appendChild(pageBtn);
        }
    }

    // ========== BULK ACTIONS ==========

    toggleSelectAll(checked) {
        this.selectedProducts.clear();

        if (checked) {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            const pageProducts = this.filteredProducts.slice(start, end);

            pageProducts.forEach((_, index) => {
                const globalIndex = this.products.indexOf(pageProducts[index]);
                this.selectedProducts.add(globalIndex);
            });
        }

        this.updateBulkActionUI();
        this.renderTable();
    }

    toggleProductSelection(globalIndex, checked) {
        if (checked) {
            this.selectedProducts.add(globalIndex);
        } else {
            this.selectedProducts.delete(globalIndex);
        }

        this.updateBulkActionUI();
    }

    updateBulkActionUI() {
        const deleteBtn = document.getElementById('deleteSelectedButton');
        const countSpan = document.getElementById('selectedCount');
        const selectAllCheckbox = document.getElementById('selectAll');

        countSpan.textContent = this.selectedProducts.size;
        deleteBtn.disabled = this.selectedProducts.size === 0;

        // Update select all checkbox
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const pageProducts = this.filteredProducts.slice(start, end);

        const allPageSelected = pageProducts.length > 0 && pageProducts.every((product) => {
            const globalIndex = this.products.indexOf(product);
            return this.selectedProducts.has(globalIndex);
        });

        selectAllCheckbox.checked = allPageSelected;
    }

    deleteSelectedProducts() {
        const count = this.selectedProducts.size;

        confirmModal.show(
            'Delete Selected Products',
            `Are you sure you want to delete ${count} product${count > 1 ? 's' : ''}?`,
            () => {
                const indicesToDelete = Array.from(this.selectedProducts).sort((a, b) => b - a);
                indicesToDelete.forEach(index => {
                    this.products.splice(index, 1);
                });

                this.selectedProducts.clear();
                this.saveProducts();
                this.filteredProducts = [...this.products];
                this.currentPage = 1;
                this.renderTable();
                this.updateStatistics();
                this.updateBulkActionUI();
                toast.show('Success', `${count} product${count > 1 ? 's' : ''} deleted!`, 'success');
                announceToScreenReader(`${count} products deleted`);
            }
        );
    }

    // ========== STATISTICS ==========

    updateStatistics() {
        const total = this.products.length;
        const avgPrice = total > 0
            ? this.products.reduce((sum, p) => sum + parseFloat(p.price), 0) / total
            : 0;
        const categories = new Set(this.products.map(p => p.category)).size;
        const totalValue = this.products.reduce((sum, p) => sum + parseFloat(p.price), 0);

        animateCounter(document.getElementById('totalProducts'), total);
        animateCounter(document.getElementById('avgPrice'), avgPrice);
        animateCounter(document.getElementById('totalCategories'), categories);
        animateCounter(document.getElementById('totalValue'), totalValue);
    }

    // ========== EXPORT ==========

    exportToCSV() {
        if (this.products.length === 0) {
            toast.show('Info', 'No products to export', 'info');
            return;
        }

        const headers = ['Name', 'Price', 'Category', 'Description'];
        const rows = this.products.map(p => [
            `"${p.name.replace(/"/g, '""')}"`,
            p.price,
            `"${p.category.replace(/"/g, '""')}"`,
            `"${p.description.replace(/"/g, '""')}"`
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        this.downloadFile(csv, 'products.csv', 'text/csv');
        toast.show('Success', 'CSV exported successfully!', 'success');
        announceToScreenReader('CSV file downloaded');
    }

    exportToJSON() {
        if (this.products.length === 0) {
            toast.show('Info', 'No products to export', 'info');
            return;
        }

        const json = JSON.stringify(this.products, null, 2);
        this.downloadFile(json, 'products.json', 'application/json');
        toast.show('Success', 'JSON exported successfully!', 'success');
        announceToScreenReader('JSON file downloaded');
    }

    downloadFile(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ========== RENDERING ==========

    renderTable() {
        const tbody = document.getElementById('productsTableBody');
        const emptyState = document.getElementById('emptyState');
        const tableWrapper = document.querySelector('.table-wrapper');
        const pagination = document.getElementById('pagination');

        if (this.filteredProducts.length === 0) {
            emptyState.style.display = 'block';
            tableWrapper.style.display = 'none';
            pagination.style.display = 'none';
            return;
        }

        emptyState.style.display = 'none';
        tableWrapper.style.display = 'block';
        pagination.style.display = 'flex';

        // Pagination logic
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const pageProducts = this.filteredProducts.slice(start, end);

        tbody.innerHTML = '';

        pageProducts.forEach((product, index) => {
            const globalIndex = this.products.indexOf(product);
            const isSelected = this.selectedProducts.has(globalIndex);

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <input
                        type="checkbox"
                        class="product-checkbox"
                        data-index="${globalIndex}"
                        ${isSelected ? 'checked' : ''}
                        aria-label="Select ${sanitizeHTML(product.name)}">
                </td>
                <td>${start + index + 1}</td>
                <td>${sanitizeHTML(product.name)}</td>
                <td>$${parseFloat(product.price).toFixed(2)}</td>
                <td>${sanitizeHTML(product.category)}</td>
                <td>${sanitizeHTML(product.description)}</td>
                <td>
                    <button class="update-btn" data-index="${globalIndex}" aria-label="Update ${sanitizeHTML(product.name)}">
                        <i class="fas fa-edit"></i> Update
                    </button>
                    <button class="delete-btn" data-index="${globalIndex}" aria-label="Delete ${sanitizeHTML(product.name)}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            `;

            // Add checkbox listener
            const checkbox = row.querySelector('.product-checkbox');
            checkbox.addEventListener('change', (e) => {
                this.toggleProductSelection(globalIndex, e.target.checked);
            });

            // Add update button listener
            const updateBtn = row.querySelector('.update-btn');
            updateBtn.addEventListener('click', () => this.showUpdateModal(globalIndex));

            // Add delete button listener
            const deleteBtn = row.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => this.deleteProduct(globalIndex));

            tbody.appendChild(row);
        });

        this.renderPagination();
        this.updateBulkActionUI();
    }

    showUpdateModal(index) {
        const product = this.products[index];
        const modal = document.getElementById('updateSection');

        document.getElementById('updateIndex').value = index;
        document.getElementById('updateName').value = product.name;
        document.getElementById('updatePrice').value = product.price;
        document.getElementById('updateCategory').value = product.category;
        document.getElementById('updateDescription').value = product.description;

        modal.style.display = 'flex';
        document.getElementById('updateName').focus();
        announceToScreenReader('Update form opened');
    }

    hideUpdateModal() {
        document.getElementById('updateSection').style.display = 'none';
        announceToScreenReader('Update form closed');
    }

    hideSkeleton() {
        const skeleton = document.querySelector('.skeleton-row');
        if (skeleton) {
            skeleton.style.display = 'none';
        }
    }

    // ========== LOADING ==========

    showLoading() {
        document.getElementById('loadingOverlay').classList.add('active');
    }

    hideLoading() {
        setTimeout(() => {
            document.getElementById('loadingOverlay').classList.remove('active');
        }, 500);
    }

    // ========== EVENT LISTENERS ==========

    setupEventListeners() {
        // Add Product Form
        document.getElementById('addProductForm').addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('productName').value.trim();
            const price = parseFloat(document.getElementById('productPrice').value);
            const category = document.getElementById('productCategory').value.trim();
            const description = document.getElementById('productDescription').value.trim();

            if (!this.validateForm('add', name, price, category, description)) {
                return;
            }

            this.addProduct({ name, price, category, description });
            e.target.reset();
            this.clearFormErrors('add');
        });

        // Update Product Form
        document.getElementById('updateProductForm').addEventListener('submit', (e) => {
            e.preventDefault();

            const index = document.getElementById('updateIndex').value;
            const name = document.getElementById('updateName').value.trim();
            const price = parseFloat(document.getElementById('updatePrice').value);
            const category = document.getElementById('updateCategory').value.trim();
            const description = document.getElementById('updateDescription').value.trim();

            if (!this.validateForm('update', name, price, category, description)) {
                return;
            }

            this.updateProduct(index, { name, price, category, description });
            this.hideUpdateModal();
            this.clearFormErrors('update');
        });

        // Cancel Update
        document.getElementById('cancelUpdate').addEventListener('click', () => {
            this.hideUpdateModal();
            this.clearFormErrors('update');
        });

        // Modal Close Button
        document.getElementById('modalClose').addEventListener('click', () => {
            this.hideUpdateModal();
            this.clearFormErrors('update');
        });

        // Close modal on background click
        document.getElementById('updateSection').addEventListener('click', (e) => {
            if (e.target.id === 'updateSection') {
                this.hideUpdateModal();
                this.clearFormErrors('update');
            }
        });

        // Search
        const searchInput = document.getElementById('searchInput');
        const debouncedSearch = debounce((query) => this.searchProducts(query), 300);

        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });

        // Clear Search
        document.getElementById('clearSearchButton').addEventListener('click', () => {
            searchInput.value = '';
            this.searchProducts('');
        });

        // Sorting
        document.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', () => {
                this.sortProducts(header.dataset.sort);
            });
        });

        // Items Per Page
        document.getElementById('itemsPerPage').addEventListener('change', (e) => {
            this.changeItemsPerPage(e.target.value);
        });

        // Pagination
        document.getElementById('prevPage').addEventListener('click', () => {
            this.changePage(this.currentPage - 1);
        });

        document.getElementById('nextPage').addEventListener('click', () => {
            this.changePage(this.currentPage + 1);
        });

        // Bulk Actions
        document.getElementById('selectAll').addEventListener('change', (e) => {
            this.toggleSelectAll(e.target.checked);
        });

        document.getElementById('deleteSelectedButton').addEventListener('click', () => {
            this.deleteSelectedProducts();
        });

        // Export
        document.getElementById('exportCSV').addEventListener('click', () => {
            this.exportToCSV();
        });

        document.getElementById('exportJSON').addEventListener('click', () => {
            this.exportToJSON();
        });

        // Clear All
        document.getElementById('clearAllButton').addEventListener('click', () => {
            this.clearAllProducts();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Escape to close modal
            if (e.key === 'Escape') {
                const updateModal = document.getElementById('updateSection');
                if (updateModal.style.display === 'flex') {
                    this.hideUpdateModal();
                    this.clearFormErrors('update');
                }
            }
        });
    }

    // ========== FORM VALIDATION ==========

    validateForm(formType, name, price, category, description) {
        let isValid = true;
        const prefix = formType === 'update' ? 'update' : 'product';

        // Clear previous errors
        this.clearFormErrors(formType);

        // Validate name
        if (!name || name.length < 2) {
            this.showFieldError(`${prefix}Name`, 'Name must be at least 2 characters');
            isValid = false;
        }

        // Validate price
        if (isNaN(price) || price <= 0) {
            this.showFieldError(`${prefix}Price`, 'Price must be greater than 0');
            isValid = false;
        }

        // Validate category
        if (!category || category.length < 2) {
            this.showFieldError(`${prefix}Category`, 'Category must be at least 2 characters');
            isValid = false;
        }

        // Validate description
        if (!description || description.length < 5) {
            this.showFieldError(`${prefix}Description`, 'Description must be at least 5 characters');
            isValid = false;
        }

        return isValid;
    }

    showFieldError(fieldId, message) {
        const errorEl = document.getElementById(`${fieldId}-error`);
        if (errorEl) {
            errorEl.textContent = message;
        }
    }

    clearFormErrors(formType) {
        const prefix = formType === 'update' ? 'update' : 'product';
        const fields = ['Name', 'Price', 'Category', 'Description'];

        fields.forEach(field => {
            const errorEl = document.getElementById(`${prefix}${field}-error`);
            if (errorEl) {
                errorEl.textContent = '';
            }
        });
    }
}

// ========== DARK MODE ==========

class DarkModeManager {
    constructor() {
        this.darkModeToggle = document.getElementById('darkModeToggle');
        this.init();
    }

    init() {
        // Load saved theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);

        // Toggle listener
        this.darkModeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            this.setTheme(newTheme);
            toast.show('Theme Changed', `${newTheme} mode activated`, 'info');
        });
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);

        const icon = this.darkModeToggle.querySelector('i');
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// ========== SCROLL FEATURES ==========

class ScrollManager {
    constructor() {
        this.navbar = document.querySelector('.navbar');
        this.backToTop = document.getElementById('backToTop');
        this.scrollProgress = document.querySelector('.scroll-progress');
        this.lastScroll = 0;

        this.init();
    }

    init() {
        // Scroll progress
        window.addEventListener('scroll', () => {
            this.updateScrollProgress();
            this.toggleBackToTop();
            this.toggleNavbar();
        });

        // Back to top
        this.backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            announceToScreenReader('Scrolled to top');
        });

        // Smooth scroll for nav links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });

        // Intersection Observer for scroll animations
        this.observeElements();
    }

    updateScrollProgress() {
        const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (window.scrollY / windowHeight) * 100;
        this.scrollProgress.style.width = `${scrolled}%`;
        this.scrollProgress.setAttribute('aria-valuenow', Math.round(scrolled));
    }

    toggleBackToTop() {
        if (window.scrollY > 300) {
            this.backToTop.classList.add('visible');
        } else {
            this.backToTop.classList.remove('visible');
        }
    }

    toggleNavbar() {
        const currentScroll = window.scrollY;

        if (currentScroll > this.lastScroll && currentScroll > 100) {
            this.navbar.classList.add('hidden');
        } else {
            this.navbar.classList.remove('hidden');
        }

        this.lastScroll = currentScroll;
    }

    observeElements() {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                    }
                });
            },
            { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
        );

        document.querySelectorAll('.animate-on-scroll').forEach(el => {
            observer.observe(el);
        });
    }
}

// ========== HAMBURGER MENU ==========

class MobileMenu {
    constructor() {
        this.hamburger = document.getElementById('hamburger');
        this.navMenu = document.getElementById('navMenu');
        this.init();
    }

    init() {
        this.hamburger.addEventListener('click', () => {
            this.hamburger.classList.toggle('active');
            this.navMenu.classList.toggle('active');

            const isExpanded = this.hamburger.classList.contains('active');
            this.hamburger.setAttribute('aria-expanded', isExpanded);
            announceToScreenReader(isExpanded ? 'Menu opened' : 'Menu closed');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.hamburger.contains(e.target) && !this.navMenu.contains(e.target)) {
                this.hamburger.classList.remove('active');
                this.navMenu.classList.remove('active');
                this.hamburger.setAttribute('aria-expanded', 'false');
            }
        });

        // Close menu when clicking a link
        this.navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                this.hamburger.classList.remove('active');
                this.navMenu.classList.remove('active');
                this.hamburger.setAttribute('aria-expanded', 'false');
            });
        });
    }
}

// ========== SERVICE WORKER REGISTRATION ==========

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((registration) => {
                console.log('ServiceWorker registered:', registration.scope);
            })
            .catch((error) => {
                console.log('ServiceWorker registration failed:', error);
            });
    });
}

// ========== INITIALIZATION ==========

document.addEventListener('DOMContentLoaded', () => {
    // Initialize all managers
    const productManager = new ProductManager();
    const darkModeManager = new DarkModeManager();
    const scrollManager = new ScrollManager();
    const mobileMenu = new MobileMenu();

    // Welcome message
    console.log('%c🚀 Product Management System v2.0', 'color: #667eea; font-size: 20px; font-weight: bold;');
    console.log('%cProfessional Edition with Dark Mode, Export, Pagination & More!', 'color: #764ba2; font-size: 14px;');
});
