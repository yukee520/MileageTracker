const fs = require('fs');
let code = fs.readFileSync('components/GroupsScreen.js', 'utf8');

console.log('🔧 Updating GroupsScreen to use "leader"...');

// 1. Update role checks
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

// 2. Update UI labels
code = code.replace(
  /role === 'admin' \? '👑 Admin' : 'Member'/g,
  "role === 'leader' ? '👑 Leader' : 'Member'"
);

code = code.replace(
  /member\.role === 'admin' \? '👑 Admin' : 'Member'/g,
  "member.role === 'leader' ? '👑 Leader' : 'Member'"
);

// 3. Update comments
code = code.replace(
  /\/\/ Group Admin - admin of this specific group/g,
  "// Group Admin (leader) - leader of this specific group"
);

code = code.replace(
  /\/\/ Group Admin - admin of their group/g,
  "// Group Admin (leader) - leader of their group"
);

// 4. Update admin badge to leader badge
code = code.replace(
  /<View style={styles.adminBadge}>/g,
  "<View style={styles.leaderBadge}>"
);

code = code.replace(
  /<Text style={styles.adminBadgeText}>👑 Admin<\/Text>/g,
  "<Text style={styles.leaderBadgeText}>👑 Leader</Text>"
);

// 5. Add leader badge style
if (!code.includes('leaderBadge')) {
  code = code.replace(
    /adminBadge: {/g,
    `leaderBadge: {
    backgroundColor: '#6f42c1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  adminBadge: {`
  );
  
  code = code.replace(
    /adminBadgeText: {/g,
    `leaderBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  adminBadgeText: {`
  );
}

fs.writeFileSync('components/GroupsScreen.js', code);
console.log('✅ GroupsScreen.js updated');
console.log('');
console.log('📝 Changes:');
console.log('   - "admin" → "leader" for group admins');
console.log('   - "👑 Admin" → "👑 Leader" in UI');
console.log('   - Added leader badge style');
