const fs = require('fs');
let code = fs.readFileSync('components/GroupsScreen.js', 'utf8');

console.log('🔧 Updating GroupsScreen to receive props...');

// Update the component signature
code = code.replace(
  /const GroupsScreen = \({ user, onRefresh }\) => \{/,
  `const GroupsScreen = ({ user, onRefresh, pendingRequestsCount, onPendingUpdate }) => {`
);

// Update setPendingRequests calls to also notify parent
code = code.replace(
  /setPendingRequests\(requestsResult\.data \|\| \[\]\);\s+\/\/ setPendingCount managed by App\.js/,
  `setPendingRequests(requestsResult.data || []);
            if (onPendingUpdate) onPendingUpdate(requestsResult.data?.length || 0);`
);

fs.writeFileSync('components/GroupsScreen.js', code);
console.log('✅ GroupsScreen updated');
