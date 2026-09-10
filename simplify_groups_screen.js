const fs = require('fs');
let code = fs.readFileSync('components/GroupsScreen.js', 'utf8');

console.log('🔧 Simplifying GroupsScreen badge handling...');

// Remove the duplicate pendingCount state (not needed here)
code = code.replace(
  /\/\/ Add a ref to track pending count for badge\s+const \[pendingCount, setPendingCount\] = useState\(0\);/,
  '// Pending count is managed in App.js for the badge'
);

// Remove all setPendingCount calls (not needed here)
code = code.replace(/setPendingCount\([^)]*\);/g, '// setPendingCount managed by App.js');

// Simplify getPendingCount
code = code.replace(
  /const getPendingCount = \(\) => \{\s*return pendingRequests\.length;\s*\};/,
  `const getPendingCount = () => {
    return pendingRequests.length;
  };`
);

// Remove the real-time subscription in GroupsScreen (App.js handles it)
code = code.replace(
  /\/\/ ============================================================\s+\/\/ REAL-TIME SUBSCRIPTION FOR JOIN REQUESTS\s+\/\/ ============================================================\s+useEffect\(\(\) => \{[\s\S]*?\}, \[user\?\.id, hasGroup, isGroupLeader, groupInfo\?\.id\]\);/,
  `// ============================================================
  // REAL-TIME REFRESH - Refresh when App state changes
  // ============================================================
  // Note: Pending count subscription is handled in App.js
  // This component just refreshes when notified by App.js`
);

fs.writeFileSync('components/GroupsScreen.js', code);
console.log('✅ GroupsScreen simplified');
