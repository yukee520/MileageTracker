const fs = require('fs');
let code = fs.readFileSync('components/GroupsScreen.js', 'utf8');

// 1. Remove the onRefresh call entirely
code = code.replace(
  /if \(onRefresh\) onRefresh\(\);/g,
  '// onRefresh removed to prevent loop'
);

// 2. Remove loadUserData calls inside loadGroupData
code = code.replace(
  /Loading user data for:[\s\S]*?loadUserData\(user\);/g,
  '// loadUserData removed to prevent loop'
);

// 3. Remove the useEffect that might cause re-runs
code = code.replace(
  /useEffect\(\(\) => \{[\s\S]*?loadGroupData\(\);/,
  `useEffect(() => {
    console.log('📱 GroupsScreen mounted');
    // Only load once
    let isMounted = true;
    if (isMounted) {
      loadGroupData();
    }
    return () => { isMounted = false; };
  }, []);`
);

// 4. Add a simple guard to prevent repeated calls
code = code.replace(
  /const loadGroupData = async \(\) => \{/,
  `const loadGroupData = async () => {
  // Prevent multiple simultaneous loads
  if (loading) {
    console.log('⏳ Already loading, skipping...');
    return;
  }`
);

// 5. Remove any setState that might cause re-render loops
code = code.replace(
  /setLoading\(false\);/g,
  `setTimeout(() => {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }, 100);`
);

fs.writeFileSync('components/GroupsScreen.js', code);
console.log('✅ Fixed loop issues in GroupsScreen');
console.log('');
console.log('📝 Changes:');
console.log('1. Removed onRefresh calls');
console.log('2. Removed loadUserData calls');
console.log('3. Added isMounted check');
console.log('4. Added loading guard');
