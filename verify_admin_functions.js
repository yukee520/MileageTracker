const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

console.log('🔍 Verifying admin functions...');

// Check handleLeaveGroup - should use isAdmin for group admin check
const leaveGroupMatch = code.match(/const handleLeaveGroup = \(\) => \{[\s\S]*?if \(isAdmin\) \{[\s\S]*?\}/);
if (leaveGroupMatch) {
  console.log('✅ handleLeaveGroup uses isAdmin (Group Admin) correctly');
} else {
  console.log('⚠️ handleLeaveGroup might need updating');
}

// Check handleDismissGroup - should use isAdmin for group admin check
const dismissGroupMatch = code.match(/const handleDismissGroup = \(\) => \{[\s\S]*?if \(isAdmin\) \{[\s\S]*?\}/);
if (dismissGroupMatch) {
  console.log('✅ handleDismissGroup uses isAdmin (Group Admin) correctly');
} else {
  console.log('⚠️ handleDismissGroup might need updating');
}

// Check if any admin functions incorrectly use isAppAdmin
const wrongRefs = code.match(/isAppAdmin[^=]*Leave Group|isAppAdmin[^=]*Dismiss Group/);
if (wrongRefs) {
  console.log('⚠️ Some admin functions might be using isAppAdmin incorrectly');
} else {
  console.log('✅ No admin functions incorrectly using isAppAdmin');
}

console.log('');
console.log('✅ Verification complete!');
