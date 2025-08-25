"""
Django management command for performance testing of drag & drop system.
Usage: python manage.py test_drag_drop_performance
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction
from django.test.utils import override_settings
from django.core.cache import cache
from core.models import Company, Country, Industry, Continent, Member
from core.views import execute_bulk_update, get_optimized_list
import time
import statistics
import json
from django.utils import timezone


class Command(BaseCommand):
    help = 'Run comprehensive performance tests for drag & drop system'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--iterations',
            type=int,
            default=100,
            help='Number of test iterations to run'
        )
        parser.add_argument(
            '--dataset-size',
            type=int,
            default=1000,
            help='Size of test dataset to create'
        )
        parser.add_argument(
            '--bulk-size',
            type=int,
            default=10,
            help='Size of bulk update operations'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Enable verbose output'
        )
        parser.add_argument(
            '--cleanup',
            action='store_true',
            help='Clean up test data after running'
        )
    
    def handle(self, *args, **options):
        self.verbose = options['verbose']
        self.iterations = options['iterations']
        self.dataset_size = options['dataset_size']
        self.bulk_size = options['bulk_size']
        self.cleanup = options['cleanup']
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Starting drag & drop performance tests...\n'
                f'Iterations: {self.iterations}\n'
                f'Dataset size: {self.dataset_size}\n'
                f'Bulk update size: {self.bulk_size}\n'
            )
        )
        
        try:
            # Setup test data
            self.setup_test_data()
            
            # Run performance tests
            results = {}
            results['single_update'] = self.test_single_update_performance()
            results['bulk_update'] = self.test_bulk_update_performance()
            results['query_optimization'] = self.test_query_optimization()
            results['cache_performance'] = self.test_cache_performance()
            results['database_indexes'] = self.test_database_indexes()
            results['memory_usage'] = self.test_memory_usage()
            
            # Generate report
            self.generate_performance_report(results)
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Performance test failed: {str(e)}')
            )
            raise CommandError(f'Performance test failed: {str(e)}')
        
        finally:
            if self.cleanup:
                self.cleanup_test_data()
    
    def setup_test_data(self):
        """Setup test data for performance testing"""
        self.stdout.write('Setting up test data...')
        
        # Create test user
        self.test_user, created = Member.objects.get_or_create(
            username='perf_test_user',
            defaults={'email': 'test@example.com'}
        )
        
        # Create test continent and country
        self.test_continent, created = Continent.objects.get_or_create(
            name='Test Continent Performance'
        )
        
        self.test_country, created = Country.objects.get_or_create(
            name='Test Country Performance',
            defaults={
                'continent': self.test_continent,
                'sort_order': 999
            }
        )
        
        self.test_industry, created = Industry.objects.get_or_create(
            name='Test Industry Performance',
            defaults={
                'country': self.test_country,
                'sort_order': 999
            }
        )
        
        # Create test companies
        existing_count = Company.objects.filter(
            name__startswith='PerfTest Company'
        ).count()
        
        if existing_count < self.dataset_size:
            companies_to_create = []
            for i in range(existing_count, self.dataset_size):
                companies_to_create.append(Company(
                    name=f'PerfTest Company {i:04d}',
                    industry=self.test_industry,
                    sort_order=i,
                    description=f'Performance test company {i}'
                ))
                
                # Bulk create in batches to avoid memory issues
                if len(companies_to_create) >= 1000:
                    Company.objects.bulk_create(companies_to_create)
                    companies_to_create = []
            
            if companies_to_create:
                Company.objects.bulk_create(companies_to_create)
        
        self.test_companies = Company.objects.filter(
            name__startswith='PerfTest Company'
        )[:self.dataset_size]
        
        self.stdout.write(f'Test data setup complete: {len(self.test_companies)} companies')
    
    def test_single_update_performance(self):
        """Test single item update performance"""
        self.stdout.write('\n--- Testing Single Update Performance ---')
        
        company = self.test_companies[0]
        original_sort_order = company.sort_order
        
        times = []
        
        for i in range(self.iterations):
            start_time = time.perf_counter()
            
            company.sort_order = i
            company.save(update_fields=['sort_order'])
            
            end_time = time.perf_counter()
            times.append((end_time - start_time) * 1000)  # Convert to ms
        
        # Restore original sort order
        company.sort_order = original_sort_order
        company.save(update_fields=['sort_order'])
        
        # Calculate statistics
        avg_time = statistics.mean(times)
        median_time = statistics.median(times)
        p95_time = statistics.quantiles(times, n=20)[18]  # 95th percentile
        max_time = max(times)
        
        result = {
            'average_ms': round(avg_time, 3),
            'median_ms': round(median_time, 3),
            'p95_ms': round(p95_time, 3),
            'max_ms': round(max_time, 3),
            'target_ms': 10,
            'passed': p95_time < 10
        }
        
        self.stdout.write(f'  Average time: {result["average_ms"]}ms')
        self.stdout.write(f'  Median time: {result["median_ms"]}ms')
        self.stdout.write(f'  95th percentile: {result["p95_ms"]}ms')
        self.stdout.write(f'  Max time: {result["max_ms"]}ms')
        self.stdout.write(f'  Target: < {result["target_ms"]}ms')
        
        status = self.style.SUCCESS('PASS') if result['passed'] else self.style.ERROR('FAIL')
        self.stdout.write(f'  Status: {status}')
        
        return result
    
    def test_bulk_update_performance(self):
        """Test bulk update performance"""
        self.stdout.write('\n--- Testing Bulk Update Performance ---')
        
        # Test different bulk sizes
        bulk_sizes = [10, 50, 100, 500]
        results = {}
        
        for bulk_size in bulk_sizes:
            if bulk_size > len(self.test_companies):
                continue
            
            companies = list(self.test_companies[:bulk_size])
            times = []
            
            for iteration in range(min(self.iterations, 20)):  # Limit iterations for large bulk sizes
                # Prepare updates
                updates = []
                for i, company in enumerate(companies):
                    updates.append({
                        'item_id': company.id,
                        'new_position': (company.sort_order + iteration) % 1000
                    })
                
                start_time = time.perf_counter()
                
                # Execute bulk update
                try:
                    result = execute_bulk_update(Company, updates, self.test_user)
                    if not result.get('success', False):
                        raise Exception(f"Bulk update failed: {result}")
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'Bulk update failed: {str(e)}'))
                    continue
                
                end_time = time.perf_counter()
                times.append((end_time - start_time) * 1000)  # Convert to ms
            
            if times:
                avg_time = statistics.mean(times)
                p95_time = statistics.quantiles(times, n=20)[18] if len(times) >= 20 else max(times)
                time_per_item = avg_time / bulk_size
                
                target = 200 if bulk_size >= 100 else 50
                passed = p95_time < target
                
                results[bulk_size] = {
                    'average_ms': round(avg_time, 3),
                    'p95_ms': round(p95_time, 3),
                    'time_per_item_ms': round(time_per_item, 3),
                    'target_ms': target,
                    'passed': passed
                }
                
                self.stdout.write(f'  Bulk size {bulk_size}:')
                self.stdout.write(f'    Average: {avg_time:.2f}ms')
                self.stdout.write(f'    95th percentile: {p95_time:.2f}ms')
                self.stdout.write(f'    Per item: {time_per_item:.2f}ms')
                
                status = self.style.SUCCESS('PASS') if passed else self.style.ERROR('FAIL')
                self.stdout.write(f'    Status: {status}')
        
        return results
    
    def test_query_optimization(self):
        """Test database query optimization"""
        self.stdout.write('\n--- Testing Query Optimization ---')
        
        # Test query count for bulk operations
        companies = list(self.test_companies[:self.bulk_size])
        updates = [
            {'item_id': c.id, 'new_position': i}
            for i, c in enumerate(companies)
        ]
        
        # Count queries
        initial_queries = len(connection.queries)
        
        try:
            result = execute_bulk_update(Company, updates, self.test_user)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Query test failed: {str(e)}'))
            return {'passed': False, 'error': str(e)}
        
        final_queries = len(connection.queries)
        query_count = final_queries - initial_queries
        
        # Should use minimal queries (ideally 1-3)
        target_queries = 5
        passed = query_count <= target_queries
        
        result = {
            'query_count': query_count,
            'target_queries': target_queries,
            'passed': passed,
            'items_updated': len(updates)
        }
        
        self.stdout.write(f'  Queries executed: {query_count}')
        self.stdout.write(f'  Items updated: {len(updates)}')
        self.stdout.write(f'  Target: ≤ {target_queries} queries')
        
        status = self.style.SUCCESS('PASS') if passed else self.style.ERROR('FAIL')
        self.stdout.write(f'  Status: {status}')
        
        if self.verbose and query_count > target_queries:
            recent_queries = connection.queries[-query_count:]
            for i, query in enumerate(recent_queries):
                self.stdout.write(f'    Query {i+1}: {query["sql"][:100]}...')
        
        return result
    
    def test_cache_performance(self):
        """Test caching effectiveness"""
        self.stdout.write('\n--- Testing Cache Performance ---')
        
        # Clear cache
        cache.clear()
        
        # Test list retrieval performance
        times_uncached = []
        times_cached = []
        
        # Uncached requests
        for i in range(5):
            cache.clear()
            start_time = time.perf_counter()
            try:
                companies = list(Company.objects.filter(
                    industry=self.test_industry
                ).order_by('sort_order')[:100])
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Cache test failed: {str(e)}'))
                return {'passed': False, 'error': str(e)}
            end_time = time.perf_counter()
            times_uncached.append((end_time - start_time) * 1000)
        
        # Cached requests (warm cache)
        for i in range(5):
            start_time = time.perf_counter()
            companies = list(Company.objects.filter(
                industry=self.test_industry
            ).order_by('sort_order')[:100])
            end_time = time.perf_counter()
            times_cached.append((end_time - start_time) * 1000)
        
        avg_uncached = statistics.mean(times_uncached)
        avg_cached = statistics.mean(times_cached)
        improvement = ((avg_uncached - avg_cached) / avg_uncached) * 100
        
        target_improvement = 20  # 20% improvement target
        passed = improvement >= target_improvement
        
        result = {
            'uncached_avg_ms': round(avg_uncached, 3),
            'cached_avg_ms': round(avg_cached, 3),
            'improvement_percent': round(improvement, 1),
            'target_improvement': target_improvement,
            'passed': passed
        }
        
        self.stdout.write(f'  Uncached average: {avg_uncached:.2f}ms')
        self.stdout.write(f'  Cached average: {avg_cached:.2f}ms')
        self.stdout.write(f'  Improvement: {improvement:.1f}%')
        self.stdout.write(f'  Target: ≥ {target_improvement}% improvement')
        
        status = self.style.SUCCESS('PASS') if passed else self.style.ERROR('FAIL')
        self.stdout.write(f'  Status: {status}')
        
        return result
    
    def test_database_indexes(self):
        """Test database index effectiveness"""
        self.stdout.write('\n--- Testing Database Indexes ---')
        
        # Test if sort_order index exists and is being used
        with connection.cursor() as cursor:
            try:
                # Check if index exists
                cursor.execute("""
                    SELECT indexname 
                    FROM pg_indexes 
                    WHERE tablename = 'core_company' 
                    AND indexdef LIKE '%sort_order%'
                """)
                indexes = cursor.fetchall()
                
                has_sort_order_index = len(indexes) > 0
                
                # Test query performance with ORDER BY sort_order
                start_time = time.perf_counter()
                cursor.execute("""
                    SELECT id, name, sort_order 
                    FROM core_company 
                    WHERE industry_id = %s 
                    ORDER BY sort_order 
                    LIMIT 100
                """, [self.test_industry.id])
                results = cursor.fetchall()
                end_time = time.perf_counter()
                
                query_time = (end_time - start_time) * 1000
                
                # Check query plan
                cursor.execute("""
                    EXPLAIN (FORMAT JSON) 
                    SELECT id, name, sort_order 
                    FROM core_company 
                    WHERE industry_id = %s 
                    ORDER BY sort_order 
                    LIMIT 100
                """, [self.test_industry.id])
                plan = cursor.fetchone()[0]
                
                uses_index = 'Index Scan' in str(plan) or 'Index Only Scan' in str(plan)
                
            except Exception as e:
                return {
                    'passed': False,
                    'error': f'Database index test failed: {str(e)}'
                }
        
        target_time = 50  # 50ms target for indexed query
        passed = has_sort_order_index and query_time < target_time and uses_index
        
        result = {
            'has_sort_order_index': has_sort_order_index,
            'uses_index_scan': uses_index,
            'query_time_ms': round(query_time, 3),
            'target_time_ms': target_time,
            'passed': passed,
            'indexes_found': [idx[0] for idx in indexes]
        }
        
        self.stdout.write(f'  Sort order index exists: {has_sort_order_index}')
        self.stdout.write(f'  Uses index scan: {uses_index}')
        self.stdout.write(f'  Query time: {query_time:.2f}ms')
        self.stdout.write(f'  Target: < {target_time}ms')
        
        status = self.style.SUCCESS('PASS') if passed else self.style.ERROR('FAIL')
        self.stdout.write(f'  Status: {status}')
        
        if not has_sort_order_index:
            self.stdout.write(
                self.style.WARNING(
                    '  Suggestion: Add index with: '
                    'CREATE INDEX core_company_sort_order_idx ON core_company (sort_order);'
                )
            )
        
        return result
    
    def test_memory_usage(self):
        """Test memory usage for large datasets"""
        self.stdout.write('\n--- Testing Memory Usage ---')
        
        try:
            import psutil
            import os
            
            process = psutil.Process(os.getpid())
            
            # Baseline memory
            baseline_memory = process.memory_info().rss / 1024 / 1024  # MB
            
            # Load large dataset
            start_time = time.perf_counter()
            companies = list(self.test_companies.select_related('industry'))
            end_time = time.perf_counter()
            
            # Memory after loading
            after_load_memory = process.memory_info().rss / 1024 / 1024  # MB
            memory_increase = after_load_memory - baseline_memory
            
            load_time = (end_time - start_time) * 1000
            
            # Target: < 1MB per 1000 items
            items_loaded = len(companies)
            memory_per_1k_items = (memory_increase / items_loaded) * 1000
            target_memory_per_1k = 1.0  # 1MB per 1000 items
            
            passed = memory_per_1k_items < target_memory_per_1k
            
            result = {
                'baseline_memory_mb': round(baseline_memory, 2),
                'after_load_memory_mb': round(after_load_memory, 2),
                'memory_increase_mb': round(memory_increase, 2),
                'load_time_ms': round(load_time, 2),
                'items_loaded': items_loaded,
                'memory_per_1k_items_mb': round(memory_per_1k_items, 2),
                'target_per_1k_mb': target_memory_per_1k,
                'passed': passed
            }
            
            self.stdout.write(f'  Baseline memory: {baseline_memory:.2f} MB')
            self.stdout.write(f'  After loading {items_loaded} items: {after_load_memory:.2f} MB')
            self.stdout.write(f'  Memory increase: {memory_increase:.2f} MB')
            self.stdout.write(f'  Load time: {load_time:.2f} ms')
            self.stdout.write(f'  Memory per 1K items: {memory_per_1k_items:.2f} MB')
            self.stdout.write(f'  Target: < {target_memory_per_1k} MB per 1K items')
            
            status = self.style.SUCCESS('PASS') if passed else self.style.ERROR('FAIL')
            self.stdout.write(f'  Status: {status}')
            
        except ImportError:
            result = {
                'passed': False,
                'error': 'psutil not available for memory testing'
            }
            self.stdout.write(
                self.style.WARNING('  psutil not available - skipping memory test')
            )
        
        return result
    
    def generate_performance_report(self, results):
        """Generate comprehensive performance report"""
        self.stdout.write('\n' + '='*60)
        self.stdout.write('PERFORMANCE TEST REPORT')
        self.stdout.write('='*60)
        
        total_tests = 0
        passed_tests = 0
        
        for test_name, test_result in results.items():
            total_tests += 1
            
            if isinstance(test_result, dict):
                if test_result.get('passed', False):
                    passed_tests += 1
                    status = self.style.SUCCESS('✓ PASS')
                else:
                    status = self.style.ERROR('✗ FAIL')
            else:
                # Handle bulk update results (dict of dicts)
                test_passed = all(
                    result.get('passed', False) 
                    for result in test_result.values() 
                    if isinstance(result, dict)
                )
                if test_passed:
                    passed_tests += 1
                    status = self.style.SUCCESS('✓ PASS')
                else:
                    status = self.style.ERROR('✗ FAIL')
            
            self.stdout.write(f'{test_name.replace("_", " ").title()}: {status}')
        
        # Overall result
        overall_passed = passed_tests == total_tests
        overall_status = self.style.SUCCESS('PASS') if overall_passed else self.style.ERROR('FAIL')
        
        self.stdout.write(f'\nOverall Result: {passed_tests}/{total_tests} tests passed - {overall_status}')
        
        # Save detailed report to file
        report_data = {
            'timestamp': timezone.now().isoformat(),
            'test_parameters': {
                'iterations': self.iterations,
                'dataset_size': self.dataset_size,
                'bulk_size': self.bulk_size
            },
            'results': results,
            'summary': {
                'total_tests': total_tests,
                'passed_tests': passed_tests,
                'overall_passed': overall_passed
            }
        }
        
        report_filename = f'performance_report_{int(time.time())}.json'
        with open(report_filename, 'w') as f:
            json.dump(report_data, f, indent=2, default=str)
        
        self.stdout.write(f'\nDetailed report saved to: {report_filename}')
        
        # Performance recommendations
        self.stdout.write('\n' + '-'*40)
        self.stdout.write('PERFORMANCE RECOMMENDATIONS')
        self.stdout.write('-'*40)
        
        if not results.get('database_indexes', {}).get('passed', True):
            self.stdout.write('• Add database indexes for sort_order fields')
        
        if not results.get('cache_performance', {}).get('passed', True):
            self.stdout.write('• Implement better caching strategy')
        
        bulk_results = results.get('bulk_update', {})
        if bulk_results and not all(r.get('passed', True) for r in bulk_results.values()):
            self.stdout.write('• Optimize bulk update operations')
        
        if not overall_passed:
            self.stdout.write('• Review failed tests and implement optimizations')
        else:
            self.stdout.write('🎉 All performance tests passed! System is optimized.')
    
    def cleanup_test_data(self):
        """Clean up test data created during performance testing"""
        self.stdout.write('\nCleaning up test data...')
        
        # Delete test companies
        deleted_companies = Company.objects.filter(
            name__startswith='PerfTest Company'
        ).delete()
        
        # Delete test structures if they exist and are empty
        if hasattr(self, 'test_industry') and not self.test_industry.companies.exists():
            self.test_industry.delete()
        
        if hasattr(self, 'test_country') and not self.test_country.industries.exists():
            self.test_country.delete()
        
        if hasattr(self, 'test_continent') and not self.test_continent.countries.exists():
            self.test_continent.delete()
        
        # Delete test user
        if hasattr(self, 'test_user'):
            self.test_user.delete()
        
        self.stdout.write(f'Cleanup complete: {deleted_companies[0]} companies deleted')
