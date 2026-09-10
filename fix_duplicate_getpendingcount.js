const fs = require('fs');
let code = fs.readFileSync('components/GroupsScreen.js', 'utf8');

console.log('🔧 Fixing duplicate getPendingCount declaration...');

// Find all occurrences of getPendingCount
const matches = code.match(/const getPendingCount = \(\) => \{[\s\S]*?\};/g);

if (matches && matches.length > 1) {
  console.log(`⚠️ Found ${matches.length} declarations of getPendingCount`);
  
  // Remove all but the first one
  let firstFound = false;
  code = code.replace(/const getPendingCount = \(\) => \{[\s\S]*?\};/g, (match) => {
    if (!firstFound) {
      firstFound = true;
      return match; // Keep the first one
    }
    return '// Duplicate removed'; // Remove the rest
  });
  
  console.log('✅ Removed duplicate getPendingCount declarations');
} else {
  console.log(`📊 Found ${matches ? matches.length : 0} declarations`);
}

// Also remove the simple version if it exists alongside the more complex one
// The simple version: `const getPendingCount = () => { return pendingRequests.length; };`
// The complex version: `const getPendingCount = () => { return pendingCount; };`
// We only need one

// Check for the pattern: `  const getPendingCount = () => {\n    return pendingRequests.length;\n  };`
const simpleVersion = /const getPendingCount = \(\) => \{\s*return pendingRequests\.length;\s*\};/;
const complexVersion = /const getPendingCount = \(\) => \{\s*return pendingCount;\s*\};/;

const hasSimple = simpleVersion.test(code);
const hasComplex = complexVersion.test(code);

console.log(`📊 Simple version: ${hasSimple}, Complex version: ${hasComplex}`);

// Keep the complex version (which returns pendingCount state) if both exist
if (hasSimple && hasComplex) {
  code = code.replace(simpleVersion, '// Simple getPendingCount removed');
  console.log('✅ Removed simple version, kept complex version');
}

fs.writeFileSync('components/GroupsScreen.js', code);
console.log('✅ Fix applied');
