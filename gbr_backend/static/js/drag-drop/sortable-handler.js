// Sortable Handler for Drag and Drop functionality
// GBR Project - Comprehensive Drag & Drop Management with Mobile & Accessibility Support

/**
 * GBRDragDrop - ES6 Class for handling drag and drop functionality
 * Integrates with Django backend, SortableJS, and Bootstrap 5
 * Enhanced with mobile touch support and accessibility features
 * Includes comprehensive error handling and validation
 */
class GBRDragDrop {
    constructor(options = {}) {
        this.options = {
            csrfToken: window.csrfToken || this.getCSRFToken(),
            apiEndpoint: '/api/update-order/',
            notificationContainer: '#notification-container',
            defaultAnimation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            // Mobile-specific options
            touchStartThreshold: 0,
            forceFallback: this.isTouchDevice(),
            fallbackTolerance: 5,
            delayOnTouchStart: true,
            delay: this.isTouchDevice() ? 200 : 0,
            // Accessibility options
            enableKeyboardNavigation: true,
            announceReorders: true,
            // Error handling options
            maxRetries: 3,
            retryDelay: 1000,
            networkTimeout: 10000,
            enableOfflineMode: true,
            enableAnalytics: true,
            ...options
        };
        
        // Store active sortable instances
        this.sortableInstances = new Map();
        
        // Accessibility and mobile state tracking
        this.keyboardSelectedItem = null;
        this.isMobile = this.isTouchDevice();
        this.screenReader = null;
        
        // Error handling and performance tracking
        this.networkStatus = this.initNetworkMonitoring();
        this.operationQueue = [];
        this.retryAttempts = new Map();
        this.performanceMetrics = {
            operations: 0,
            successes: 0,
            failures: 0,
            averageResponseTime: 0,
            errorsByType: {}
        };
        
        // Loading state management
        this.loadingOperations = new Set();
        this.errorStates = new Map();
        
        // Initialize components
        this.initNotificationContainer();
        this.initAccessibilityFeatures();
        this.initMobileFeatures();
        this.initErrorHandling();
        this.initPerformanceMonitoring();
        
        console.log('GBRDragDrop initialized with comprehensive error handling:', this.options);
    }

    /**
     * Detect if device is touch-enabled
     * @returns {boolean} True if touch device
     */
    isTouchDevice() {
        return (('ontouchstart' in window) ||
                (navigator.maxTouchPoints > 0) ||
                (navigator.msMaxTouchPoints > 0));
    }

    /**
     * Initialize accessibility features
     */
    initAccessibilityFeatures() {
        if (!this.options.enableKeyboardNavigation) return;
        
        // Create screen reader announcement area
        this.createScreenReaderArea();
        
        // Add keyboard event listeners
        document.addEventListener('keydown', this.handleKeyboardNavigation.bind(this));
        
        // Create keyboard help tooltip
        this.createKeyboardHelp();
    }

    /**
     * Initialize mobile-specific features
     */
    initMobileFeatures() {
        if (!this.isMobile) return;
        
        // Create mobile drag indicator
        this.createMobileDragIndicator();
        
        // Add touch event optimizations
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    }

    /**
     * Create screen reader announcement area
     */
    createScreenReaderArea() {
        if (document.getElementById('screen-reader-announcements')) return;
        
        const srArea = document.createElement('div');
        srArea.id = 'screen-reader-announcements';
        srArea.setAttribute('aria-live', 'polite');
        srArea.setAttribute('aria-atomic', 'true');
        srArea.className = 'sr-only';
        document.body.appendChild(srArea);
        
        this.screenReader = srArea;
    }

    /**
     * Create mobile drag indicator
     */
    createMobileDragIndicator() {
        if (document.querySelector('.mobile-drag-indicator')) return;
        
        const indicator = document.createElement('div');
        indicator.className = 'mobile-drag-indicator';
        indicator.innerHTML = '📱 Drag active - Move to reorder';
        document.body.appendChild(indicator);
    }

    /**
     * Create keyboard help tooltip
     */
    createKeyboardHelp() {
        if (document.querySelector('.keyboard-help')) return;
        
        const help = document.createElement('div');
        help.className = 'keyboard-help';
        help.innerHTML = `
            <strong>Keyboard Navigation:</strong><br>
            <kbd>Tab</kbd> Select item<br>
            <kbd>Space</kbd> Pick up/drop<br>
            <kbd>↑↓</kbd> Move item<br>
            <kbd>Esc</kbd> Cancel drag
        `;
        document.body.appendChild(help);
        
        // Show help on focus
        document.addEventListener('focusin', (e) => {
            if (e.target.closest('.draggable-item')) {
                help.classList.add('show');
            }
        });
        
        document.addEventListener('focusout', (e) => {
            if (!e.relatedTarget?.closest('.draggable-item')) {
                help.classList.remove('show');
            }
        });
    }

    /**
     * Handle keyboard navigation
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyboardNavigation(e) {
        const focusedItem = document.activeElement.closest('.draggable-item');
        if (!focusedItem) return;
        
        const container = focusedItem.closest('.sortable-list');
        const items = Array.from(container.querySelectorAll('.draggable-item'));
        const currentIndex = items.indexOf(focusedItem);
        
        switch (e.key) {
            case ' ':
            case 'Enter':
                e.preventDefault();
                this.toggleKeyboardSelection(focusedItem);
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (this.keyboardSelectedItem === focusedItem && currentIndex > 0) {
                    this.moveKeyboardItem(focusedItem, items[currentIndex - 1]);
                } else if (currentIndex > 0) {
                    items[currentIndex - 1].focus();
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (this.keyboardSelectedItem === focusedItem && currentIndex < items.length - 1) {
                    this.moveKeyboardItem(focusedItem, items[currentIndex + 1]);
                } else if (currentIndex < items.length - 1) {
                    items[currentIndex + 1].focus();
                }
                break;
            case 'Escape':
                e.preventDefault();
                this.cancelKeyboardSelection();
                break;
        }
    }

    /**
     * Toggle keyboard selection of an item
     * @param {HTMLElement} item - Item to select/deselect
     */
    toggleKeyboardSelection(item) {
        if (this.keyboardSelectedItem === item) {
            this.keyboardSelectedItem = null;
            item.classList.remove('keyboard-selected');
            this.announceToScreenReader('Item dropped');
        } else {
            if (this.keyboardSelectedItem) {
                this.keyboardSelectedItem.classList.remove('keyboard-selected');
            }
            this.keyboardSelectedItem = item;
            item.classList.add('keyboard-selected');
            this.announceToScreenReader('Item picked up. Use arrow keys to move, space to drop, escape to cancel');
        }
    }

    /**
     * Move keyboard-selected item
     * @param {HTMLElement} item - Item to move
     * @param {HTMLElement} target - Target position
     */
    moveKeyboardItem(item, target) {
        const container = item.closest('.sortable-list');
        const items = Array.from(container.querySelectorAll('.draggable-item'));
        const itemIndex = items.indexOf(item);
        const targetIndex = items.indexOf(target);
        
        if (targetIndex > itemIndex) {
            target.after(item);
        } else {
            target.before(item);
        }
        
        // Update order on server
        this.updateOrderFromKeyboard(container);
        this.announceToScreenReader(`Item moved to position ${targetIndex + 1}`);
        
        // Keep focus on the moved item
        item.focus();
    }

    /**
     * Cancel keyboard selection
     */
    cancelKeyboardSelection() {
        if (this.keyboardSelectedItem) {
            this.keyboardSelectedItem.classList.remove('keyboard-selected');
            this.keyboardSelectedItem = null;
            this.announceToScreenReader('Drag cancelled');
        }
    }

    /**
     * Update item order after keyboard reordering
     * @param {HTMLElement} container - Container element
     */
    updateOrderFromKeyboard(container) {
        const modelType = container.dataset.modelType;
        const items = Array.from(container.querySelectorAll('.draggable-item'));
        const orderData = items.map((item, index) => ({
            id: parseInt(item.dataset.id),
            sort_order: index + 1
        }));
        
        this.updateOrder(modelType, orderData, 'Keyboard reorder');
    }

    /**
     * Handle touch start for mobile optimization
     * @param {TouchEvent} e - Touch event
     */
    handleTouchStart(e) {
        const draggableItem = e.target.closest('.draggable-item');
        if (!draggableItem) return;
        
        // Add touch feedback
        draggableItem.classList.add('touch-active');
        
        // Show mobile drag indicator after delay
        setTimeout(() => {
            if (draggableItem.classList.contains('touch-active')) {
                const indicator = document.querySelector('.mobile-drag-indicator');
                if (indicator) indicator.classList.add('show');
            }
        }, 100);
    }

    /**
     * Initialize error handling system
     */
    initErrorHandling() {
        // Initialize offline detection
        this.setupOfflineDetection();
        
        // Initialize operation queue for offline mode
        this.initOperationQueue();
        
        // Setup global error handlers
        this.setupGlobalErrorHandlers();
        
        // Initialize loading indicators
        this.createLoadingIndicators();
        
        console.log('Error handling system initialized');
    }

    /**
     * Initialize performance monitoring
     */
    initPerformanceMonitoring() {
        if (!this.options.enableAnalytics) return;
        
        // Start performance monitoring
        this.startPerformanceMonitoring();
        
        // Log initial metrics
        this.logPerformanceMetrics();
        
        console.log('Performance monitoring initialized');
    }

    /**
     * Initialize network monitoring
     */
    initNetworkMonitoring() {
        const status = {
            online: navigator.onLine,
            effectiveType: null,
            downlink: null,
            rtt: null
        };

        // Monitor network status changes
        window.addEventListener('online', () => {
            status.online = true;
            this.handleNetworkChange(true);
        });

        window.addEventListener('offline', () => {
            status.online = false;
            this.handleNetworkChange(false);
        });

        // Monitor connection quality if available
        if ('connection' in navigator) {
            const connection = navigator.connection;
            status.effectiveType = connection.effectiveType;
            status.downlink = connection.downlink;
            status.rtt = connection.rtt;

            connection.addEventListener('change', () => {
                status.effectiveType = connection.effectiveType;
                status.downlink = connection.downlink;
                status.rtt = connection.rtt;
                this.handleConnectionQualityChange(status);
            });
        }

        return status;
    }

    /**
     * Setup offline detection and handling
     */
    setupOfflineDetection() {
        if (!this.options.enableOfflineMode) return;

        // Create offline indicator
        this.createOfflineIndicator();
        
        // Handle initial offline state
        if (!navigator.onLine) {
            this.handleNetworkChange(false);
        }
    }

    /**
     * Initialize operation queue for offline operations
     */
    initOperationQueue() {
        // Load queued operations from localStorage
        const savedQueue = localStorage.getItem('gbr-dragdrop-queue');
        if (savedQueue) {
            try {
                this.operationQueue = JSON.parse(savedQueue);
                console.log(`Loaded ${this.operationQueue.length} queued operations from storage`);
            } catch (e) {
                console.warn('Failed to load operation queue from storage:', e);
                this.operationQueue = [];
            }
        }
    }

    /**
     * Setup global error handlers
     */
    setupGlobalErrorHandlers() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection in drag-drop system:', event.reason);
            this.logError('unhandled_promise', event.reason);
        });

        // Handle JavaScript errors
        window.addEventListener('error', (event) => {
            if (event.filename && event.filename.includes('sortable-handler')) {
                console.error('JavaScript error in drag-drop system:', event.error);
                this.logError('javascript_error', event.error);
            }
        });
    }

    /**
     * Create loading indicators
     */
    createLoadingIndicators() {
        // Create global loading overlay
        if (!document.getElementById('dragdrop-loading-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'dragdrop-loading-overlay';
            overlay.className = 'dragdrop-loading-overlay';
            overlay.innerHTML = `
                <div class="loading-content">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Saving changes...</span>
                    </div>
                    <div class="loading-text">Saving your changes...</div>
                </div>
            `;
            document.body.appendChild(overlay);
        }

        // Create container-specific loading indicators
        this.createContainerLoadingIndicators();
    }

    /**
     * Create container-specific loading indicators
     */
    createContainerLoadingIndicators() {
        const containers = document.querySelectorAll('.sortable-list');
        containers.forEach(container => {
            if (!container.querySelector('.container-loading-indicator')) {
                const indicator = document.createElement('div');
                indicator.className = 'container-loading-indicator';
                indicator.innerHTML = `
                    <div class="d-flex align-items-center justify-content-center p-3">
                        <div class="spinner-border spinner-border-sm me-2" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <small class="text-muted">Updating order...</small>
                    </div>
                `;
                container.appendChild(indicator);
            }
        });
    }

    /**
     * Create offline indicator
     */
    createOfflineIndicator() {
        if (document.getElementById('offline-indicator')) return;

        const indicator = document.createElement('div');
        indicator.id = 'offline-indicator';
        indicator.className = 'offline-indicator alert alert-warning';
        indicator.innerHTML = `
            <i class="fas fa-wifi-slash me-2"></i>
            <strong>Offline Mode</strong> - Changes will be saved when connection is restored
            <button type="button" class="btn-close" aria-label="Close"></button>
        `;
        
        document.body.appendChild(indicator);
        
        // Handle close button
        indicator.querySelector('.btn-close').addEventListener('click', () => {
            indicator.style.display = 'none';
        });
    }

    /**
     * Handle network status changes
     * @param {boolean} isOnline - Network status
     */
    handleNetworkChange(isOnline) {
        this.networkStatus.online = isOnline;
        
        if (isOnline) {
            this.handleOnlineRestore();
        } else {
            this.handleOfflineMode();
        }
        
        this.updateNetworkIndicators(isOnline);
        this.logNetworkEvent(isOnline ? 'online' : 'offline');
    }

    /**
     * Handle connection quality changes
     * @param {Object} connectionInfo - Connection information
     */
    handleConnectionQualityChange(connectionInfo) {
        console.log('Connection quality changed:', connectionInfo);
        
        // Adjust retry strategy based on connection quality
        if (connectionInfo.effectiveType === 'slow-2g' || connectionInfo.effectiveType === '2g') {
            this.options.retryDelay = 3000;
            this.options.networkTimeout = 20000;
        } else if (connectionInfo.effectiveType === '3g') {
            this.options.retryDelay = 2000;
            this.options.networkTimeout = 15000;
        } else {
            this.options.retryDelay = 1000;
            this.options.networkTimeout = 10000;
        }
        
        this.logNetworkEvent('quality_change', connectionInfo);
    }

    /**
     * Handle online restoration
     */
    handleOnlineRestore() {
        console.log('Network restored - processing queued operations');
        
        // Hide offline indicator
        const offlineIndicator = document.getElementById('offline-indicator');
        if (offlineIndicator) {
            offlineIndicator.style.display = 'none';
        }
        
        // Process queued operations
        this.processQueuedOperations();
        
        // Show restoration notification
        this.showNotification('Connection restored! Processing saved changes...', 'success');
    }

    /**
     * Handle offline mode
     */
    handleOfflineMode() {
        console.log('Network offline - enabling offline mode');
        
        // Show offline indicator
        const offlineIndicator = document.getElementById('offline-indicator');
        if (offlineIndicator) {
            offlineIndicator.style.display = 'block';
        }
        
        // Show offline notification
        this.showNotification('You are offline. Changes will be saved when connection is restored.', 'warning');
    }

    /**
     * Update network indicators
     * @param {boolean} isOnline - Network status
     */
    updateNetworkIndicators(isOnline) {
        const indicators = document.querySelectorAll('.network-status-indicator');
        indicators.forEach(indicator => {
            indicator.className = `network-status-indicator ${isOnline ? 'online' : 'offline'}`;
            indicator.textContent = isOnline ? 'Online' : 'Offline';
        });
    }

    /**
     * Process queued operations when back online
     */
    async processQueuedOperations() {
        if (this.operationQueue.length === 0) return;

        console.log(`Processing ${this.operationQueue.length} queued operations`);
        
        const operations = [...this.operationQueue];
        this.operationQueue = [];
        
        let successCount = 0;
        let failureCount = 0;
        
        for (const operation of operations) {
            try {
                await this.executeQueuedOperation(operation);
                successCount++;
            } catch (error) {
                console.error('Failed to process queued operation:', error);
                failureCount++;
                // Re-queue failed operations
                this.queueOperation(operation);
            }
        }
        
        // Update localStorage
        this.saveOperationQueue();
        
        // Show results notification
        if (successCount > 0) {
            this.showNotification(
                `Successfully processed ${successCount} saved changes`, 
                'success'
            );
        }
        
        if (failureCount > 0) {
            this.showNotification(
                `${failureCount} operations failed and will be retried`, 
                'warning'
            );
        }
    }

    /**
     * Execute a queued operation
     * @param {Object} operation - Operation to execute
     */
    async executeQueuedOperation(operation) {
        const startTime = performance.now();
        
        try {
            await this.makeApiRequestWithRetry(
                operation.endpoint,
                operation.method,
                operation.data,
                operation.retryCount || 0
            );
            
            const duration = performance.now() - startTime;
            this.updatePerformanceMetrics('success', duration);
            
        } catch (error) {
            this.updatePerformanceMetrics('failure');
            throw error;
        }
    }

    /**
     * Queue an operation for later execution
     * @param {Object} operation - Operation to queue
     */
    queueOperation(operation) {
        const queuedOperation = {
            ...operation,
            timestamp: Date.now(),
            id: this.generateOperationId()
        };
        
        this.operationQueue.push(queuedOperation);
        this.saveOperationQueue();
        
        console.log('Operation queued for offline execution:', queuedOperation);
    }

    /**
     * Save operation queue to localStorage
     */
    saveOperationQueue() {
        try {
            localStorage.setItem('gbr-dragdrop-queue', JSON.stringify(this.operationQueue));
        } catch (error) {
            console.warn('Failed to save operation queue to localStorage:', error);
        }
    }

    /**
     * Generate unique operation ID
     * @returns {string} Unique operation ID
     */
    generateOperationId() {
        return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Make API request with comprehensive retry logic
     * @param {string} url - Request URL
     * @param {string} method - HTTP method
     * @param {Object} data - Request data
     * @param {number} retryCount - Current retry count
     * @returns {Promise} API response
     */
    async makeApiRequestWithRetry(url, method = 'POST', data = {}, retryCount = 0) {
        const operationId = this.generateOperationId();
        const startTime = performance.now();
        
        try {
            // Check network status
            if (!this.networkStatus.online) {
                throw new Error('NETWORK_OFFLINE');
            }
            
            // Show loading state
            this.showLoadingState(operationId, true);
            
            // Create request with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.options.networkTimeout);
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.options.csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-Operation-ID': operationId
                },
                body: JSON.stringify(data),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP_ERROR_${response.status}`);
            }
            
            const result = await response.json();
            const duration = performance.now() - startTime;
            
            // Update metrics
            this.updatePerformanceMetrics('success', duration);
            this.logApiCall('success', url, method, duration);
            
            // Hide loading state
            this.showLoadingState(operationId, false);
            
            return result;
            
        } catch (error) {
            const duration = performance.now() - startTime;
            
            // Hide loading state
            this.showLoadingState(operationId, false);
            
            // Determine error type and retry strategy
            const errorType = this.categorizeError(error);
            const shouldRetry = this.shouldRetryOperation(errorType, retryCount);
            
            // Log error
            this.logApiCall('error', url, method, duration, error);
            this.updatePerformanceMetrics('failure');
            
            if (shouldRetry) {
                console.log(`Retrying operation (attempt ${retryCount + 1}/${this.options.maxRetries}):`, error.message);
                
                await this.delay(this.calculateRetryDelay(retryCount));
                return this.makeApiRequestWithRetry(url, method, data, retryCount + 1);
            } else {
                // Handle final failure
                this.handleOperationFailure(url, method, data, error, retryCount);
                throw error;
            }
        }
    }

    /**
     * Categorize error for appropriate handling
     * @param {Error} error - Error to categorize
     * @returns {string} Error category
     */
    categorizeError(error) {
        if (error.name === 'AbortError') return 'TIMEOUT';
        if (error.message === 'NETWORK_OFFLINE') return 'OFFLINE';
        if (error.message.startsWith('HTTP_ERROR_4')) return 'CLIENT_ERROR';
        if (error.message.startsWith('HTTP_ERROR_5')) return 'SERVER_ERROR';
        if (error.message.includes('Failed to fetch')) return 'NETWORK_ERROR';
        return 'UNKNOWN_ERROR';
    }

    /**
     * Determine if operation should be retried
     * @param {string} errorType - Type of error
     * @param {number} retryCount - Current retry count
     * @returns {boolean} Whether to retry
     */
    shouldRetryOperation(errorType, retryCount) {
        if (retryCount >= this.options.maxRetries) return false;
        
        // Don't retry client errors (4xx)
        if (errorType === 'CLIENT_ERROR') return false;
        
        // Don't retry if offline (will be queued instead)
        if (errorType === 'OFFLINE') return false;
        
        // Retry server errors, timeouts, and network errors
        return ['SERVER_ERROR', 'TIMEOUT', 'NETWORK_ERROR', 'UNKNOWN_ERROR'].includes(errorType);
    }

    /**
     * Calculate retry delay with exponential backoff
     * @param {number} retryCount - Current retry count
     * @returns {number} Delay in milliseconds
     */
    calculateRetryDelay(retryCount) {
        const baseDelay = this.options.retryDelay;
        const backoffFactor = Math.pow(2, retryCount);
        const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
        
        return Math.min(baseDelay * backoffFactor + jitter, 30000); // Max 30 seconds
    }

    /**
     * Handle final operation failure
     * @param {string} url - Request URL
     * @param {string} method - HTTP method
     * @param {Object} data - Request data
     * @param {Error} error - Final error
     * @param {number} retryCount - Total retry attempts
     */
    handleOperationFailure(url, method, data, error, retryCount) {
        const errorType = this.categorizeError(error);
        
        if (errorType === 'OFFLINE' && this.options.enableOfflineMode) {
            // Queue for later if offline
            this.queueOperation({ url, method, data, retryCount });
            this.showNotification(
                'You are offline. Changes will be saved when connection is restored.', 
                'info'
            );
        } else {
            // Show appropriate error message
            const errorMessage = this.getErrorMessage(errorType, error);
            this.showNotification(errorMessage, 'danger');
            
            // Log error for analytics
            this.logError('operation_failure', {
                url, method, error: error.message, retryCount, errorType
            });
        }
    }

    /**
     * Get user-friendly error message
     * @param {string} errorType - Type of error
     * @param {Error} error - Original error
     * @returns {string} User-friendly error message
     */
    getErrorMessage(errorType, error) {
        switch (errorType) {
            case 'TIMEOUT':
                return 'Operation timed out. Please check your connection and try again.';
            case 'SERVER_ERROR':
                return 'Server error occurred. Please try again in a moment.';
            case 'NETWORK_ERROR':
                return 'Network error. Please check your connection.';
            case 'CLIENT_ERROR':
                if (error.message === 'HTTP_ERROR_403') {
                    return 'You do not have permission to perform this action.';
                } else if (error.message === 'HTTP_ERROR_404') {
                    return 'The requested resource was not found.';
                }
                return 'Request failed. Please try again.';
            default:
                return 'An unexpected error occurred. Please try again.';
        }
    }

    /**
     * Show/hide loading state for operations
     * @param {string} operationId - Operation identifier
     * @param {boolean} show - Whether to show or hide
     */
    showLoadingState(operationId, show) {
        if (show) {
            this.loadingOperations.add(operationId);
        } else {
            this.loadingOperations.delete(operationId);
        }
        
        // Update global loading overlay
        const overlay = document.getElementById('dragdrop-loading-overlay');
        if (overlay) {
            overlay.style.display = this.loadingOperations.size > 0 ? 'flex' : 'none';
        }
        
        // Update container loading indicators
        this.updateContainerLoadingStates();
    }

    /**
     * Update loading states for containers
     */
    updateContainerLoadingStates() {
        const containers = document.querySelectorAll('.sortable-list');
        containers.forEach(container => {
            const indicator = container.querySelector('.container-loading-indicator');
            if (indicator) {
                indicator.style.display = this.loadingOperations.size > 0 ? 'block' : 'none';
            }
        });
    }

    /**
     * Utility delay function
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Delay promise
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Start performance monitoring
     */
    startPerformanceMonitoring() {
        // Monitor page performance
        if ('performance' in window && 'observe' in window.PerformanceObserver.prototype) {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.logPerformanceEntry(entry);
                }
            });
            
            observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
        }
        
        // Set up periodic metrics logging
        setInterval(() => {
            this.logPerformanceMetrics();
        }, 60000); // Log every minute
    }

    /**
     * Log performance entry
     * @param {PerformanceEntry} entry - Performance entry
     */
    logPerformanceEntry(entry) {
        if (entry.name.includes('drag-drop') || entry.name.includes('sortable')) {
            console.log('Performance entry:', {
                name: entry.name,
                duration: entry.duration,
                startTime: entry.startTime
            });
        }
    }

    /**
     * Update performance metrics
     * @param {string} type - Operation type ('success' or 'failure')
     * @param {number} duration - Operation duration in milliseconds
     */
    updatePerformanceMetrics(type, duration = 0) {
        this.performanceMetrics.operations++;
        
        if (type === 'success') {
            this.performanceMetrics.successes++;
            if (duration > 0) {
                const currentAvg = this.performanceMetrics.averageResponseTime;
                const totalOperations = this.performanceMetrics.successes;
                this.performanceMetrics.averageResponseTime = 
                    ((currentAvg * (totalOperations - 1)) + duration) / totalOperations;
            }
        } else {
            this.performanceMetrics.failures++;
        }
    }

    /**
     * Log performance metrics
     */
    logPerformanceMetrics() {
        if (!this.options.enableAnalytics) return;
        
        console.log('Drag & Drop Performance Metrics:', {
            ...this.performanceMetrics,
            successRate: this.performanceMetrics.operations > 0 ? 
                (this.performanceMetrics.successes / this.performanceMetrics.operations * 100).toFixed(2) + '%' : '0%',
            timestamp: new Date().toISOString()
        });
        
        // Send to analytics if configured
        this.sendAnalytics('performance_metrics', this.performanceMetrics);
    }

    /**
     * Log API call details
     * @param {string} status - Call status ('success' or 'error')
     * @param {string} url - Request URL
     * @param {string} method - HTTP method
     * @param {number} duration - Call duration
     * @param {Error} error - Error if failed
     */
    logApiCall(status, url, method, duration, error = null) {
        const logData = {
            status,
            url,
            method,
            duration,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            online: this.networkStatus.online
        };
        
        if (error) {
            logData.error = {
                message: error.message,
                type: this.categorizeError(error)
            };
        }
        
        console.log('API Call Log:', logData);
        
        // Send to backend for analytics
        this.sendAnalytics('api_call', logData);
    }

    /**
     * Log network events
     * @param {string} event - Event type
     * @param {Object} data - Additional data
     */
    logNetworkEvent(event, data = {}) {
        const logData = {
            event,
            timestamp: new Date().toISOString(),
            networkStatus: this.networkStatus,
            ...data
        };
        
        console.log('Network Event:', logData);
        this.sendAnalytics('network_event', logData);
    }

    /**
     * Log errors for analytics
     * @param {string} errorType - Type of error
     * @param {Object} errorData - Error details
     */
    logError(errorType, errorData) {
        // Update error metrics
        if (!this.performanceMetrics.errorsByType[errorType]) {
            this.performanceMetrics.errorsByType[errorType] = 0;
        }
        this.performanceMetrics.errorsByType[errorType]++;
        
        const logData = {
            type: errorType,
            data: errorData,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            networkStatus: this.networkStatus
        };
        
        console.error('Drag & Drop Error:', logData);
        
        // Send to analytics
        this.sendAnalytics('error_log', logData);
    }

    /**
     * Send analytics data to backend
     * @param {string} eventType - Type of analytics event
     * @param {Object} data - Event data
     */
    async sendAnalytics(eventType, data) {
        if (!this.options.enableAnalytics) return;
        
        try {
            // Only send analytics if online
            if (!this.networkStatus.online) return;
            
            await fetch('/api/analytics/drag-drop/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.options.csrfToken,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    event_type: eventType,
                    data: data,
                    session_id: this.getSessionId()
                })
            });
        } catch (error) {
            // Don't log analytics failures to avoid infinite loops
            console.warn('Failed to send analytics:', error);
        }
    }

    /**
     * Get or create session ID for analytics
     * @returns {string} Session ID
     */
    getSessionId() {
        let sessionId = sessionStorage.getItem('gbr-dragdrop-session');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('gbr-dragdrop-session', sessionId);
        }
        return sessionId;
    }

    /**
     * Handle touch end for mobile optimization
     * @param {TouchEvent} e - Touch event
     */
    handleTouchEnd(e) {
        // Remove touch feedback from all items
        document.querySelectorAll('.draggable-item.touch-active').forEach(item => {
            item.classList.remove('touch-active');
        });
        
        // Hide mobile drag indicator
        const indicator = document.querySelector('.mobile-drag-indicator');
        if (indicator) indicator.classList.remove('show');
    }

    /**
     * Announce message to screen readers
     * @param {string} message - Message to announce
     */
    announceToScreenReader(message) {
        if (!this.options.announceReorders || !this.screenReader) return;
        
        this.screenReader.textContent = message;
        
        // Clear after announcement
        setTimeout(() => {
            this.screenReader.textContent = '';
        }, 1000);
    }

    /**
     * Get CSRF token from Django template or cookie
     * @returns {string} CSRF token
     */
    getCSRFToken() {
        // Try to get from meta tag first
        const token = document.querySelector('[name=csrfmiddlewaretoken]');
        if (token) return token.value;
        
        // Try to get from cookie
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1];
        
        return cookieValue || '';
    }

    /**
     * Initialize notification container for Bootstrap alerts
     */
    initNotificationContainer() {
        if (!document.querySelector(this.options.notificationContainer)) {
            const container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'position-fixed top-0 end-0 p-3';
            container.style.zIndex = '1060';
            document.body.appendChild(container);
        }
    }

    /**
     * Initialize sortable functionality on a container
     * @param {string} containerId - ID of the container element
     * @param {Object} options - Configuration options for this specific sortable
     * @returns {Object} Sortable instance
     */
    initSortable(containerId, options = {}) {
        const container = document.getElementById(containerId);
        
        if (!container) {
            console.error(`Container with ID '${containerId}' not found`);
            this.showNotification(`Container '${containerId}' not found`, 'danger');
            return null;
        }

        // Enhance container with accessibility attributes
        this.enhanceContainerAccessibility(container);

        // Merge default options with container-specific options
        const sortableOptions = {
            animation: this.options.defaultAnimation,
            ghostClass: this.options.ghostClass,
            chosenClass: this.options.chosenClass,
            dragClass: this.options.dragClass,
            handle: '.drag-handle',
            dataIdAttr: 'data-id',
            // Mobile optimizations
            touchStartThreshold: this.options.touchStartThreshold,
            forceFallback: this.options.forceFallback,
            fallbackTolerance: this.options.fallbackTolerance,
            delayOnTouchStart: this.options.delayOnTouchStart,
            delay: this.options.delay,
            // Event handlers
            onStart: (evt) => this.handleSortStart(evt, containerId),
            onEnd: (evt) => this.handleSortEnd(evt, containerId),
            onMove: (evt) => this.handleSortMove(evt, containerId),
            onAdd: (evt) => this.handleSortAdd(evt, containerId),
            onRemove: (evt) => this.handleSortRemove(evt, containerId),
            onChoose: (evt) => this.handleSortChoose(evt, containerId),
            onUnchoose: (evt) => this.handleSortUnchoose(evt, containerId),
            ...options
        };

        // Create sortable instance
        const sortableInstance = Sortable.create(container, sortableOptions);
        
        // Store instance for later reference
        this.sortableInstances.set(containerId, {
            instance: sortableInstance,
            options: sortableOptions,
            containerType: options.containerType || 'default'
        });

        // Initialize items accessibility
        this.enhanceItemsAccessibility(container);

        console.log(`Sortable initialized for container: ${containerId}`);
        this.showNotification(`Drag & drop enabled for ${containerId}`, 'info');

        return sortableInstance;
    }

    /**
     * Enhance container with accessibility features
     * @param {HTMLElement} container - Container element
     */
    enhanceContainerAccessibility(container) {
        if (!container.hasAttribute('role')) {
            container.setAttribute('role', 'application');
        }
        if (!container.hasAttribute('aria-label')) {
            const modelType = container.dataset.modelType || 'items';
            container.setAttribute('aria-label', `Sortable list of ${modelType}. Use keyboard navigation to reorder items.`);
        }
        container.setAttribute('aria-describedby', 'keyboard-help');
    }

    /**
     * Enhance items with accessibility features
     * @param {HTMLElement} container - Container element
     */
    enhanceItemsAccessibility(container) {
        const items = container.querySelectorAll('.draggable-item');
        items.forEach((item, index) => {
            // Make items focusable
            if (!item.hasAttribute('tabindex')) {
                item.setAttribute('tabindex', '0');
            }
            
            // Add ARIA attributes
            if (!item.hasAttribute('role')) {
                item.setAttribute('role', 'listitem');
            }
            
            // Add position information
            item.setAttribute('aria-posinset', index + 1);
            item.setAttribute('aria-setsize', items.length);
            
            // Add drag handle accessibility
            const dragHandle = item.querySelector('.drag-handle');
            if (dragHandle) {
                dragHandle.setAttribute('aria-label', 'Drag to reorder item');
                dragHandle.setAttribute('aria-describedby', 'keyboard-help');
                if (!dragHandle.hasAttribute('tabindex')) {
                    dragHandle.setAttribute('tabindex', '0');
                }
            }
            
            // Add descriptive label
            const title = item.querySelector('.item-title');
            if (title && !item.hasAttribute('aria-label')) {
                item.setAttribute('aria-label', `${title.textContent.trim()} - Position ${index + 1} of ${items.length}`);
            }
        });
    }

    /**
     * Handle sort choose event (when item is selected for dragging)
     * @param {Event} evt - Sort choose event
     * @param {string} containerId - Container ID
     */
    handleSortChoose(evt, containerId) {
        console.log(`Item chosen for dragging in container: ${containerId}`, evt);
        
        // Mobile feedback
        if (this.isMobile) {
            const indicator = document.querySelector('.mobile-drag-indicator');
            if (indicator) {
                indicator.classList.add('show');
                indicator.textContent = `Moving: ${evt.item.querySelector('.item-title')?.textContent || 'Item'}`;
            }
        }
        
        // Accessibility announcement
        const itemTitle = evt.item.querySelector('.item-title')?.textContent || 'Item';
        this.announceToScreenReader(`Picked up ${itemTitle} for reordering`);
    }

    /**
     * Handle sort unchoose event (when item is deselected)
     * @param {Event} evt - Sort unchoose event
     * @param {string} containerId - Container ID
     */
    handleSortUnchoose(evt, containerId) {
        console.log(`Item unchoosen in container: ${containerId}`, evt);
        
        // Hide mobile indicator
        if (this.isMobile) {
            const indicator = document.querySelector('.mobile-drag-indicator');
            if (indicator) indicator.classList.remove('show');
        }
    }

    /**
     * Handle sort start event
     * @param {Event} evt - Sort start event
     * @param {string} containerId - Container ID
     */
    handleSortStart(evt, containerId) {
        console.log(`Sort started in container: ${containerId}`, evt);
        
        // Add visual feedback
        evt.item.classList.add('just-started-drag');
        
        // Store original position for potential rollback
        evt.item.dataset.originalIndex = evt.oldIndex;
    }

    /**
     * Handle sort end event and communicate with Django backend
     * @param {Event} evt - Sort end event
     * @param {string} containerId - Container ID
     */
    async handleSortEnd(evt, containerId) {
        console.log(`Sort ended in container: ${containerId}`, evt);
        
        // Remove visual feedback classes
        evt.item.classList.remove('just-started-drag');
        evt.item.classList.add('just-dropped');
        
        // Hide mobile indicator
        if (this.isMobile) {
            const indicator = document.querySelector('.mobile-drag-indicator');
            if (indicator) indicator.classList.remove('show');
        }
        
        // Update accessibility attributes for all items
        this.updateItemsAccessibility(document.getElementById(containerId));
        
        // Accessibility announcement
        const itemTitle = evt.item.querySelector('.item-title')?.textContent || 'Item';
        const newPosition = evt.newIndex + 1;
        
        // Remove animation class after animation completes
        setTimeout(() => {
            evt.item.classList.remove('just-dropped');
        }, 400);

        // If item didn't actually move, don't send request
        if (evt.oldIndex === evt.newIndex) {
            console.log('Item position unchanged, skipping backend update');
            this.announceToScreenReader(`${itemTitle} position unchanged`);
            return;
        }

        // Announce the move
        this.announceToScreenReader(`${itemTitle} moved to position ${newPosition}`);

        // Get container info
        const containerInfo = this.sortableInstances.get(containerId);
        const containerType = containerInfo?.containerType || 'default';

        // Prepare data for backend
        const sortData = this.prepareSortData(evt, containerId, containerType);
        
        try {
            // Show loading state
            this.showNotification('Updating order...', 'info');
            
            // Send to Django backend
            await this.sendSortUpdate(sortData);
            
            // Save user preferences after successful backend update
            if (window.userAuthenticated) {
                await this.saveItemOrderPreferences(evt, containerId, containerType);
            }
            
            // Success feedback
            this.showNotification('Order updated successfully!', 'success');
            this.announceToScreenReader('Order saved successfully');
            
        } catch (error) {
            console.error('Sort update failed:', error);
            
            // Rollback to original position
            this.rollbackSort(evt, containerId);
            
            // Show error message
            this.showNotification(
                `Failed to update order: ${error.message}`, 
                'danger'
            );
            this.announceToScreenReader(`Error: Failed to save new order. ${itemTitle} returned to original position.`);
        }
    }

    /**
     * Update accessibility attributes for all items after reordering
     * @param {HTMLElement} container - Container element
     */
    updateItemsAccessibility(container) {
        const items = container.querySelectorAll('.draggable-item');
        items.forEach((item, index) => {
            // Update position information
            item.setAttribute('aria-posinset', index + 1);
            item.setAttribute('aria-setsize', items.length);
            
            // Update descriptive label
            const title = item.querySelector('.item-title');
            if (title) {
                item.setAttribute('aria-label', `${title.textContent.trim()} - Position ${index + 1} of ${items.length}`);
            }
        });
    }

    /**
     * Handle sort move event (item being moved between containers)
     * @param {Event} evt - Sort move event
     * @param {string} containerId - Container ID
     */
    handleSortMove(evt, containerId) {
        console.log(`Sort move in container: ${containerId}`, evt);
        
        // Custom logic for preventing certain moves
        const related = evt.related;
        const relatedContainer = related.closest('.sortable-list');
        
        // Example: Prevent moving items to certain containers
        if (relatedContainer && relatedContainer.classList.contains('no-drop')) {
            return false; // Prevent the move
        }
        
        return true; // Allow the move
    }

    /**
     * Handle item added to container
     * @param {Event} evt - Sort add event
     * @param {string} containerId - Container ID
     */
    handleSortAdd(evt, containerId) {
        console.log(`Item added to container: ${containerId}`, evt);
        
        // Custom logic when item is added from another container
        evt.item.classList.add('newly-added');
        
        setTimeout(() => {
            evt.item.classList.remove('newly-added');
        }, 1000);
    }

    /**
     * Handle item removed from container
     * @param {Event} evt - Sort remove event
     * @param {string} containerId - Container ID
     */
    handleSortRemove(evt, containerId) {
        console.log(`Item removed from container: ${containerId}`, evt);
        
        // Custom logic when item is removed to another container
        // Could trigger cleanup or notifications
    }

    /**
     * Prepare sort data for Django backend
     * @param {Event} evt - Sort event
     * @param {string} containerId - Container ID
     * @param {string} containerType - Type of container (companies, countries, etc.)
     * @returns {Object} Data object for backend
     */
    prepareSortData(evt, containerId, containerType) {
        const item = evt.item;
        const itemId = item.dataset.id || item.id;
        
        // Get all items in their new order
        const container = document.getElementById(containerId);
        const orderedItems = Array.from(container.children).map((child, index) => ({
            id: child.dataset.id || child.id,
            position: index + 1
        }));

        return {
            action: 'reorder',
            container_id: containerId,
            container_type: containerType,
            item_id: itemId,
            old_index: evt.oldIndex,
            new_index: evt.newIndex,
            ordered_items: orderedItems,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Send sort update to Django backend with enhanced error handling
     * @param {Object} data - Sort data to send
     * @returns {Promise} API response
     */
    async sendSortUpdate(data) {
        try {
            return await this.makeApiRequestWithRetry(
                this.options.apiEndpoint,
                'POST',
                data
            );
        } catch (error) {
            // Enhanced error handling with user feedback
            const errorType = this.categorizeError(error);
            
            if (errorType === 'OFFLINE' && this.options.enableOfflineMode) {
                // Queue operation for when back online
                this.queueOperation({
                    endpoint: this.options.apiEndpoint,
                    method: 'POST',
                    data: data
                });
                
                throw new Error('QUEUED_FOR_OFFLINE');
            } else {
                // Re-throw with enhanced error information
                throw error;
            }
        }
    }

    /**
     * Save user preferences to backend with enhanced error handling
     * @param {string} preferenceType - Type of preference (dashboard_layout, list_order, etc.)
     * @param {string} preferenceKey - Specific preference key
     * @param {Object} preferenceData - Preference data to save
     * @returns {Promise} API response
     */
    async saveUserPreference(preferenceType, preferenceKey, preferenceData) {
        try {
            const data = {
                preference_type: preferenceType,
                preference_key: preferenceKey,
                preference_data: preferenceData
            };

            const result = await this.makeApiRequestWithRetry(
                '/api/preferences/save/',
                'POST',
                data
            );

            console.log(`User preference saved: ${preferenceType}.${preferenceKey}`);
            return result;

        } catch (error) {
            const errorType = this.categorizeError(error);
            
            if (errorType === 'OFFLINE' && this.options.enableOfflineMode) {
                // Queue preference save for when back online
                this.queueOperation({
                    endpoint: '/api/preferences/save/',
                    method: 'POST',
                    data: {
                        preference_type: preferenceType,
                        preference_key: preferenceKey,
                        preference_data: preferenceData
                    }
                });
                
                console.log(`User preference queued for offline: ${preferenceType}.${preferenceKey}`);
                return { success: true, queued: true };
            } else {
                console.error('Error saving user preference:', error);
                throw error;
            }
        }
    }

    /**
     * Load user preferences from backend
     * @param {string} preferenceType - Type of preference to load
     * @param {string} preferenceKey - Specific preference key (optional)
     * @returns {Promise} User preferences
     */
    async loadUserPreferences(preferenceType, preferenceKey = null) {
        try {
            const params = new URLSearchParams({ preference_type: preferenceType });
            if (preferenceKey) {
                params.append('preference_key', preferenceKey);
            }

            const response = await fetch(`/api/preferences/get/?${params}`, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();

        } catch (error) {
            console.error('Error loading user preferences:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Save dashboard widget positions
     * @param {Object} widgetPositions - Widget position data
     */
    async saveDashboardLayout(widgetPositions) {
        try {
            await this.saveUserPreference(
                'widget_positions',
                'dashboard_widgets',
                {
                    positions: widgetPositions,
                    timestamp: new Date().toISOString(),
                    columns: this.getDashboardColumns()
                }
            );
            
            this.showNotification('Dashboard layout saved!', 'success');
        } catch (error) {
            console.error('Failed to save dashboard layout:', error);
            this.showNotification('Failed to save dashboard layout', 'warning');
        }
    }

    /**
     * Load and restore dashboard layout
     */
    async restoreDashboardLayout() {
        try {
            const result = await this.loadUserPreferences('widget_positions', 'dashboard_widgets');
            
            if (result.success && result.preference_data && result.preference_data.positions) {
                this.applyDashboardLayout(result.preference_data.positions);
                console.log('Dashboard layout restored from user preferences');
            }
        } catch (error) {
            console.error('Failed to restore dashboard layout:', error);
        }
    }

    /**
     * Apply dashboard layout from preferences
     * @param {Object} positions - Widget position data
     */
    applyDashboardLayout(positions) {
        // Apply widget positions to dashboard
        Object.entries(positions).forEach(([widgetId, position]) => {
            const widget = document.getElementById(widgetId);
            if (widget && position.column && position.order !== undefined) {
                const targetColumn = document.querySelector(`[data-column="${position.column}"]`);
                if (targetColumn) {
                    // Move widget to correct column and position
                    const siblings = Array.from(targetColumn.children);
                    if (position.order >= siblings.length) {
                        targetColumn.appendChild(widget);
                    } else {
                        targetColumn.insertBefore(widget, siblings[position.order]);
                    }
                }
            }
        });
    }

    /**
     * Get current dashboard column configuration
     * @returns {number} Number of columns
     */
    getDashboardColumns() {
        const columns = document.querySelectorAll('[data-column]');
        return columns.length || 3;
    }

    /**
     * Save list order preferences
     * @param {string} listType - Type of list (countries, industries, companies)
     * @param {string} listId - Specific list identifier
     * @param {Array} itemOrder - Array of item IDs in order
     */
    async saveListOrder(listType, listId, itemOrder) {
        try {
            const preferenceKey = `${listType}_${listId}`;
            await this.saveUserPreference(
                'list_order',
                preferenceKey,
                {
                    item_order: itemOrder,
                    timestamp: new Date().toISOString(),
                    list_type: listType,
                    list_id: listId
                }
            );
            
            console.log(`List order saved for ${preferenceKey}`);
        } catch (error) {
            console.error('Failed to save list order:', error);
        }
    }

    /**
     * Auto-save functionality for dashboard widgets
     */
    enableDashboardAutoSave() {
        const dashboardColumns = document.querySelectorAll('[data-column]');
        
        dashboardColumns.forEach(column => {
            if (this.sortableInstances.has(column.id)) return;
            
            const sortable = Sortable.create(column, {
                group: 'dashboard-widgets',
                animation: 150,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                onEnd: () => {
                    // Auto-save dashboard layout after drag
                    setTimeout(() => {
                        this.saveDashboardLayoutFromDOM();
                    }, 500);
                }
            });
            
            this.sortableInstances.set(column.id, {
                instance: sortable,
                options: { containerType: 'dashboard' }
            });
        });
    }

    /**
     * Save dashboard layout from current DOM state
     */
    saveDashboardLayoutFromDOM() {
        const widgetPositions = {};
        
        document.querySelectorAll('[data-column]').forEach((column, columnIndex) => {
            Array.from(column.children).forEach((widget, order) => {
                if (widget.id) {
                    widgetPositions[widget.id] = {
                        column: columnIndex,
                        order: order,
                        timestamp: new Date().toISOString()
                    };
                }
            });
        });
        
        this.saveDashboardLayout(widgetPositions);
    }

    /**
     * Initialize user preferences system
     */
    initUserPreferences() {
        // Check if user is authenticated
        if (!window.userAuthenticated) {
            console.log('User not authenticated, skipping preference initialization');
            return;
        }
        
        // Restore dashboard layout on page load
        if (window.location.pathname.includes('dashboard')) {
            setTimeout(() => {
                this.restoreDashboardLayout();
                this.enableDashboardAutoSave();
            }, 1000);
        }
        
        // Load list preferences if on listing pages
        this.initListPreferences();
    }

    /**
     * Initialize list order preferences
     */
    initListPreferences() {
        // Extract list information from current page
        const pathname = window.location.pathname;
        
        if (pathname.includes('/listings/continent/')) {
            const continentId = pathname.match(/\/continent\/(\d+)\//)?.[1];
            if (continentId) {
                this.loadListPreferences('countries', continentId);
            }
        } else if (pathname.includes('/listings/country/')) {
            const countryId = pathname.match(/\/country\/(\d+)\//)?.[1];
            if (countryId) {
                this.loadListPreferences('industries', countryId);
            }
        } else if (pathname.includes('/listings/industry/')) {
            const industryId = pathname.match(/\/industry\/(\d+)\//)?.[1];
            if (industryId) {
                this.loadListPreferences('companies', industryId);
            }
        }
    }

    /**
     * Load and apply list preferences
     * @param {string} listType - Type of list
     * @param {string} listId - List identifier
     */
    async loadListPreferences(listType, listId) {
        try {
            const preferenceKey = `${listType}_${listId}`;
            const result = await this.loadUserPreferences('list_order', preferenceKey);
            
            if (result.success && result.preference_data && result.preference_data.item_order) {
                console.log(`Loaded list preferences for ${preferenceKey}`);
                // Note: List order is already applied by Django view based on sort_order field
                // This could be used for client-side enhancements or overrides
            }
        } catch (error) {
            console.error(`Failed to load list preferences for ${listType}_${listId}:`, error);
        }
    }

    /**
     * Rollback sort to original position
     * @param {Event} evt - Sort event
     * @param {string} containerId - Container ID
     */
    rollbackSort(evt, containerId) {
        const container = document.getElementById(containerId);
        const item = evt.item;
        const originalIndex = parseInt(item.dataset.originalIndex);
        
        if (originalIndex >= 0) {
            const children = Array.from(container.children);
            
            // Remove item from current position
            item.remove();
            
            // Insert at original position
            if (originalIndex >= children.length) {
                container.appendChild(item);
            } else {
                container.insertBefore(item, children[originalIndex]);
            }
            
            console.log(`Rolled back item to original position: ${originalIndex}`);
        }
    }

    /**
     * Show Bootstrap alert notification
     * @param {string} message - Notification message
     * @param {string} type - Bootstrap alert type (success, danger, warning, info)
     * @param {number} duration - Auto-dismiss duration in milliseconds (0 = no auto-dismiss)
     */
    showNotification(message, type = 'info', duration = 5000) {
        const container = document.querySelector(this.options.notificationContainer);
        
        if (!container) {
            console.warn('Notification container not found');
            return;
        }

        // Create unique ID for this notification
        const notificationId = `notification-${Date.now()}`;
        
        // Create Bootstrap alert
        const alert = document.createElement('div');
        alert.id = notificationId;
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.style.minWidth = '300px';
        alert.innerHTML = `
            <strong>${this.getAlertIcon(type)}</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        // Add to container
        container.appendChild(alert);

        // Auto-dismiss if duration specified
        if (duration > 0) {
            setTimeout(() => {
                const existingAlert = document.getElementById(notificationId);
                if (existingAlert) {
                    const bsAlert = new bootstrap.Alert(existingAlert);
                    bsAlert.close();
                }
            }, duration);
        }

        console.log(`Notification shown: ${type} - ${message}`);
    }

    /**
     * Get appropriate icon for alert type
     * @param {string} type - Alert type
     * @returns {string} Icon HTML or text
     */
    getAlertIcon(type) {
        const icons = {
            success: '✓',
            danger: '✗',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || 'ℹ';
    }

    /**
     * Destroy sortable instance
     * @param {string} containerId - Container ID
     */
    destroySortable(containerId) {
        const containerInfo = this.sortableInstances.get(containerId);
        
        if (containerInfo) {
            containerInfo.instance.destroy();
            this.sortableInstances.delete(containerId);
            console.log(`Sortable destroyed for container: ${containerId}`);
        }
    }

    /**
     * Get all active sortable instances
     * @returns {Map} Map of container IDs to sortable instances
     */
    getActiveInstances() {
        return this.sortableInstances;
    }

    /**
     * Batch initialize multiple sortables
     * @param {Array} containers - Array of container configurations
     */
    initMultipleSortables(containers) {
        containers.forEach(config => {
            this.initSortable(config.containerId, config.options);
        });
    }

    /**
     * Update sortable options
     * @param {string} containerId - Container ID
     * @param {Object} newOptions - New options to apply
     */
    updateSortableOptions(containerId, newOptions) {
        const containerInfo = this.sortableInstances.get(containerId);
        
        if (containerInfo) {
            // Destroy and recreate with new options
            this.destroySortable(containerId);
            this.initSortable(containerId, { ...containerInfo.options, ...newOptions });
        }
    }

    /**
     * Save item order preferences after successful sort
     * @param {Object} evt - Sort event object
     * @param {string} containerId - Container ID
     * @param {string} containerType - Type of container
     */
    async saveItemOrderPreferences(evt, containerId, containerType) {
        try {
            const container = document.getElementById(containerId);
            const items = container.querySelectorAll('.draggable-item[data-id]');
            const itemOrder = Array.from(items).map(item => item.dataset.id);
            
            // Determine preference type and key based on container type and current page
            let preferenceType = 'list_order';
            let preferenceKey = containerId;
            
            // Extract more specific information from URL or container data
            const pathname = window.location.pathname;
            if (pathname.includes('/listings/continent/')) {
                const continentId = pathname.match(/\/continent\/(\d+)\//)?.[1];
                preferenceKey = `countries_${continentId}`;
            } else if (pathname.includes('/listings/country/')) {
                const countryId = pathname.match(/\/country\/(\d+)\//)?.[1];
                preferenceKey = `industries_${countryId}`;
            } else if (pathname.includes('/listings/industry/')) {
                const industryId = pathname.match(/\/industry\/(\d+)\//)?.[1];
                preferenceKey = `companies_${industryId}`;
            } else if (containerType === 'dashboard') {
                preferenceType = 'widget_positions';
                preferenceKey = 'dashboard_widgets';
            }
            
            await this.saveListOrder(containerType, preferenceKey, itemOrder);
            
        } catch (error) {
            console.error('Failed to save item order preferences:', error);
            // Don't show error to user as this is background functionality
        }
    }
}

// Initialize global instance when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Create global instance
    window.gbrDragDrop = new GBRDragDrop();
    
    // Initialize user preferences system
    window.gbrDragDrop.initUserPreferences();
    
    // Auto-initialize any containers with data-sortable attribute
    const autoInitContainers = document.querySelectorAll('[data-sortable]');
    autoInitContainers.forEach(container => {
        const options = {
            containerType: container.dataset.containerType || 'default',
            // Parse any additional options from data attributes
            ...JSON.parse(container.dataset.sortableOptions || '{}')
        };
        
        window.gbrDragDrop.initSortable(container.id, options);
    });
    
    console.log('GBR Drag & Drop system ready!');
});

// Export for module usage (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GBRDragDrop;
}
