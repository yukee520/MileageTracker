const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

console.log('🔧 Checking function order...');

// Extract the fetchPendingCount function
const fetchPattern = /  \/\/ ={60}\n  \/\/ FETCH PENDING REQUESTS COUNT\n  \/\/ ={60}\n  const fetchPendingCount = async \(teamId, isLeader\) => \{[\s\S]*?\n  \};\n/;
const fetchMatch = code.match(fetchPattern);

if (fetchMatch) {
  console.log('✅ Found fetchPendingCount function');
  
  // Remove it from its current position
  code = code.replace(fetchPattern, '');
  
  // Insert it before loadUserData
  const loadUserDataPattern = /  \/\/ ={60}\n  \/\/ LOAD USER DATA\n  \/\/ ={60}/;
  
  if (loadUserDataPattern.test(code)) {
    console.log('✅ Found loadUserData');
    code = code.replace(loadUserDataPattern, fetchMatch[0] + '\n  // ============================================================\n  // LOAD USER DATA\n  // ============================================================');
    console.log('✅ Moved fetchPendingCount before loadUserData');
  } else {
    console.log('⚠️ loadUserData pattern not found');
  }
} else {
  console.log('⚠️ fetchPendingCount pattern not found');
}

fs.writeFileSync('App.js', code);
console.log('✅ Function reordered');
