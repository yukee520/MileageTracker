const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

console.log('🔧 Fixing App component closing brace...');

// The issue is at line 2907: `});` should be `}`
// Find the exact pattern: `  );\n});\n\n// ===...\n// STYLES`
const wrongPattern = /(\n  \);\n)\}\);\n(\n\/\/ ={60}\n\/\/ STYLES)/;

if (wrongPattern.test(code)) {
  console.log('✅ Found the incorrect closing pattern');
  code = code.replace(wrongPattern, '$1}\n$2');
  console.log('✅ Fixed: }); → }');
} else {
  console.log('⚠️ Pattern not found, trying alternative...');
  
  // Alternative: replace `  );\n});` with `  );\n}`
  code = code.replace(/\n  \);\n\}\);/, '\n  );\n}');
  console.log('✅ Applied alternative fix');
}

fs.writeFileSync('App.js', code);
console.log('✅ Fix applied');
