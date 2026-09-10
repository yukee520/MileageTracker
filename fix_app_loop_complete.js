const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

// Make sure loadUserData doesn't get called from GroupsScreen
// The issue is that GroupsScreen is calling loadUserData which triggers re-render

// Add a check to prevent loadUserData from being called multiple times
code = code.replace(
  /const loadUserData = useCallback\(async \(user\) => \{/,
  `const loadUserData = useCallback(async (user) => {
  console.log('🔄 loadUserData called for:', user?.id);
  
  // Prevent multiple simultaneous loads
  if (isLoadingRef.current) {
    console.log('⏳ loadUserData already running, skipping...');
    return;
  }`
);

fs.writeFileSync('App.js', code);
console.log('✅ Updated App.js with better guards');
