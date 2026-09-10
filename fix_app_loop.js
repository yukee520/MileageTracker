const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

// Add loading guard to loadUserData
code = code.replace(
  /const loadUserData = useCallback\(async \(user\) => \{/,
  `const loadUserData = useCallback(async (user) => {
  // Prevent multiple simultaneous loads
  if (isLoadingRef.current) {
    console.log('⏳ loadUserData already running, skipping...');
    return;
  }`
);

// Make sure isLoadingRef is set correctly
code = code.replace(
  /isLoadingRef\.current = true;/,
  `isLoadingRef.current = true;`
);

fs.writeFileSync('App.js', code);
console.log('✅ Added loading guard to loadUserData in App.js');
