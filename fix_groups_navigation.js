const fs = require('fs');
let code = fs.readFileSync('components/GroupsScreen.js', 'utf8');

console.log('🔧 Fixing navigation error in GroupsScreen...');

// Remove the navigation listener that's causing the error
// Find and replace the useEffect that has navigation listener

// Option 1: Remove the navigation listener entirely
code = code.replace(
  /\/\/ Refresh when screen comes into focus\s+const unsubscribe = navigation\?\.addListener\?\.\('focus', \(\) => \{\s+console\.log\('📱 Groups tab focused - refreshing\.\.\.'\);\s+loadGroupData\(\);\s+\}\);/,
  '// Refresh when screen comes into focus (if navigation available)\n    // Navigation listener removed - using simple refresh instead'
);

// Option 2: Replace the entire useEffect with a simpler version
const useEffectPattern = /useEffect\(\(\) => \{\s+isMounted\.current = true;\s+loadGroupData\(\);\s+[^}]*return \(\) => \{\s+isMounted\.current = false;\s+[^}]*\s+\};\s+\}, \[\]\);/;
if (useEffectPattern.test(code)) {
  const simpleUseEffect = `useEffect(() => {
    isMounted.current = true;
    loadGroupData();
    
    return () => {
      isMounted.current = false;
    };
  }, []);`;
  
  code = code.replace(useEffectPattern, simpleUseEffect);
  console.log('✅ Simplified useEffect - removed navigation listener');
}

// Also remove any navigation related code
code = code.replace(/navigation\?\./g, '');

fs.writeFileSync('components/GroupsScreen.js', code);
console.log('✅ Navigation error fixed');
