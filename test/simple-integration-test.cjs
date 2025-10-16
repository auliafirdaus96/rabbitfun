const http = require('http');
const WebSocket = require('ws');

console.log('🚀 Starting Simple Integration Tests...\n');

const BACKEND_API = 'http://localhost:3001';
const WEBSOCKET_URL = 'ws://localhost:8081';

let testResults = {
    api: { passed: 0, failed: 0 },
    websocket: { passed: 0, failed: 0 },
    integration: { passed: 0, failed: 0 }
};

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

// Test helper
function test(name, category, testFn) {
    console.log(`🧪 [${category.toUpperCase()}] ${name}`);
    return testFn()
        .then(() => {
            console.log(`✅ [${category.toUpperCase()}] ${name} - PASSED\n`);
            testResults[category].passed++;
        })
        .catch((error) => {
            console.log(`❌ [${category.toUpperCase()}] ${name} - FAILED: ${error.message}\n`);
            testResults[category].failed++;
        });
}

// Test Backend API
async function testBackendAPI() {
    console.log('📡 Testing Backend API...\n');

    await test('Backend Health Check', 'api', async () => {
        const response = await httpRequest(`${BACKEND_API}/health`);
        const data = JSON.parse(response.data);
        if (data.status !== 'OK') throw new Error('Invalid health status');
    });

    await test('Contract Health Check', 'api', async () => {
        const response = await httpRequest(`${BACKEND_API}/api/contract/health`);
        const data = JSON.parse(response.data);
        if (!data.features) throw new Error('Missing features in response');
    });

    await test('API Response Time', 'api', async () => {
        const start = Date.now();
        const response = await httpRequest(`${BACKEND_API}/health`);
        const responseTime = Date.now() - start;
        if (responseTime > 1000) throw new Error(`Slow response: ${responseTime}ms`);
        console.log(`   ⏱️  Response time: ${responseTime}ms`);
    });
}

// Test WebSocket
async function testWebSocket() {
    console.log('🔌 Testing WebSocket...\n');

    await test('WebSocket Connection', 'websocket', () => {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(WEBSOCKET_URL);
            let connected = false;

            const timeout = setTimeout(() => {
                if (!connected) reject(new Error('Connection timeout'));
            }, 5000);

            ws.on('open', () => {
                connected = true;
                clearTimeout(timeout);
                ws.close();
                resolve();
            });

            ws.on('error', reject);
        });
    });

    await test('Message Echo', 'websocket', () => {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(WEBSOCKET_URL);
            const testMessage = JSON.stringify({ type: 'test', data: 'echo test' });
            let receivedEcho = false;

            const timeout = setTimeout(() => {
                if (!receivedEcho) reject(new Error('Echo timeout'));
            }, 3000);

            ws.on('open', () => {
                ws.send(testMessage);
            });

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    if (message.type === 'echo' && message.data.originalMessage.data === 'echo test') {
                        receivedEcho = true;
                        clearTimeout(timeout);
                        ws.close();
                        resolve();
                    }
                } catch (error) {
                    reject(error);
                }
            });

            ws.on('error', reject);
        });
    });

    await test('Multiple Connections', 'websocket', () => {
        return new Promise((resolve, reject) => {
            const connections = [];
            let connectedCount = 0;
            const targetConnections = 3;

            for (let i = 0; i < targetConnections; i++) {
                const ws = new WebSocket(WEBSOCKET_URL);
                connections.push(ws);

                ws.on('open', () => {
                    connectedCount++;
                    if (connectedCount === targetConnections) {
                        connections.forEach(ws => ws.close());
                        console.log(`   🔗 ${targetConnections} simultaneous connections`);
                        resolve();
                    }
                });

                ws.on('error', reject);
            }
        });
    });
}

// Test Integration
async function testIntegration() {
    console.log('🔗 Testing Integration...\n');

    await test('API + WebSocket Coordination', 'integration', async () => {
        const [apiResult, wsConnection] = await Promise.all([
            httpRequest(`${BACKEND_API}/health`),
            new Promise((resolve, reject) => {
                const ws = new WebSocket(WEBSOCKET_URL);
                ws.on('open', () => {
                    ws.close();
                    resolve();
                });
                ws.on('error', reject);
            })
        ]);

        const apiData = JSON.parse(apiResult.data);
        if (apiData.status !== 'OK') {
            throw new Error('API not healthy');
        }
    });

    await test('Real-time Update Simulation', 'integration', () => {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(WEBSOCKET_URL);
            let updateReceived = false;

            ws.on('open', () => {
                const tokenUpdate = {
                    type: 'token_update',
                    data: {
                        tokenAddress: '0x1234567890123456789012345678901234567890',
                        price: '0.00123456',
                        volume: '1000',
                        timestamp: new Date().toISOString()
                    }
                };

                ws.send(JSON.stringify(tokenUpdate));

                setTimeout(() => {
                    if (!updateReceived) {
                        ws.close();
                        reject(new Error('Update not echoed back'));
                    }
                }, 2000);
            });

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    if (message.type === 'echo' && message.data.originalMessage.type === 'token_update') {
                        updateReceived = true;
                        ws.close();
                        resolve();
                    }
                } catch (error) {
                    reject(error);
                }
            });

            ws.on('error', reject);
        });
    });

    await test('Error Handling', 'integration', async () => {
        try {
            const response = await httpRequest(`${BACKEND_API}/nonexistent-endpoint`);
            if (response.status !== 404) {
                throw new Error(`Expected 404, got ${response.status}`);
            }
        } catch (error) {
            // This is expected - timeout
            throw error;
        }
    }).catch(error => {
        if (error.message.includes('404')) {
            console.log(`   ⚠️  Proper 404 error handling`);
            return; // Test passed
        }
        throw error;
    });
}

// Performance Tests
async function testPerformance() {
    console.log('⚡ Testing Performance...\n');

    await test('Concurrent API Requests', 'api', async () => {
        const requests = Array(5).fill().map(() => httpRequest(`${BACKEND_API}/health`));
        const start = Date.now();
        const results = await Promise.all(requests);
        const duration = Date.now() - start;

        if (duration > 3000) throw new Error(`Too slow: ${duration}ms for 5 requests`);
        console.log(`   🚀 5 concurrent requests in ${duration}ms (${(duration/5).toFixed(0)}ms avg)`);
    });

    await test('WebSocket Throughput', 'websocket', () => {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(WEBSOCKET_URL);
            let messagesSent = 0;
            let messagesReceived = 0;
            const targetMessages = 10;

            ws.on('open', () => {
                const interval = setInterval(() => {
                    if (messagesSent < targetMessages) {
                        const message = {
                            type: 'throughput_test',
                            index: messagesSent,
                            timestamp: Date.now()
                        };
                        ws.send(JSON.stringify(message));
                        messagesSent++;
                    } else {
                        clearInterval(interval);
                    }
                }, 50);
            });

            ws.on('message', (data) => {
                messagesReceived++;
                if (messagesReceived === targetMessages) {
                    ws.close();
                    console.log(`   📨 ${targetMessages} messages exchanged`);
                    resolve();
                }
            });

            ws.on('error', reject);

            setTimeout(() => {
                if (messagesReceived < targetMessages) {
                    ws.close();
                    reject(new Error(`Only ${messagesReceived}/${targetMessages} messages received`));
                }
            }, 5000);
        });
    });
}

// Reliability Tests
async function testReliability() {
    console.log('🛡️ Testing Reliability...\n');

    await test('WebSocket Reconnection', 'websocket', () => {
        return new Promise((resolve, reject) => {
            let connectionCount = 0;
            const targetConnections = 3;

            const testConnection = () => {
                const ws = new WebSocket(WEBSOCKET_URL);

                ws.on('open', () => {
                    connectionCount++;
                    console.log(`   🔄 Connection ${connectionCount}/${targetConnections} established`);

                    ws.close();

                    if (connectionCount < targetConnections) {
                        setTimeout(testConnection, 100);
                    } else {
                        resolve();
                    }
                });

                ws.on('error', reject);
            };

            testConnection();
        });
    });
}

// Run all tests
async function runTests() {
    try {
        await testBackendAPI();
        await testWebSocket();
        await testIntegration();
        await testPerformance();
        await testReliability();

        console.log('🎯 Test Results Summary:');
        console.log('========================');

        Object.entries(testResults).forEach(([category, results]) => {
            const total = results.passed + results.failed;
            const percentage = total > 0 ? ((results.passed / total) * 100).toFixed(1) : '0.0';
            console.log(`${category.toUpperCase()}: ${results.passed}/${total} (${percentage}%)`);
        });

        const totalPassed = Object.values(testResults).reduce((sum, cat) => sum + cat.passed, 0);
        const totalFailed = Object.values(testResults).reduce((sum, cat) => sum + cat.failed, 0);
        const totalTests = totalPassed + totalFailed;
        const successRate = ((totalPassed / totalTests) * 100).toFixed(1);

        console.log(`\n🎉 Overall Success Rate: ${successRate}% (${totalPassed}/${totalTests} tests passed)`);

        if (totalFailed === 0) {
            console.log('\n✅ All tests PASSED!');
            console.log('🚀 System is ready for production!');
        } else {
            console.log('\n⚠️  Some tests failed. Review the issues above.');
        }

    } catch (error) {
        console.error('💥 Test suite failed:', error);
        process.exit(1);
    }
}

// Run the tests
runTests();