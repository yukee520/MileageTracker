const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

// Find line numbers
const lines = code.split('\n');
let loadUserDataLine = -1;
let fetchPendingCountLine = -1;
let realtimeSubLine = -1;

lines.forEach((line, index) => {
  if (line.includes('const loadUserData = useCallback')) loadUserDataLine = index + 1;
  if (line.includes('const fetchPendingCount =')) fetchPendingCountLine = index + 1;
  if (line.includes("channel('pending_requests_count_")) realtimeSubLine = index + 1;
});

console.log('📊 Line numbers:');
console.log(`   loadUserData: ${loadUserDataLine}`);
console.log(`   fetchPendingCount: ${fetchPendingCountLine}`);
console.log(`   Real-time subscription: ${realtimeSubLine}`);

if (fetchPendingCountLine > loadUserDataLine) {
  console.log('\n⚠️ fetchPendingCount is defined AFTER loadUserData - this can cause issues!');
  console.log('   Need to move it before loadUserData');
} else {
  console.log('\n✅ fetchPendingCount is defined before loadUserData');
}
