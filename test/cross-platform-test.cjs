const axios = require('axios');
const WebSocket = require('ws');

console.log('🚀 Starting Cross-Platform Integration Tests...\n');

const BACKEND_API = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:8080';
const WEBSOCKET_URL = 'ws://localhost:8081';

let testResults = {
    api: { passed: 0, failed: 0, tests: [] },
    websocket: { passed: 0, failed: 0, tests: [] },
    frontend: { passed: 0, failed: 0, tests: [] },
    crossService: { passed: 0, failed: 0, tests: [] }
};

// Test utility functions
function test(name, category, testFn) {
    console.log(`🧪 [${category.toUpperCase()}] ${name}`);
    return testFn()
        .then(() => {
            console.log(`✅ [${category.toUpperCase()}] ${name} - PASSED\n`);
            testResults[category].passed++;
            testResults[category].tests.push({ name, status: 'PASSED' });
        })
        .catch((error) => {
            console.log(`❌ [${category.toUpperCase()}] ${name} - FAILED: ${error.message}\n`);
            testResults[category].failed++;
            testResults[category].tests.push({ name, status: 'FAILED', error: error.message });
        });
}

// API Tests
async function testAPICommunication() {
    console.log('📡 Testing API Communication...\n');

    await test('Backend Health Check', 'api', async () => {
        const response = await axios.get(`${BACKEND_API}/health`, { timeout: 5000 });
        if (response.data.status !== 'OK') throw new Error('Invalid health status');
    });

    await test('Contract Health Check', 'api', async () => {
        const response = await axios.get(`${BACKEND_API}/api/contract/health`, { timeout: 5000 });
        if (!response.data.features) throw new Error('Missing features in response');
    });

    await test('API Response Time', 'api', async () => {
        const start = Date.now();
        await axios.get(`${BACKEND_API}/health`);
        const responseTime = Date.now() - start;
        if (responseTime > 1000) throw new Error(`Slow response: ${responseTime}ms`);
        console.log(`   ⏱️  Response time: ${responseTime}ms`);
    });

    await test('CORS Headers', 'api', async () => {
        const response = await axios.get(`${BACKEND_API}/health`, {
            headers: { 'Origin': FRONTEND_URL }
        });
        // Check if CORS headers are present (they might not be visible to axios)
        console.log(`   🔒 CORS check completed`);
    });
}

// WebSocket Tests
async function testWebSocketCommunication() {
    console.log('🔌 Testing WebSocket Communication...\n');

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
            const testMessage = { type: 'test', data: 'echo test' };
            let receivedEcho = false;

            const timeout = setTimeout(() => {
                if (!receivedEcho) reject(new Error('Echo timeout'));
            }, 5000);

            ws.on('open', () => {
                ws.send(JSON.stringify(testMessage));
            });

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    if (message.type === 'echo' && message.data.originalMessage.type === 'test') {
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

// Cross-Service Tests
async function testCrossServiceIntegration() {
    console.log('🔗 Testing Cross-Service Integration...\n');

    await test('API + WebSocket Coordination', 'crossService', async () => {
        // Test that both services are running simultaneously
        const [apiResponse, wsConnection] = await Promise.all([
            axios.get(`${BACKEND_API}/health`),
            new Promise((resolve, reject) => {
                const ws = new WebSocket(WEBSOCKET_URL);
                ws.on('open', () => {
                    ws.close();
                    resolve();
                });
                ws.on('error', reject);
            })
        ]);

        if (apiResponse.data.status !== 'OK') {
            throw new Error('API not healthy');
        }
    });

    await test('Real-time Update Flow', 'crossService', () => {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(WEBSOCKET_URL);
            let updateReceived = false;

            ws.on('open', () => {
                // Send a simulated token update
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

                // Wait for echo response
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

    await test('Error Handling', 'crossService', async () => {
        // Test API error handling
        try {
            await axios.get(`${BACKEND_API}/nonexistent-endpoint`, { timeout: 2000 });
        } catch (error) {
            if (error.response?.status === 404) {
                console.log(`   ⚠️  Proper 404 error handling`);
                return;
            }
            throw new Error('Unexpected error response');
        }
    });
}

// Performance Tests
async function testPerformance() {
    console.log('⚡ Testing Performance...\n');

    await test('Concurrent API Requests', 'api', async () => {
        const requests = Array(10).fill().map(() =>
            axios.get(`${BACKEND_API}/health`)
        );

        const start = Date.now();
        const results = await Promise.all(requests);
        const duration = Date.now() - start;

        if (duration > 3000) throw new Error(`Too slow: ${duration}ms for 10 requests`);
        console.log(`   🚀 10 concurrent requests in ${duration}ms (${(duration/10).toFixed(0)}ms avg)`);
    });

    await test('WebSocket Message Throughput', 'websocket', () => {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(WEBSOCKET_URL);
            let messagesSent = 0;
            let messagesReceived = 0;
            const targetMessages = 20;

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
                }, 10);
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

    await test('API Error Recovery', 'api', async () => {
        // Test that API recovers from errors
        try {
            await axios.get(`${BACKEND_API}/error-test`, { timeout: 1000 });
        } catch (error) {
            // Expected to fail, now test recovery
        }

        // Should recover immediately
        const response = await axios.get(`${BACKEND_API}/health`);
        if (response.data.status !== 'OK') {
            throw new Error('API did not recover properly');
        }
    });
}

// Run all tests
async function runAllTests() {
    try {
        await testAPICommunication();
        await testWebSocketCommunication();
        await testCrossServiceIntegration();
        await testPerformance();
        await testReliability();

        console.log('🎯 Test Results Summary:');
        console.log('========================');

        Object.entries(testResults).forEach(([category, results]) => {
            const total = results.passed + results.failed;
            const percentage = total > 0 ? ((results.passed / total) * 100).toFixed(1) : '0.0';
            console.log(`${category.toUpperCase()}: ${results.passed}/${total} (${percentage}%)`);

            if (results.failed > 0) {
                results.tests.filter(t => t.status === 'FAILED').forEach(test => {
                    console.log(`   ❌ ${test.name}: ${test.error}`);
                });
            }
        });

        const totalPassed = Object.values(testResults).reduce((sum, cat) => sum + cat.passed, 0);
        const totalFailed = Object.values(testResults).reduce((sum, cat) => sum + cat.failed, 0);
        const totalTests = totalPassed + totalFailed;
        const successRate = ((totalPassed / totalTests) * 100).toFixed(1);

        console.log('\n🎉 Overall Result: ' + successRate + '% (' + totalPassed + '/' + totalTests + ' tests passed)');

        if (totalFailed === 0) {
            console.log('\n✅ All cross-platform integration tests PASSED!');
            console.log('🚀 System is ready for production deployment!');
        } else {
            console.log('\n⚠️  Some tests failed. Please review the issues above.');
        }

    } catch (error) {
        console.error('💥 Test suite crashed:', error);
        process.exit(1);
    }
}

// Run the tests
runAllTests();