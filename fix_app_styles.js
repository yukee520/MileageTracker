const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

console.log('🔧 Fixing App.js styles syntax error...');

// The issue is that the styles object is missing a closing `}` before the badge styles
// Find the styles section
const stylesStart = code.lastIndexOf('const styles = StyleSheet.create({');
const stylesEnd = code.lastIndexOf('});');

if (stylesStart !== -1 && stylesEnd !== -1) {
  console.log('✅ Found styles section');
  
  // Extract the styles content
  let stylesContent = code.substring(stylesStart, stylesEnd + 3);
  
  // Check if badge styles are properly inside the object
  if (stylesContent.includes('badgeContainer')) {
    console.log('✅ Badge styles found in styles object');
    
    // Find the position of badgeContainer
    const badgeIndex = stylesContent.indexOf('badgeContainer');
    
    // Find the closing brace before badgeContainer
    const beforeBadge = stylesContent.substring(0, badgeIndex);
    const lastClosingBrace = beforeBadge.lastIndexOf('}');
    
    // Check if there's a proper comma and closing brace before badgeContainer
    const beforeBadgeTrimmed = beforeBadge.trim();
    if (!beforeBadgeTrimmed.endsWith('},') && !beforeBadgeTrimmed.endsWith('}')) {
      console.log('⚠️ Missing closing brace before badgeContainer');
      // Add a closing brace and comma
      stylesContent = stylesContent.substring(0, lastClosingBrace + 1) + 
                     ',\n  ' + 
                     stylesContent.substring(lastClosingBrace + 1);
    }
    
    // Make sure the badge styles are properly formatted
    stylesContent = stylesContent.replace(
      /badgeContainer: \{([\s\S]*?)\},?\s*\n\s*badgeText: \{([\s\S]*?)\},?\s*\n\}/g,
      `badgeContainer: {$1},\n  badgeText: {$2}\n});`
    );
  }
  
  // Replace the styles section in the code
  code = code.substring(0, stylesStart) + stylesContent + code.substring(stylesEnd + 3);
  console.log('✅ Styles section fixed');
}

// Alternative: Just ensure the styles object is properly closed
// Find the last `}` before the end of file and make sure it's `});`
const lines = code.split('\n');
let lastBraceIndex = -1;
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].trim() === '});' || lines[i].trim() === '}') {
    lastBraceIndex = i;
    break;
  }
}

if (lastBraceIndex !== -1) {
  // Ensure the styles object is properly closed
  lines[lastBraceIndex] = '});';
  code = lines.join('\n');
  console.log('✅ Ensured styles object is properly closed');
}

fs.writeFileSync('App.js', code);
console.log('✅ App.js styles fixed');
