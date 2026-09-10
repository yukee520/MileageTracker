const fs = require('fs');
let code = fs.readFileSync('components/GroupsScreen.js', 'utf8');

console.log('🔧 Fixing pending count sync...');

// Option 1: Change getPendingCount to use pendingRequests.length
code = code.replace(
  /const getPendingCount = \(\) => \{\s*return pendingCount;\s*\};/,
  `const getPendingCount = () => {
    return pendingRequests.length;
  };`
);
console.log('✅ Changed getPendingCount to use pendingRequests.length');

// Option 2: Also keep pendingCount in sync when pendingRequests updates
// This is safer for the badge display
const updatePattern = /setPendingRequests\(requestsResult\.data \|\| \[\]\);\s+setPendingCount\(requestsResult\.data\?\.length \|\| 0\);/;

if (updatePattern.test(code)) {
  console.log('✅ Pending count is already synced with pendingRequests');
} else {
  // Make sure setPendingCount is called whenever setPendingRequests is called
  code = code.replace(
    /setPendingRequests\(requestsResult\.data \|\| \[\]\);/g,
    `setPendingRequests(requestsResult.data || []);
            setPendingCount(requestsResult.data?.length || 0);`
  );
  console.log('✅ Added setPendingCount sync with setPendingRequests');
}

// Also handle the reset case
code = code.replace(
  /setPendingRequests\(\[\]\);/g,
  `setPendingRequests([]);
            setPendingCount(0);`
);

// Handle the initial state (when user has no group or is not leader)
code = code.replace(
  /setPendingRequests\(\[\]\);\s+\}/g,
  `setPendingRequests([]);
        setPendingCount(0);
      }`
);

fs.writeFileSync('components/GroupsScreen.js', code);
console.log('✅ Pending count sync fixed');
