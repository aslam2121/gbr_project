// Optimized Sortable Handler for High-Performance Drag and Drop
// GBR Project - Performance-Optimized Drag & Drop with Virtual Scrolling

/**
 * GBRDragDropOptimized - High-performance ES6 Class for drag and drop
 * Features: Debouncing, lazy loading, virtual scrolling, optimized DOM operations
 */
class GBRDragDropOptimized {
    constructor(options = {}) {
        this.options = {
            csrfToken: window.csrfToken || this.getCSRFToken(),
            apiEndpoint: '/api/update-order/',
            notificationContainer: '#notification-container',
            defaultAnimation: 150,
            
            // Performance optimizations
            debounceDelay: 300,
            virtualScrollingThreshold: 100,
            lazyLoadingThreshold: 50,
            batchUpdateSize: 10,
            
            // DOM optimization
            usePassiveListeners: true,
            useCapture: false,
            useRAF: true, // Use requestAnimationFrame for updates
            
            // Caching options
            enableQueryCache: true,
            cacheTimeout: 5 * 60 * 1000, // 5 minutes
            
            ...options
        };
        
        // Performance tracking
        this.performanceMetrics = {
            dragStartTime: 0,
            totalDragTime: 0,
            domQueryCount: 0,
            apiCallCount: 0,
            cacheHits: 0,
            fps: 0,
            frameCount: 0,
            lastFrameTime: 0
        };
        
        // Caching system
        this.domCache = new Map();
        this.queryCache = new Map();
        this.intersectionObserver = null;
        
        // Debouncing and batching
        this.debounceTimers = new Map();
        this.updateQueue = [];
        this.batchUpdateTimer = null;
        
        // Virtual scrolling state
        this.virtualScrollingEnabled = false;
        this.visibleRange = { start: 0, end: 0 };
        this.itemHeight = 0;
        this.scrollContainer = null;
        
        // Initialize optimized components
        this.initPerformanceMonitoring();
        this.initDOMOptimizations();
        this.initVirtualScrolling();
        this.initLazyLoading();
        
        console.log('GBRDragDropOptimized initialized with performance enhancements');
    }

    /**
     * Initialize performance monitoring with FPS tracking
     */
    initPerformanceMonitoring() {
        if (!window.performance) return;
        
        // FPS monitoring
        const trackFPS = () => {
            const now = performance.now();
            this.performanceMetrics.frameCount++;
            
            if (this.performanceMetrics.lastFrameTime) {
                const delta = now - this.performanceMetrics.lastFrameTime;
                this.performanceMetrics.fps = Math.round(1000 / delta);
            }
            
            this.performanceMetrics.lastFrameTime = now;
            requestAnimationFrame(trackFPS);
        };
        
        requestAnimationFrame(trackFPS);
        
        // Performance observer for measuring drag operations
        if ('PerformanceObserver' in window) {
            this.performanceObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.name.startsWith('drag-operation')) {
                        this.logPerformanceMetric(entry.name, entry.duration);
                    }
                }
            });
            
            this.performanceObserver.observe({ entryTypes: ['measure'] });
        }
    }

    /**
     * Initialize DOM optimizations with caching and passive listeners
     */
    initDOMOptimizations() {
        // Pre-cache commonly used DOM elements
        this.cacheCommonElements();
        
        // Use passive event listeners where possible
        const passiveOptions = this.options.usePassiveListeners ? { passive: true } : false;
        
        // Optimize scroll handlers with throttling
        this.throttledScrollHandler = this.throttle(this.handleScroll.bind(this), 16); // 60fps
        
        // Use Intersection Observer for visibility detection
        this.setupIntersectionObserver();
    }

    /**
     * Cache commonly used DOM elements to avoid repeated queries
     */
    cacheCommonElements() {
        const commonSelectors = [
            this.options.notificationContainer,
            '.sortable-list',
            '.drag-handle',
            '.loading-overlay',
            'body',
            'html'
        ];
        
        commonSelectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                this.domCache.set(selector, elements);
                this.performanceMetrics.domQueryCount++;
            } catch (e) {
                console.warn(`Failed to cache selector: ${selector}`, e);
            }
        });
    }

    /**
     * Optimized DOM query with caching
     */
    querySelector(selector, useCache = true) {
        if (useCache && this.domCache.has(selector)) {
            this.performanceMetrics.cacheHits++;
            return this.domCache.get(selector);
        }
        
        const elements = document.querySelectorAll(selector);
        
        if (useCache) {
            this.domCache.set(selector, elements);
        }
        
        this.performanceMetrics.domQueryCount++;
        return elements;
    }

    /**
     * Initialize virtual scrolling for large lists
     */
    initVirtualScrolling() {
        this.checkForLargeLists();
    }

    /**
     * Check if any lists are large enough to benefit from virtual scrolling
     */
    checkForLargeLists() {
        const lists = this.querySelector('.sortable-list');
        
        lists.forEach(list => {
            const itemCount = list.children.length;
            
            if (itemCount >= this.options.virtualScrollingThreshold) {
                this.enableVirtualScrolling(list);
            }
        });
    }

    /**
     * Enable virtual scrolling for a specific list
     */
    enableVirtualScrolling(listElement) {
        console.log(`Enabling virtual scrolling for list with ${listElement.children.length} items`);
        
        this.virtualScrollingEnabled = true;
        this.scrollContainer = listElement.closest('.scroll-container') || listElement.parentElement;
        
        // Calculate item height from first item
        const firstItem = listElement.children[0];
        if (firstItem) {
            this.itemHeight = firstItem.offsetHeight;
        }
        
        // Create virtual scrolling container
        this.createVirtualScrollContainer(listElement);
        
        // Set up scroll listener
        this.scrollContainer.addEventListener('scroll', this.throttledScrollHandler, { passive: true });
        
        // Initial render
        this.updateVisibleItems(listElement);
    }

    /**
     * Create virtual scrolling container structure
     */
    createVirtualScrollContainer(listElement) {
        const totalHeight = listElement.children.length * this.itemHeight;
        
        // Create spacer elements
        const topSpacer = document.createElement('div');
        topSpacer.className = 'virtual-scroll-spacer-top';
        topSpacer.style.height = '0px';
        
        const bottomSpacer = document.createElement('div');
        bottomSpacer.className = 'virtual-scroll-spacer-bottom';
        bottomSpacer.style.height = `${totalHeight}px`;
        
        // Insert spacers
        listElement.parentElement.insertBefore(topSpacer, listElement);
        listElement.parentElement.appendChild(bottomSpacer);
        
        // Store references
        this.topSpacer = topSpacer;
        this.bottomSpacer = bottomSpacer;
        this.virtualList = listElement;
    }

    /**
     * Update visible items in virtual scrolling
     */
    updateVisibleItems(listElement) {
        if (!this.virtualScrollingEnabled) return;
        
        const scrollTop = this.scrollContainer.scrollTop;
        const containerHeight = this.scrollContainer.offsetHeight;
        
        // Calculate visible range with buffer
        const bufferSize = 5;
        const startIndex = Math.max(0, Math.floor(scrollTop / this.itemHeight) - bufferSize);
        const endIndex = Math.min(
            listElement.children.length - 1,
            Math.ceil((scrollTop + containerHeight) / this.itemHeight) + bufferSize
        );
        
        // Update spacer heights
        this.topSpacer.style.height = `${startIndex * this.itemHeight}px`;
        this.bottomSpacer.style.height = `${(listElement.children.length - endIndex - 1) * this.itemHeight}px`;
        
        // Show/hide items
        Array.from(listElement.children).forEach((item, index) => {
            const shouldShow = index >= startIndex && index <= endIndex;
            item.style.display = shouldShow ? '' : 'none';
        });
        
        this.visibleRange = { start: startIndex, end: endIndex };
    }

    /**
     * Handle scroll events for virtual scrolling
     */
    handleScroll() {
        if (this.virtualScrollingEnabled && this.virtualList) {
            this.updateVisibleItems(this.virtualList);
        }
    }

    /**
     * Initialize lazy loading for drag functionality
     */
    initLazyLoading() {
        this.setupIntersectionObserver();
    }

    /**
     * Set up Intersection Observer for lazy loading
     */
    setupIntersectionObserver() {
        if (!('IntersectionObserver' in window)) return;
        
        this.intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.lazyLoadDragFunctionality(entry.target);
                }
            });
        }, {
            rootMargin: '50px',
            threshold: 0.1
        });
        
        // Observe lists that aren't immediately visible
        this.observeListsForLazyLoading();
    }

    /**
     * Observe lists for lazy loading
     */
    observeListsForLazyLoading() {
        const lists = this.querySelector('.sortable-list');
        
        lists.forEach(list => {
            if (list.children.length >= this.options.lazyLoadingThreshold) {
                this.intersectionObserver.observe(list);
            } else {
                // Small lists can be initialized immediately
                this.initializeDragForList(list);
            }
        });
    }

    /**
     * Lazy load drag functionality for a specific list
     */
    lazyLoadDragFunctionality(listElement) {
        if (listElement.hasAttribute('data-drag-initialized')) return;
        
        console.log('Lazy loading drag functionality for list');
        this.initializeDragForList(listElement);
        this.intersectionObserver.unobserve(listElement);
    }

    /**
     * Initialize drag functionality for a specific list with performance optimizations
     */
    initializeDragForList(listElement) {
        if (listElement.hasAttribute('data-drag-initialized')) return;
        
        const startTime = performance.now();
        
        const sortableOptions = {
            animation: this.options.defaultAnimation,
            ghostClass: 'sortable-ghost-optimized',
            chosenClass: 'sortable-chosen-optimized',
            dragClass: 'sortable-drag-optimized',
            
            // Performance optimizations
            forceFallback: false,
            fallbackTolerance: 0,
            
            // Optimized event handlers
            onStart: this.debounce((evt) => {
                this.handleDragStart(evt);
            }, 50),
            
            onEnd: this.debounce((evt) => {
                this.handleDragEnd(evt);
            }, this.options.debounceDelay),
            
            onMove: this.throttle((evt) => {
                this.handleDragMove(evt);
            }, 16) // 60fps
        };
        
        // Initialize Sortable with optimizations
        const sortableInstance = new Sortable(listElement, sortableOptions);
        
        // Store instance for cleanup
        this.sortableInstances.set(listElement, sortableInstance);
        
        // Mark as initialized
        listElement.setAttribute('data-drag-initialized', 'true');
        
        const endTime = performance.now();
        this.logPerformanceMetric('list-initialization', endTime - startTime);
    }

    /**
     * Optimized drag start handler
     */
    handleDragStart(evt) {
        performance.mark('drag-start');
        this.performanceMetrics.dragStartTime = performance.now();
        
        // Optimize for touch devices
        if (this.isTouchDevice()) {
            this.optimizeForTouch(evt);
        }
        
        // Pre-calculate positions to avoid layout thrashing
        this.cacheItemPositions(evt.from);
    }

    /**
     * Cache item positions to avoid repeated calculations
     */
    cacheItemPositions(container) {
        const items = Array.from(container.children);
        const positions = new Map();
        
        items.forEach((item, index) => {
            const rect = item.getBoundingClientRect();
            positions.set(item, {
                index,
                top: rect.top,
                height: rect.height
            });
        });
        
        this.itemPositions = positions;
    }

    /**
     * Optimized drag end handler with batching
     */
    handleDragEnd(evt) {
        performance.mark('drag-end');
        performance.measure('drag-operation', 'drag-start', 'drag-end');
        
        const dragTime = performance.now() - this.performanceMetrics.dragStartTime;
        this.performanceMetrics.totalDragTime += dragTime;
        
        // Batch the update operation
        this.queueUpdate({
            container: evt.from,
            oldIndex: evt.oldIndex,
            newIndex: evt.newIndex,
            item: evt.item,
            timestamp: Date.now()
        });
    }

    /**
     * Queue update for batching
     */
    queueUpdate(updateData) {
        this.updateQueue.push(updateData);
        
        // Process queue when it reaches batch size or after timeout
        if (this.updateQueue.length >= this.options.batchUpdateSize) {
            this.processBatchUpdates();
        } else {
            this.scheduleBatchUpdate();
        }
    }

    /**
     * Schedule batch update with debouncing
     */
    scheduleBatchUpdate() {
        if (this.batchUpdateTimer) {
            clearTimeout(this.batchUpdateTimer);
        }
        
        this.batchUpdateTimer = setTimeout(() => {
            this.processBatchUpdates();
        }, this.options.debounceDelay);
    }

    /**
     * Process batched updates for optimal API usage
     */
    async processBatchUpdates() {
        if (this.updateQueue.length === 0) return;
        
        const updates = [...this.updateQueue];
        this.updateQueue = [];
        
        try {
            // Group updates by container for bulk operations
            const updatesByContainer = this.groupUpdatesByContainer(updates);
            
            // Process each container's updates
            const promises = Object.entries(updatesByContainer).map(([containerId, containerUpdates]) => {
                return this.processBulkUpdate(containerId, containerUpdates);
            });
            
            await Promise.all(promises);
            
        } catch (error) {
            console.error('Batch update failed:', error);
            // Re-queue failed updates
            this.updateQueue.unshift(...updates);
        }
    }

    /**
     * Group updates by container for bulk processing
     */
    groupUpdatesByContainer(updates) {
        const grouped = {};
        
        updates.forEach(update => {
            const containerId = this.getContainerId(update.container);
            if (!grouped[containerId]) {
                grouped[containerId] = [];
            }
            grouped[containerId].push(update);
        });
        
        return grouped;
    }

    /**
     * Process bulk update for a container
     */
    async processBulkUpdate(containerId, updates) {
        const startTime = performance.now();
        
        try {
            // Prepare bulk update data
            const bulkData = {
                container_id: containerId,
                updates: updates.map(update => ({
                    item_id: this.getItemId(update.item),
                    old_position: update.oldIndex,
                    new_position: update.newIndex
                }))
            };
            
            // Make optimized API call
            const response = await this.makeOptimizedApiCall('/api/bulk-update-order/', bulkData);
            
            const endTime = performance.now();
            this.logPerformanceMetric('bulk-update', endTime - startTime);
            
            this.performanceMetrics.apiCallCount++;
            
        } catch (error) {
            throw new Error(`Bulk update failed for container ${containerId}: ${error.message}`);
        }
    }

    /**
     * Make optimized API call with caching and compression
     */
    async makeOptimizedApiCall(endpoint, data) {
        const cacheKey = this.generateCacheKey(endpoint, data);
        
        // Check cache for recent identical requests
        if (this.options.enableQueryCache && this.queryCache.has(cacheKey)) {
            const cached = this.queryCache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.options.cacheTimeout) {
                this.performanceMetrics.cacheHits++;
                return cached.response;
            }
        }
        
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.options.csrfToken,
                'Accept-Encoding': 'gzip, deflate, br' // Enable compression
            },
            body: JSON.stringify(data)
        };
        
        // Add performance timing
        const startTime = performance.now();
        
        try {
            const response = await fetch(endpoint, requestOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            // Cache successful response
            if (this.options.enableQueryCache) {
                this.queryCache.set(cacheKey, {
                    response: result,
                    timestamp: Date.now()
                });
            }
            
            const endTime = performance.now();
            this.logPerformanceMetric('api-call', endTime - startTime);
            
            return result;
            
        } catch (error) {
            const endTime = performance.now();
            this.logPerformanceMetric('api-call-failed', endTime - startTime);
            throw error;
        }
    }

    /**
     * Generate cache key for API requests
     */
    generateCacheKey(endpoint, data) {
        return `${endpoint}_${JSON.stringify(data)}`;
    }

    /**
     * Optimize touch device performance
     */
    optimizeForTouch(evt) {
        // Reduce animation for better touch performance
        evt.from.style.willChange = 'transform';
        
        // Use hardware acceleration
        evt.item.style.transform = 'translateZ(0)';
        evt.item.style.backfaceVisibility = 'hidden';
    }

    /**
     * Optimized drag move handler
     */
    handleDragMove(evt) {
        // Use cached positions to avoid layout calculations
        if (this.itemPositions && this.itemPositions.has(evt.item)) {
            const position = this.itemPositions.get(evt.item);
            // Use position data for smooth animations
        }
    }

    /**
     * Utility: Create debounced function
     */
    debounce(func, delay) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * Utility: Create throttled function
     */
    throttle(func, limit) {
        let inThrottle;
        return (...args) => {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Log performance metrics
     */
    logPerformanceMetric(operation, duration) {
        console.log(`Performance: ${operation} took ${duration.toFixed(2)}ms`);
        
        // Send to analytics if enabled
        if (this.options.enableAnalytics) {
            this.sendPerformanceMetric(operation, duration);
        }
    }

    /**
     * Send performance metrics to analytics endpoint
     */
    async sendPerformanceMetric(operation, duration) {
        try {
            await fetch('/api/analytics/performance/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.options.csrfToken
                },
                body: JSON.stringify({
                    operation,
                    duration,
                    fps: this.performanceMetrics.fps,
                    timestamp: Date.now(),
                    user_agent: navigator.userAgent
                })
            });
        } catch (error) {
            // Silently fail analytics to not impact user experience
            console.debug('Analytics metric failed:', error);
        }
    }

    /**
     * Get performance report
     */
    getPerformanceReport() {
        return {
            ...this.performanceMetrics,
            averageDragTime: this.performanceMetrics.totalDragTime / Math.max(1, this.performanceMetrics.operations),
            cacheHitRate: this.performanceMetrics.cacheHits / Math.max(1, this.performanceMetrics.domQueryCount),
            apiSuccessRate: this.performanceMetrics.successes / Math.max(1, this.performanceMetrics.apiCallCount)
        };
    }

    /**
     * Cleanup and destroy instance
     */
    destroy() {
        // Clear timers
        if (this.batchUpdateTimer) {
            clearTimeout(this.batchUpdateTimer);
        }
        
        // Destroy sortable instances
        this.sortableInstances.forEach((instance, element) => {
            instance.destroy();
            element.removeAttribute('data-drag-initialized');
        });
        
        // Disconnect observers
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
        }
        
        // Clear caches
        this.domCache.clear();
        this.queryCache.clear();
        
        console.log('GBRDragDropOptimized destroyed');
    }

    // Utility methods
    getCSRFToken() {
        const csrfInput = document.querySelector('[name=csrfmiddlewaretoken]');
        return csrfInput ? csrfInput.value : '';
    }

    getContainerId(container) {
        return container.dataset.containerId || container.id || 'unknown';
    }

    getItemId(item) {
        return item.dataset.itemId || item.id || 'unknown';
    }

    isTouchDevice() {
        return (('ontouchstart' in window) ||
                (navigator.maxTouchPoints > 0) ||
                (navigator.msMaxTouchPoints > 0));
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GBRDragDropOptimized;
}

// Global initialization
window.GBRDragDropOptimized = GBRDragDropOptimized;
