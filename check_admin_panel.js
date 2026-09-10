const fs = require('fs');
const code = fs.readFileSync('components/AdminPanel.js', 'utf8');

console.log('🔍 Checking AdminPanel.js...');

// AdminPanel should NOT use 'leader' - it should use email check
if (code.includes('role === \'admin\'') || code.includes('role === "admin"')) {
  console.log('⚠️ AdminPanel.js uses role="admin" - this is correct for App Admin');
} else {
  console.log('✅ AdminPanel.js does not use role checks - good');
}

// Check if it uses email for admin check
if (code.includes('yukeemc@gmail.com') || code.includes('user.email')) {
  console.log('✅ AdminPanel.js uses email for admin check');
} else {
  console.log('⚠️ AdminPanel.js might need to check email');
}
