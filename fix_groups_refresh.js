const fs = require('fs');
let code = fs.readFileSync('components/GroupsScreen.js', 'utf8');

console.log('🔧 Adding auto-refresh after approve/reject...');

// Find the handleRequest function
const handleRequestMatch = code.match(/const handleRequest = async \(requestId, userId, action\) => \{[\s\S]*?loadGroupData\(\);[\s\S]*?\}/);

if (handleRequestMatch) {
  console.log('✅ Found handleRequest function');
  
  // Add immediate refresh
  const newHandleRequest = handleRequestMatch[0].replace(
    /loadGroupData\(\);/g,
    `// Immediate refresh
      loadGroupData();
      // Also refresh the pending requests count
      setTimeout(() => {
        loadGroupData();
      }, 500);`
  );
  
  code = code.replace(handleRequestMatch[0], newHandleRequest);
  console.log('✅ Added double refresh after approve/reject');
}

// Add a useEffect to listen for changes
const useEffectMatch = code.match(/useEffect\(\(\) => \{\s+isMounted\.current = true;\s+loadGroupData\(\);\s+return \(\) => \{\s+isMounted\.current = false;\s+\};\s+\}, \[\]\);/);

if (useEffectMatch) {
  console.log('✅ Found main useEffect');
  
  // Add a focus listener
  const newUseEffect = `useEffect(() => {
    isMounted.current = true;
    loadGroupData();
    
    // Refresh when screen comes into focus
    const unsubscribe = navigation?.addListener?.('focus', () => {
      console.log('📱 Groups tab focused - refreshing...');
      loadGroupData();
    });
    
    return () => {
      isMounted.current = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);`;
  
  code = code.replace(useEffectMatch[0], newUseEffect);
  console.log('✅ Added focus listener');
}

fs.writeFileSync('components/GroupsScreen.js', code);
console.log('✅ GroupsScreen auto-refresh fix applied');
