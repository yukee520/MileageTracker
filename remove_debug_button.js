const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

console.log('🔧 Removing debug button from Home tab...');

// Find and remove the debug button
// Look for the "OPEN GROUPS TAB (DEBUG)" button
const debugButtonMatch = code.match(/{\/\* Debug: Open Groups Tab \*\/}[\s\S]*?<TouchableOpacity[\s\S]*?OPEN GROUPS TAB \(DEBUG\)[\s\S]*?<\/TouchableOpacity>/);
if (debugButtonMatch) {
  code = code.replace(debugButtonMatch[0], '');
  console.log('✅ Removed debug button from Home tab');
} else {
  // Try alternative pattern - look for any button with "DEBUG" text
  const altMatch = code.match(/<TouchableOpacity[\s\S]*?DEBUG[\s\S]*?<\/TouchableOpacity>/);
  if (altMatch) {
    code = code.replace(altMatch[0], '');
    console.log('✅ Removed debug button (alternative match)');
  } else {
    console.log('⚠️ Debug button not found or already removed');
  }
}

// Also remove any leftover debug-related comments
code = code.replace(/{\/\* Debug: Open Groups Tab \*\/}/, '');
code = code.replace(/{\/\* Debug: Test Groups Tab \*\/}/, '');

fs.writeFileSync('App.js', code);
console.log('✅ Debug button removed from Home tab');
console.log('');
console.log('📝 The Home tab is now clean with only:');
console.log('   - Greeting');
console.log('   - Monthly limit usage');
console.log('   - START NEW TRIP button');
console.log('   - Tracking status (when active)');
