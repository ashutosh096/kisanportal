/**
 * Load Test Script: Simulates 500 concurrent devices syncing to the server.
 *
 * How to run:
 *   1. npm install -g autocannon   (or: npx autocannon)
 *   2. Make sure the backend server is running: npm start
 *   3. Login to get a test token from: POST http://localhost:5050/api/auth/login
 *   4. Replace YOUR_TEST_TOKEN below with the access token
 *   5. Run: node server/loadtest/sync-test.js
 */

import autocannon from 'autocannon';

const TEST_TOKEN = process.env.TEST_TOKEN || 'YOUR_ACCESS_TOKEN_HERE';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5050';

console.log('🚀 Starting load test — 500 concurrent devices for 10 seconds...');
console.log(`📡 Target: ${BASE_URL}/api/farmers\n`);

const instance = autocannon({
  url: `${BASE_URL}/api/farmers`,
  connections: 500,    // Simulate 500 simultaneous devices
  duration: 10,        // Run for 10 seconds
  pipelining: 1,
  headers: {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
}, (err, result) => {
  if (err) {
    console.error('❌ Load test error:', err.message);
    process.exit(1);
  }

  console.log('\n✅ Load Test Complete!\n');
  console.log(`📊 Results Summary:`);
  console.log(`   Total Requests:     ${result.requests.total.toLocaleString()}`);
  console.log(`   Average Latency:    ${result.latency.average}ms`);
  console.log(`   99th Percentile:    ${result.latency.p99}ms`);
  console.log(`   Requests/sec avg:   ${result.requests.average}`);
  console.log(`   Throughput avg:     ${(result.throughput.average / 1024).toFixed(2)} KB/s`);
  console.log(`   Errors:             ${result.errors}`);
  console.log(`   Timeouts:           ${result.timeouts}`);
  console.log(`   Non-2xx responses:  ${result['non2xx']}`);
  console.log('\n🎯 Benchmark Targets:');
  console.log(`   Latency < 200ms:   ${result.latency.p99 < 200 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Zero Errors:       ${result.errors === 0 ? '✅ PASS' : '❌ FAIL (review pool limits)'}`);
});

// Show live progress
autocannon.track(instance);
