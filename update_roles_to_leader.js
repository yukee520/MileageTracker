const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

console.log('🔧 Updating group admin role from "admin" to "leader"...');

// 1. Update all references to role === 'admin' for group checks
// (but keep 'admin' for App Admin check)

// For group admin checks, replace 'admin' with 'leader'
const groupAdminPatterns = [
  { from: /currentProfile\.role === 'admin'/g, to: "currentProfile.role === 'leader'" },
  { from: /profile\.role === 'admin'/g, to: "profile.role === 'leader'" },
  { from: /member\.role === 'admin'/g, to: "member.role === 'leader'" },
  { from: /role: 'admin'/g, to: "role: 'leader'" },
];

groupAdminPatterns.forEach(pattern => {
  code = code.replace(pattern.from, pattern.to);
});

console.log('✅ Updated group admin checks to use "leader"');

// 2. Keep App Admin as 'admin'
// Make sure App Admin check uses email, not role
if (!code.includes('APP_ADMIN_EMAIL')) {
  code = code.replace(
    /const appAdminEmail = 'yukeemc@gmail.com';/,
    `const APP_ADMIN_EMAIL = 'yukeemc@gmail.com';`
  );
}

// 3. Update the isGroupAdmin check
code = code.replace(
  /const isGroupAdminCheck = hasValidTeam && currentProfile\.role === 'leader';/,
  `const isGroupAdminCheck = hasValidTeam && currentProfile.role === 'leader';`
);

// 4. Update any comments
code = code.replace(
  /\/\/ Group Admin - admin of their group/g,
  `// Group Admin (leader) - leader of their group`
);

code = code.replace(
  /\/\/ Group Admin - admin of this specific group/g,
  `// Group Admin (leader) - leader of this specific group`
);

// 5. Update the role in create group function
code = code.replace(
  /role: 'admin'/g,
  `role: 'leader'`
);

// 6. Update the role in leave group function
code = code.replace(
  /role: 'member'/g,
  `role: 'member'`
);

fs.writeFileSync('App.js', code);
console.log('✅ App.js updated');
console.log('');
console.log('📝 Summary:');
console.log('   👑 App Admin: role="admin" (only yukeemc@gmail.com)');
console.log('   👥 Group Admin: role="leader" (group leaders)');
console.log('   👤 Group Member: role="member" (regular members)');
