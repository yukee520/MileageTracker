const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

console.log('🔧 Complete Admin Separation Fix...');

// 1. Add isAppAdmin state
if (!code.includes('isAppAdmin')) {
  code = code.replace(
    /const \[isAdmin, setIsAdmin\] = useState\(false\);/,
    `const [isAdmin, setIsAdmin] = useState(false);
  const [isAppAdmin, setIsAppAdmin] = useState(false);`
  );
  console.log('✅ Added isAppAdmin state');
}

// 2. Fix loadUserData - separate App Admin from Group Admin
const loadUserDataSection = code.match(/const loadUserData = useCallback\(async \(user\) => \{[\s\S]*?\/\/ Only set admin if user has a team and role is admin[\s\S]*?setIsAdmin\(isUserAdmin\);[\s\S]*?\}, \[loadTrips, checkSubscriptionStatus\]\);/);
if (loadUserDataSection) {
  let section = loadUserDataSection[0];
  
  // Replace the admin logic
  const fixedSection = section.replace(
    /\/\/ Only set admin if user has a team and role is admin\s+const isUserAdmin = hasValidTeam && currentProfile\.role === 'admin';\s+setIsAdmin\(isUserAdmin\);/,
    `// App Admin (super admin) - only specific email
      const APP_ADMIN_EMAIL = 'yukeemc@gmail.com';
      const isAppAdminCheck = user.email === APP_ADMIN_EMAIL;
      setIsAppAdmin(isAppAdminCheck);
      
      // Group Admin - admin of their group
      const isGroupAdminCheck = hasValidTeam && currentProfile.role === 'admin';
      setIsAdmin(isGroupAdminCheck);
      
      console.log('👑 App Admin check:', isAppAdminCheck, 'for:', user.email);
      console.log('👥 Group Admin check:', isGroupAdminCheck);`
  );
  
  code = code.replace(loadUserDataSection[0], fixedSection);
  console.log('✅ Fixed admin detection in loadUserData');
}

// 3. Fix Admin Panel button in Profile tab
const adminBtnPattern = /{\/\* Admin Panel Button \*\/}[\s\S]*?{isAdmin && \([\s\S]*?<\/TouchableOpacity>[\s\S]*?\)}/;
const adminBtnMatch = code.match(adminBtnPattern);
if (adminBtnMatch) {
  const fixed = adminBtnMatch[0].replace(/isAdmin/g, 'isAppAdmin');
  code = code.replace(adminBtnMatch[0], fixed);
  console.log('✅ Fixed Admin Panel button');
}

// 4. Fix Admin Panel modal
const adminModalPattern = /{\/\* Admin Panel Modal \*\/}[\s\S]*?{isAdmin && \([\s\S]*?<AdminPanel[\s\S]*?\/>[\s\S]*?\)}/;
const adminModalMatch = code.match(adminModalPattern);
if (adminModalMatch) {
  const fixed = adminModalMatch[0].replace(/isAdmin/g, 'isAppAdmin');
  code = code.replace(adminModalMatch[0], fixed);
  console.log('✅ Fixed Admin Panel modal');
}

// 5. Also check for any other isAdmin references that should be isAppAdmin
// Look for "Admin Panel" in the code
const adminPanelRefs = code.match(/isAdmin[^=]*Admin Panel/g);
if (adminPanelRefs) {
  adminPanelRefs.forEach(ref => {
    code = code.replace(ref, ref.replace(/isAdmin/g, 'isAppAdmin'));
  });
  console.log('✅ Fixed other Admin Panel references');
}

// 6. Add debug log to verify
code = code.replace(
  /console\.log\('👑 App Admin check:'/,
  `console.log('📧 User email:', user.email);
      console.log('👑 App Admin check:'`
);

fs.writeFileSync('App.js', code);
console.log('');
console.log('✅ Admin separation complete!');
console.log('');
console.log('📝 Summary:');
console.log('   👑 App Admin (super admin): yukeemc@gmail.com');
console.log('   👥 Group Admin: anyone with role=admin in their group');
console.log('   🔐 Admin Panel: only visible to App Admin');
console.log('   👥 Group Management: visible to Group Admins');
