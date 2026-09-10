const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

console.log('🔧 Fixing App.js syntax error...');

// First, let's check if there are any unbalanced brackets
let openBraces = 0;
let openParens = 0;
let openBrackets = 0;

for (const char of code) {
  if (char === '{') openBraces++;
  if (char === '}') openBraces--;
  if (char === '(') openParens++;
  if (char === ')') openParens--;
  if (char === '[') openBrackets++;
  if (char === ']') openBrackets--;
}

console.log(`📊 Balance check: Braces: ${openBraces}, Parens: ${openParens}, Brackets: ${openBrackets}`);

if (openBraces !== 0 || openParens !== 0 || openBrackets !== 0) {
  console.log('⚠️ Unbalanced brackets detected!');
}

// Find the Profile tab section and ensure it's properly closed
const profileMatch = code.match(/{activeTab === 'profile' && \([\s\S]*?<\/ScrollView>\s*\)\s*}\)/);
if (profileMatch) {
  console.log('✅ Profile tab structure looks correct');
} else {
  console.log('⚠️ Profile tab might have issues');
}

// Also check the Groups tab
const groupsMatch = code.match(/{activeTab === 'groups' && \([\s\S]*?<\/ScrollView>\s*\)\s*}\)/);
if (groupsMatch) {
  console.log('✅ Groups tab structure looks correct');
} else {
  console.log('⚠️ Groups tab might have issues');
}

// Check for any missing closing tags in the tracking tab
const trackingMatch = code.match(/{activeTab === 'tracking' && \([\s\S]*?<\/ScrollView>\s*\)\s*}\)/);
if (trackingMatch) {
  console.log('✅ Tracking tab structure looks correct');
} else {
  console.log('⚠️ Tracking tab might have issues');
}

// Now let's ensure all tabs are properly closed in the main render
// Find where the main view ends and the bottom tab bar starts
const viewEnd = code.match(/<\/View>\s*{\/\* Bottom Tab Bar \*\/}/);
if (viewEnd) {
  console.log('✅ Main view properly closed before bottom tab bar');
} else {
  console.log('⚠️ Main view might not be properly closed');
  // Add a missing closing View if needed
  const bottomBarIndex = code.indexOf('{/* Bottom Tab Bar */}');
  if (bottomBarIndex !== -1) {
    // Check if there's a closing View before the bottom tab bar
    const beforeBottomBar = code.substring(0, bottomBarIndex);
    const viewCount = (beforeBottomBar.match(/<View/g) || []).length;
    const closeViewCount = (beforeBottomBar.match(/<\/View>/g) || []).length;
    
    if (viewCount > closeViewCount) {
      console.log(`⚠️ Missing ${viewCount - closeViewCount} closing View tags before bottom bar`);
      // Add a closing View
      const insertPoint = code.indexOf('{/* Bottom Tab Bar */}');
      code = code.substring(0, insertPoint) + '</View>\n\n      {/* Bottom Tab Bar */}' + code.substring(insertPoint + '/* Bottom Tab Bar */'.length);
      console.log('✅ Added missing closing View tag');
    }
  }
}

// Also check if the App component is properly closed at the end
const appEnd = code.match(/export default function App\(\) \{[\s\S]*?^}$/m);
if (appEnd) {
  console.log('✅ App component properly closed');
} else {
  console.log('⚠️ App component might not be properly closed');
}

// Write the fixed code
fs.writeFileSync('App.js', code);
console.log('✅ App.js syntax fix applied');
console.log('');
console.log('📝 Now run: node -c App.js to verify syntax');
