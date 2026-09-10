const fs = require('fs');
let code = fs.readFileSync('components/GroupsScreen.js', 'utf8');

// Update the dismiss function to delete ALL join requests regardless of status
const dismissMatch = code.match(/const handleDismissGroup = \(\) => \{[\s\S]*?\n  \};/);
if (dismissMatch) {
  let fixedDismiss = dismissMatch[0];
  
  // Make sure we delete ALL join requests, not just pending ones
  fixedDismiss = fixedDismiss.replace(
    /\/\/ Step 3: Delete all pending join requests/,
    `// Step 3: Delete ALL join requests (pending, approved, rejected)`
  );
  
  fixedDismiss = fixedDismiss.replace(
    /\.from\('group_join_requests'\)\s+\.delete\(\)\s+\.eq\('team_id', teamId\);/,
    `.from('group_join_requests')
                .delete()
                .eq('team_id', teamId);`
  );
  
  code = code.replace(dismissMatch[0], fixedDismiss);
  console.log('✅ Updated dismiss to delete ALL join requests');
}

fs.writeFileSync('components/GroupsScreen.js', code);
console.log('✅ Fix applied');
