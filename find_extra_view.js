const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

console.log('🔍 Finding extra View tag...');

// Split into lines and track View tags
const lines = code.split('\n');
let viewCount = 0;
let extraLine = -1;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Count opening tags
  const opens = (line.match(/<View/g) || []).length;
  // Count closing tags (be careful with self-closing or comments)
  const closes = (line.match(/<\/View>/g) || []).length;
  
  viewCount += opens - closes;
  
  // If viewCount goes negative, we found the extra closing tag
  if (viewCount < 0) {
    console.log(`⚠️ Extra closing View tag found at line ${i + 1}:`);
    console.log(`   ${line.trim()}`);
    extraLine = i;
    viewCount = 0; // Reset after finding
  }
}

console.log(`\n📊 Final View balance: ${viewCount}`);

if (extraLine !== -1) {
  console.log(`\n🔧 Fixing: Removing extra </View> at line ${extraLine + 1}`);
  
  // Remove the extra </View> tag from that line
  let fixedLine = lines[extraLine].replace(/<\/View>/, '');
  // If the line becomes empty or just whitespace, remove it
  if (fixedLine.trim() === '') {
    lines.splice(extraLine, 1);
    console.log('✅ Removed empty line');
  } else {
    lines[extraLine] = fixedLine;
    console.log(`✅ Fixed line: ${fixedLine.trim()}`);
  }
  
  code = lines.join('\n');
  fs.writeFileSync('App.js', code);
  console.log('✅ Extra View tag removed');
} else {
  console.log('✅ No extra View tag found');
}
