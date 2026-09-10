const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

console.log('🔧 Fixing tracking tab end structure...');

// The issue: there's an extra )} at the end of the tracking tab
// The correct structure should be:
// </ScrollView>
// )}
// </View>
// 
// {/* Bottom Tab Bar */}

// Find and fix the pattern
const pattern = /<\/ScrollView>\s*\)}\s*<\/View>\s*<\/View>\s*{\/\* Bottom Tab Bar \*\/}/;
const pattern2 = /<\/ScrollView>\s*\)}\s*<\/View>\s*{\/\* Bottom Tab Bar \*\/}/;

if (pattern.test(code)) {
  console.log('⚠️ Found double closing View tags');
  // Remove one closing View
  code = code.replace(pattern, '</ScrollView>\n        )}\n      </View>\n\n      {/* Bottom Tab Bar */}');
  console.log('✅ Fixed double View tags');
} else if (pattern2.test(code)) {
  console.log('✅ Pattern looks correct');
} else {
  console.log('⚠️ Pattern not found, looking for alternatives...');
  
  // Find the tracking tab end
  const trackingEnd = code.indexOf('          </ScrollView>\n        )}\n      </View>');
  if (trackingEnd !== -1) {
    console.log('📍 Found tracking tab end');
    // Get the code before and after
    const before = code.substring(0, trackingEnd + 31); // Include the closing tags
    const after = code.substring(trackingEnd + 31);
    
    // Fix: remove extra closing if any
    if (after.trim().startsWith('</View>')) {
      const fixedAfter = after.replace(/^<\/View>/, '');
      code = before + fixedAfter;
      console.log('✅ Removed extra closing View tag');
    }
  }
}

// Also ensure the bottom tab bar is properly formatted
code = code.replace(
  /{\/\* Bottom Tab Bar \*\/}\s*<View style={styles.bottomTabBar}>/,
  '\n      {/* Bottom Tab Bar */}\n      <View style={styles.bottomTabBar}>'
);

fs.writeFileSync('App.js', code);
console.log('✅ Tracking tab end fixed');
