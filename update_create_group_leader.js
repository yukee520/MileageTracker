const fs = require('fs');
let code = fs.readFileSync('components/CreateGroupScreen.js', 'utf8');

console.log('🔧 Updating CreateGroupScreen...');

// Update role assignment
code = code.replace(
  /role: 'admin'/g,
  "role: 'leader'"
);

// Update text
code = code.replace(
  /You'll be the Group Admin/g,
  "You'll be the Group Leader"
);

code = code.replace(
  /you are now the group admin/g,
  "you are now the group leader"
);

code = code.replace(
  /As the admin, you can/g,
  "As the leader, you can"
);

code = code.replace(
  /Group Admin/g,
  "Group Leader"
);

fs.writeFileSync('components/CreateGroupScreen.js', code);
console.log('✅ CreateGroupScreen.js updated');
