const fs = require('fs');
let code = fs.readFileSync('components/GroupsScreen.js', 'utf8');

// 1. Remove the onRefresh call inside loadGroupData that might cause loops
code = code.replace(
  /if \(onRefresh\) onRefresh\(\);/g,
  '// onRefresh handled by parent'
);

// 2. Add a loading guard to prevent multiple simultaneous loads
code = code.replace(
  /const loadGroupData = async \(\) => \{/,
  `const loadGroupData = async () => {
  // Prevent multiple simultaneous loads
  if (loading) {
    console.log('⏳ Already loading, skipping...');
    return;
  }`
);

// 3. Add a ref to track if component is mounted
code = code.replace(
  /const GroupsScreen = \({ user, onRefresh }\) => \{/,
  `const GroupsScreen = ({ user, onRefresh }) => {
  const isMounted = React.useRef(true);
  
  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);`
);

// 4. Only update state if mounted
code = code.replace(
  /setLoading\(false\);/g,
  `if (isMounted.current) setLoading(false);`
);

code = code.replace(
  /setHasGroup\(/g,
  `if (isMounted.current) setHasGroup(`
);

code = code.replace(
  /setIsGroupLeader\(/g,
  `if (isMounted.current) setIsGroupLeader(`
);

fs.writeFileSync('components/GroupsScreen.js', code);
console.log('✅ Fixed infinite loop issues in GroupsScreen');
console.log('');
console.log('📝 Changes made:');
console.log('1. Added loading guard to prevent simultaneous loads');
console.log('2. Added isMounted ref to prevent state updates after unmount');
console.log('3. Removed onRefresh call that was causing loops');
