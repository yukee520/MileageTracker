const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

// Remove the "Join or Create a Group" banner from Dashboard
const dashboardBanner = code.match(/<TouchableOpacity style={styles.groupUpgradeBanner}[\s\S]*?<Text style={styles.groupUpgradeTitle}>👥 Join or Create a Group<\/Text>[\s\S]*?<\/TouchableOpacity>/);
if (dashboardBanner) {
  code = code.replace(dashboardBanner[0], '');
  console.log('✅ Removed "Join or Create a Group" banner from Dashboard');
}

// Replace with a simple message or empty space
// The Dashboard will now only show personal metrics and export button

fs.writeFileSync('App.js', code);
console.log('✅ Dashboard cleaned up');
