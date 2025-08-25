# Performance Testing Guidelines and Benchmarks
## GBR Drag & Drop System Optimization

### Performance Targets

#### JavaScript Performance Benchmarks
- **Drag Operation Latency**: < 50ms per operation
- **Initial Load Time**: < 200ms for lists up to 100 items
- **Frame Rate**: Maintain 60fps during drag operations
- **Memory Usage**: < 10MB additional heap per 1000 items
- **Network Requests**: Batch into groups of 10+ operations

#### Database Performance Benchmarks
- **Single Update**: < 10ms
- **Bulk Update (10 items)**: < 50ms
- **Bulk Update (100 items)**: < 200ms
- **Cache Hit Rate**: > 80% for repeated operations
- **Query Optimization**: Use single bulk queries instead of loops

#### CSS Animation Benchmarks
- **Animation Frame Rate**: 60fps for all transitions
- **Paint Operations**: < 5ms per frame
- **Layout Thrashing**: Zero layout recalculations during drag
- **Hardware Acceleration**: Use GPU for all transform operations

### Testing Methodology

#### 1. Frontend Performance Testing

```javascript
// Test drag operation performance
async function testDragPerformance(iterations = 100) {
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        // Simulate drag operation
        await simulateDragOperation();
        
        const endTime = performance.now();
        results.push(endTime - startTime);
    }
    
    const average = results.reduce((a, b) => a + b) / results.length;
    const p95 = results.sort()[Math.floor(results.length * 0.95)];
    
    console.log(`Drag Performance Results:
        Average: ${average.toFixed(2)}ms
        95th Percentile: ${p95.toFixed(2)}ms
        Target: < 50ms`);
    
    return { average, p95, passed: p95 < 50 };
}

// Test virtual scrolling performance
function testVirtualScrolling(itemCount = 1000) {
    const container = document.createElement('div');
    container.style.height = '400px';
    container.style.overflow = 'auto';
    
    // Create virtual list
    const virtualList = new VirtualList(container, {
        itemHeight: 60,
        itemCount: itemCount
    });
    
    const startTime = performance.now();
    
    // Test scroll performance
    for (let i = 0; i < 100; i++) {
        container.scrollTop = Math.random() * (itemCount * 60);
        virtualList.updateVisibleItems();
    }
    
    const endTime = performance.now();
    const averageTime = (endTime - startTime) / 100;
    
    console.log(`Virtual Scrolling Performance:
        Average update time: ${averageTime.toFixed(2)}ms
        Target: < 16ms (60fps)`);
    
    return { averageTime, passed: averageTime < 16 };
}

// Test memory usage
function testMemoryUsage() {
    if (!performance.memory) {
        console.log('Memory API not available');
        return;
    }
    
    const initial = performance.memory.usedJSHeapSize;
    
    // Create large dataset
    const items = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        description: `Description for item ${i}`
    }));
    
    // Initialize drag drop with large dataset
    const dragDrop = new GBRDragDropOptimized({
        items: items
    });
    
    const final = performance.memory.usedJSHeapSize;
    const increase = (final - initial) / (1024 * 1024); // MB
    
    console.log(`Memory Usage Test:
        Initial: ${(initial / 1024 / 1024).toFixed(2)} MB
        Final: ${(final / 1024 / 1024).toFixed(2)} MB
        Increase: ${increase.toFixed(2)} MB
        Target: < 10 MB per 1000 items`);
    
    dragDrop.destroy();
    
    return { increase, passed: increase < 10 };
}
```

#### 2. Backend Performance Testing

```python
# Django management command: python manage.py test_performance

from django.core.management.base import BaseCommand
from django.test import TestCase
from django.db import connection
from django.test.utils import override_settings
import time
from core.models import Company, Country, Industry
from core.views import bulk_update_order

class PerformanceTestCommand(BaseCommand):
    help = 'Run performance tests for drag & drop system'
    
    def handle(self, *args, **options):
        self.test_single_update_performance()
        self.test_bulk_update_performance()
        self.test_query_optimization()
        self.test_cache_performance()
    
    def test_single_update_performance(self):
        """Test single item update performance"""
        company = Company.objects.first()
        
        start_time = time.time()
        for i in range(100):
            company.sort_order = i
            company.save(update_fields=['sort_order'])
        end_time = time.time()
        
        average_time = (end_time - start_time) * 1000 / 100  # ms
        
        self.stdout.write(f"Single Update Performance:")
        self.stdout.write(f"  Average time: {average_time:.2f}ms")
        self.stdout.write(f"  Target: < 10ms")
        self.stdout.write(f"  Status: {'PASS' if average_time < 10 else 'FAIL'}")
    
    def test_bulk_update_performance(self):
        """Test bulk update performance"""
        companies = Company.objects.all()[:100]
        
        # Test bulk update
        start_time = time.time()
        updates = [{'item_id': c.id, 'new_position': i} for i, c in enumerate(companies)]
        execute_bulk_update(Company, updates, None)
        end_time = time.time()
        
        bulk_time = (end_time - start_time) * 1000  # ms
        
        self.stdout.write(f"Bulk Update Performance (100 items):")
        self.stdout.write(f"  Total time: {bulk_time:.2f}ms")
        self.stdout.write(f"  Time per item: {bulk_time/100:.2f}ms")
        self.stdout.write(f"  Target: < 200ms total")
        self.stdout.write(f"  Status: {'PASS' if bulk_time < 200 else 'FAIL'}")
    
    def test_query_optimization(self):
        """Test query count optimization"""
        with self.assertNumQueries(1):  # Should use only 1 query for bulk update
            companies = Company.objects.all()[:10]
            updates = [{'item_id': c.id, 'new_position': i} for i, c in enumerate(companies)]
            execute_bulk_update(Company, updates, None)
    
    def test_cache_performance(self):
        """Test caching effectiveness"""
        from django.core.cache import cache
        
        # Clear cache
        cache.clear()
        
        # First request (cache miss)
        start_time = time.time()
        companies = get_optimized_list('companies')
        first_time = (time.time() - start_time) * 1000
        
        # Second request (cache hit)
        start_time = time.time()
        companies = get_optimized_list('companies')
        second_time = (time.time() - start_time) * 1000
        
        improvement = ((first_time - second_time) / first_time) * 100
        
        self.stdout.write(f"Cache Performance:")
        self.stdout.write(f"  First request: {first_time:.2f}ms")
        self.stdout.write(f"  Cached request: {second_time:.2f}ms")
        self.stdout.write(f"  Improvement: {improvement:.1f}%")
        self.stdout.write(f"  Target: > 50% improvement")
        self.stdout.write(f"  Status: {'PASS' if improvement > 50 else 'FAIL'}")
```

#### 3. Database Optimization Testing

```python
# Test database query optimization
def test_database_optimization():
    from django.db import connection
    from django.test.utils import override_settings
    
    # Test query count for bulk operations
    with connection.cursor() as cursor:
        cursor.execute("EXPLAIN ANALYZE SELECT * FROM core_company ORDER BY sort_order")
        result = cursor.fetchall()
        print("Query plan for ordered list:", result)
    
    # Test index usage
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
            FROM pg_stat_user_indexes 
            WHERE tablename LIKE 'core_%'
            ORDER BY idx_scan DESC
        """)
        results = cursor.fetchall()
        print("Index usage statistics:", results)

# Add database indexes for optimization
class Migration(migrations.Migration):
    operations = [
        migrations.RunSQL(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS core_company_sort_order_idx ON core_company (sort_order);",
            reverse_sql="DROP INDEX IF EXISTS core_company_sort_order_idx;"
        ),
        migrations.RunSQL(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS core_country_sort_order_idx ON core_country (sort_order);",
            reverse_sql="DROP INDEX IF EXISTS core_country_sort_order_idx;"
        ),
        migrations.RunSQL(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS core_industry_sort_order_idx ON core_industry (sort_order);",
            reverse_sql="DROP INDEX IF EXISTS core_industry_sort_order_idx;"
        ),
    ]
```

### Performance Monitoring Setup

#### 1. Client-Side Monitoring

```javascript
// Real-time performance monitoring
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            dragOperations: [],
            apiCalls: [],
            frameRates: [],
            memoryUsage: []
        };
        
        this.startMonitoring();
    }
    
    startMonitoring() {
        // Monitor frame rate
        this.monitorFrameRate();
        
        // Monitor memory usage
        setInterval(() => this.recordMemoryUsage(), 10000);
        
        // Monitor network performance
        this.monitorNetworkPerformance();
    }
    
    monitorFrameRate() {
        let lastTime = performance.now();
        let frameCount = 0;
        
        const countFrames = () => {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
                const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                this.metrics.frameRates.push({ timestamp: currentTime, fps });
                
                // Keep only last 60 seconds of data
                this.metrics.frameRates = this.metrics.frameRates.slice(-60);
                
                frameCount = 0;
                lastTime = currentTime;
                
                // Alert if FPS drops below 30
                if (fps < 30) {
                    console.warn(`Low FPS detected: ${fps}`);
                }
            }
            
            requestAnimationFrame(countFrames);
        };
        
        requestAnimationFrame(countFrames);
    }
    
    recordDragOperation(duration) {
        this.metrics.dragOperations.push({
            timestamp: performance.now(),
            duration: duration
        });
        
        // Keep only last 100 operations
        this.metrics.dragOperations = this.metrics.dragOperations.slice(-100);
        
        // Alert if operation is slow
        if (duration > 100) {
            console.warn(`Slow drag operation: ${duration}ms`);
        }
    }
    
    recordApiCall(endpoint, duration, success) {
        this.metrics.apiCalls.push({
            timestamp: performance.now(),
            endpoint: endpoint,
            duration: duration,
            success: success
        });
        
        // Keep only last 100 API calls
        this.metrics.apiCalls = this.metrics.apiCalls.slice(-100);
    }
    
    recordMemoryUsage() {
        if (performance.memory) {
            this.metrics.memoryUsage.push({
                timestamp: performance.now(),
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize
            });
            
            // Keep only last hour of data
            this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-360);
        }
    }
    
    getReport() {
        const dragOps = this.metrics.dragOperations;
        const apiCalls = this.metrics.apiCalls;
        const frames = this.metrics.frameRates;
        
        return {
            dragPerformance: {
                averageTime: dragOps.reduce((sum, op) => sum + op.duration, 0) / dragOps.length || 0,
                slowOperations: dragOps.filter(op => op.duration > 100).length,
                totalOperations: dragOps.length
            },
            apiPerformance: {
                averageTime: apiCalls.reduce((sum, call) => sum + call.duration, 0) / apiCalls.length || 0,
                successRate: (apiCalls.filter(call => call.success).length / apiCalls.length) * 100 || 0,
                totalCalls: apiCalls.length
            },
            frameRate: {
                average: frames.reduce((sum, frame) => sum + frame.fps, 0) / frames.length || 0,
                minimum: Math.min(...frames.map(f => f.fps)) || 0,
                droppedFrames: frames.filter(f => f.fps < 30).length
            },
            memoryUsage: {
                current: this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1]?.used || 0,
                peak: Math.max(...this.metrics.memoryUsage.map(m => m.used)) || 0,
                trend: this.calculateMemoryTrend()
            }
        };
    }
}

// Initialize performance monitoring
const performanceMonitor = new PerformanceMonitor();
window.performanceMonitor = performanceMonitor;
```

#### 2. Server-Side Monitoring

```python
# Django middleware for performance monitoring
class DragDropPerformanceMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        start_time = time.time()
        
        response = self.get_response(request)
        
        # Monitor drag & drop API endpoints
        if request.path.startswith('/api/') and 'update-order' in request.path:
            duration = (time.time() - start_time) * 1000  # ms
            
            # Log slow operations
            if duration > 100:
                logger.warning(f"Slow API operation: {request.path} took {duration:.2f}ms")
            
            # Store metrics
            cache.set(f"api_perf_{request.user.id}_{int(time.time())}", {
                'endpoint': request.path,
                'duration': duration,
                'status': response.status_code,
                'user': request.user.id if request.user.is_authenticated else None
            }, 3600)
        
        return response
```

### Load Testing Scenarios

#### 1. Concurrent Users Test

```bash
# Using Apache Bench for load testing
ab -n 1000 -c 10 -H "Content-Type: application/json" \
   -p test_data.json \
   http://localhost:8000/api/bulk-update-order/

# Using Artillery for more complex scenarios
artillery quick --count 10 --num 100 http://localhost:8000/api/update-order/
```

#### 2. Large Dataset Test

```python
# Test with large datasets
def test_large_dataset_performance():
    # Create test data
    companies = []
    for i in range(10000):
        companies.append(Company(
            name=f"Company {i}",
            sort_order=i,
            industry_id=1
        ))
    
    Company.objects.bulk_create(companies)
    
    # Test performance with large dataset
    start_time = time.time()
    updates = [{'item_id': i, 'new_position': 9999-i} for i in range(1, 1001)]
    execute_bulk_update(Company, updates, None)
    end_time = time.time()
    
    performance_per_item = ((end_time - start_time) * 1000) / 1000
    print(f"Large dataset performance: {performance_per_item:.2f}ms per item")
```

### Performance Optimization Checklist

#### Frontend Optimizations
- ✅ Debounce rapid drag operations
- ✅ Implement virtual scrolling for 100+ items
- ✅ Use hardware acceleration (translateZ(0))
- ✅ Optimize DOM queries with caching
- ✅ Implement lazy loading for large lists
- ✅ Use passive event listeners
- ✅ Batch DOM updates with requestAnimationFrame
- ✅ Minimize repaints and layout operations

#### Backend Optimizations
- ✅ Implement bulk update operations
- ✅ Use database indexes on sort_order fields
- ✅ Add query result caching
- ✅ Optimize API response size
- ✅ Implement rate limiting
- ✅ Use select_related/prefetch_related
- ✅ Database connection pooling
- ✅ Background task processing

#### Database Optimizations
- ✅ Add indexes: `CREATE INDEX ON core_company (sort_order)`
- ✅ Use bulk operations: `bulk_update()` instead of loops
- ✅ Optimize query plans: `EXPLAIN ANALYZE`
- ✅ Connection pooling configuration
- ✅ Read replicas for reporting queries

### Monitoring and Alerting

#### Performance Alerts
- Drag operation > 100ms
- API response time > 200ms
- Frame rate < 30 FPS
- Memory usage > 50MB increase
- Cache hit rate < 70%
- Error rate > 5%

#### Monitoring Dashboard Metrics
- Average drag operation time
- API response times (P50, P95, P99)
- Frame rate trends
- Memory usage patterns
- Database query performance
- Cache hit rates
- User interaction patterns

This comprehensive performance optimization ensures your drag & drop system can handle large datasets while maintaining smooth 60fps interactions and sub-100ms response times.
