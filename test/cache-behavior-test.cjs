const http = require('http');

console.log('🔄 Testing Caching Behavior...\n');

const BACKEND_API = 'http://localhost:3001';

// HTTP request helper
function httpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({ status: res.statusCode, data: data, headers: res.headers });
            });
        });
        req.on('error', reject);
        req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        req.end();
    });
}

// Test caching headers
async function testCacheHeaders() {
    console.log('🧪 Testing Cache Headers...');

    try {
        const response = await httpRequest(`${BACKEND_API}/health`);
        console.log('Response headers:', response.headers);

        // Check for cache-control headers
        const cacheControl = response.headers['cache-control'];
        const etag = response.headers['etag'];
        const lastModified = response.headers['last-modified'];

        console.log(`   Cache-Control: ${cacheControl || 'Not set'}`);
        console.log(`   ETag: ${etag || 'Not set'}`);
        console.log(`   Last-Modified: ${lastModified || 'Not set'}`);

        if (cacheControl) {
            console.log('   ✅ Cache-Control header present');
        } else {
            console.log('   ⚠️  No Cache-Control header');
        }

        if (etag) {
            console.log('   ✅ ETag header present - can be used for validation');
        } else {
            console.log('   ⚠️  No ETag header');
        }

    } catch (error) {
        console.error('❌ Cache header test failed:', error.message);
    }
}

// Test conditional requests
async function testConditionalRequests() {
    console.log('\n🧪 Testing Conditional Requests (If-None-Match)...');

    try {
        // First request to get ETag
        const firstResponse = await httpRequest(`${BACKEND_API}/health`);
        const etag = firstResponse.headers['etag'];

        if (!etag) {
            console.log('   ⚠️  No ETag available for conditional testing');
            return;
        }

        console.log(`   First request ETag: ${etag}`);

        // Second request with If-None-Match header
        const secondResponse = await httpRequest(`${BACKEND_API}/health`, {
            headers: {
                'If-None-Match': etag
            }
        });

        console.log(`   Second response status: ${secondResponse.status}`);

        if (secondResponse.status === 304) {
            console.log('   ✅ 304 Not Modified - proper caching behavior');
        } else if (secondResponse.status === 200) {
            console.log('   ⚠️  200 OK - resource was modified or server doesn\'t support conditional requests');
        } else {
            console.log(`   ❓ Unexpected status: ${secondResponse.status}`);
        }

    } catch (error) {
        console.error('❌ Conditional request test failed:', error.message);
    }
}

// Test response time consistency (cache indicator)
async function testResponseTimeConsistency() {
    console.log('\n🧪 Testing Response Time Consistency...');

    const requestCount = 5;
    const times = [];

    for (let i = 0; i < requestCount; i++) {
        const start = Date.now();
        await httpRequest(`${BACKEND_API}/health`);
        const duration = Date.now() - start;
        times.push(duration);
        console.log(`   Request ${i + 1}: ${duration}ms`);

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const variance = times.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / times.length;
    const stdDev = Math.sqrt(variance);

    console.log(`   Average response time: ${avgTime.toFixed(1)}ms`);
    console.log(`   Standard deviation: ${stdDev.toFixed(1)}ms`);

    if (stdDev < avgTime * 0.3) {
        console.log('   ✅ Response times are consistent (possible caching)');
    } else {
        console.log('   ⚠️  Response times vary significantly (no caching or variable load)');
    }
}

// Test different endpoints for caching behavior
async function testMultipleEndpoints() {
    console.log('\n🧪 Testing Multiple Endpoints...');

    const endpoints = [
        '/health',
        '/api/contract/health'
    ];

    for (const endpoint of endpoints) {
        try {
            console.log(`   Testing ${endpoint}...`);
            const response = await httpRequest(`${BACKEND_API}${endpoint}`);
            const cacheControl = response.headers['cache-control'];
            const etag = response.headers['etag'];

            console.log(`     Cache-Control: ${cacheControl || 'Not set'}`);
            console.log(`     ETag: ${etag || 'Not set'}`);
        } catch (error) {
            console.error(`     ❌ Error testing ${endpoint}:`, error.message);
        }
    }
}

// Run all cache tests
async function runCacheTests() {
    try {
        await testCacheHeaders();
        await testConditionalRequests();
        await testResponseTimeConsistency();
        await testMultipleEndpoints();

        console.log('\n🎯 Cache Testing Complete!');
        console.log('===============================');
        console.log('📊 Cache behavior analysis:');
        console.log('   - Headers checked for cache directives');
        console.log('   - Conditional requests tested');
        console.log('   - Response time consistency analyzed');
        console.log('   - Multiple endpoints evaluated');

    } catch (error) {
        console.error('💥 Cache test suite failed:', error);
    }
}

// Run the cache tests
runCacheTests();