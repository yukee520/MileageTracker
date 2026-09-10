const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

console.log('🔧 Passing pending count to GroupsScreen...');

// Find the GroupsScreen render
const groupsScreenPattern = /<GroupsScreen\s+user={user}\s+onRefresh={forceRefreshUserData}\s*\/>/;

if (groupsScreenPattern.test(code)) {
  console.log('✅ Found GroupsScreen render');
  
  const newRender = `<GroupsScreen
            user={user}
            onRefresh={forceRefreshUserData}
            pendingRequestsCount={pendingRequestsCount}
            onPendingUpdate={(count) => setPendingRequestsCount(count)}
          />`;
  
  code = code.replace(groupsScreenPattern, newRender);
  console.log('✅ Passed pending count to GroupsScreen');
} else {
  // Try alternative pattern
  const altPattern = /<GroupsScreen[\s\S]*?\/>/;
  const match = code.match(altPattern);
  if (match) {
    console.log('✅ Found GroupsScreen (alternative)');
    const newRender = match[0].replace(
      /\/>/,
      `  pendingRequestsCount={pendingRequestsCount}
            onPendingUpdate={(count) => setPendingRequestsCount(count)}
          />`
    );
    code = code.replace(match[0], newRender);
    console.log('✅ Passed pending count to GroupsScreen (alternative)');
  }
}

fs.writeFileSync('App.js', code);
console.log('✅ App.js updated');
