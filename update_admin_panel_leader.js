const fs = require('fs');
let code = fs.readFileSync('components/AdminGroupPanel.js', 'utf8');

console.log('🔧 Updating AdminGroupPanel...');

// Update role checks
code = code.replace(
  /profile\.role === 'admin'/g,
  "profile.role === 'leader'"
);

code = code.replace(
  /member\.role === 'admin'/g,
  "member.role === 'leader'"
);

code = code.replace(
  /role: 'admin'/g,
  "role: 'leader'"
);

// Update UI text
code = code.replace(
  /role === 'admin' \? '👑 ADMIN' : 'MEMBER'/g,
  "role === 'leader' ? '👑 LEADER' : 'MEMBER'"
);

code = code.replace(
  /member\.role === 'admin' \? '👑 ADMIN' : 'MEMBER'/g,
  "member.role === 'leader' ? '👑 LEADER' : 'MEMBER'"
);

// Update comments
code = code.replace(
  /\/\/ Check if user is admin/g,
  "// Check if user is group leader"
);

code = code.replace(
  /\/\/ You are the admin/g,
  "// You are the group leader"
);

code = code.replace(
  /You are the group admin/g,
  "You are the group leader"
);

fs.writeFileSync('components/AdminGroupPanel.js', code);
console.log('✅ AdminGroupPanel.js updated');
