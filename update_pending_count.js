const fs = require('fs');
let code = fs.readFileSync('components/GroupsScreen.js', 'utf8');

console.log('🔧 Adding pending count to component...');

// Add the pending count to the component state
code = code.replace(
  /const GroupsScreen = \({ user, onRefresh }\) => \{/,
  `const GroupsScreen = ({ user, onRefresh }) => {
  // Add a ref to track pending count for badge
  const [pendingCount, setPendingCount] = useState(0);`
);

// Update the pending count when data loads
code = code.replace(
  /setPendingRequests\(requestsResult\.data \|\| \[\]\);/,
  `setPendingRequests(requestsResult.data || []);
            setPendingCount(requestsResult.data?.length || 0);`
);

// Export the pending count for the parent component
const exportCode = `
  // ============================================================
  // EXPORT PENDING COUNT FOR BADGE
  // ============================================================
  // This function is called by the parent to get the pending count
  const getPendingCount = () => {
    return pendingCount;
  };`;

// Insert the function
code = code.replace(
  /const getMemberCount = \(\) => groupMembers\.length \|\| 1;/,
  `const getMemberCount = () => groupMembers.length || 1;
  ${exportCode}`
);

fs.writeFileSync('components/GroupsScreen.js', code);
console.log('✅ Pending count tracking added');
