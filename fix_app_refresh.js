const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

console.log('🔧 Adding auto-refresh after user data changes...');

// Add a refresh function that can be called from child components
const refreshFunction = `
  // ============================================================
  // FORCE REFRESH USER DATA
  // ============================================================
  const forceRefreshUserData = () => {
    console.log('🔄 Force refreshing user data...');
    if (user) {
      loadUserData(user);
    }
  };`;

// Insert before the render section
if (!code.includes('forceRefreshUserData')) {
  code = code.replace(
    /const handleExportExcel = \(\) => \{/,
    `${refreshFunction}
  
  const handleExportExcel = () => {`
  );
  console.log('✅ Added forceRefreshUserData function');
}

// Pass the refresh function to AdminPanel
code = code.replace(
  /<AdminPanel[\s\S]*?user={user}[\s\S]*?onClose={\(\) => setShowAdminPanel\(false\)}/,
  (match) => {
    if (!match.includes('onRefresh')) {
      return match.replace(
        /onClose={\(\) => setShowAdminPanel\(false\)}/,
        'onClose={() => setShowAdminPanel(false)} onRefresh={forceRefreshUserData}'
      );
    }
    return match;
  }
);

// Pass the refresh function to GroupsScreen
code = code.replace(
  /<GroupsScreen[\s\S]*?user={user}/,
  (match) => {
    if (!match.includes('onRefresh')) {
      return match.replace(
        /user={user}/,
        'user={user} onRefresh={forceRefreshUserData}'
      );
    }
    return match;
  }
);

fs.writeFileSync('App.js', code);
console.log('✅ App.js auto-refresh fix applied');
