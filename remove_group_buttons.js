const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

console.log('🔧 Removing group buttons from Profile tab...');

// 1. Find and remove the entire "Create Group" section
const createGroupMatch = code.match(/{\/\* Create Group - Only show if user has NO group \*\/}[\s\S]*?{!hasGroup && !teamId && \([\s\S]*?<\/>}\s*\)}/);
if (createGroupMatch) {
  code = code.replace(createGroupMatch[0], '');
  console.log('✅ Removed Create Group section');
}

// 2. Find and remove the "Join or Create a Group" banner in Dashboard
const bannerMatch = code.match(/<TouchableOpacity style={styles.groupUpgradeBanner}[\s\S]*?<\/TouchableOpacity>/);
if (bannerMatch && bannerMatch[0].includes('Join or Create a Group')) {
  code = code.replace(bannerMatch[0], '');
  console.log('✅ Removed Join or Create a Group banner from Dashboard');
}

// 3. Also remove the "Join a Group" setting option if it exists
const joinMatch = code.match(/<TouchableOpacity style={styles.settingOptionRow} onPress={handleSearchGroup}>[\s\S]*?🔍 Join a Group[\s\S]*?<\/TouchableOpacity>/);
if (joinMatch) {
  code = code.replace(joinMatch[0], '');
  console.log('✅ Removed Join a Group option');
}

// 4. Also remove the "Create a Group" setting option if it exists
const createOptionMatch = code.match(/<TouchableOpacity style={styles.settingOptionRow} onPress={handleCreateGroup}>[\s\S]*?🚀 Create a Group[\s\S]*?<\/TouchableOpacity>/);
if (createOptionMatch) {
  code = code.replace(createOptionMatch[0], '');
  console.log('✅ Removed Create a Group option');
}

// 5. Remove any Browse Groups button
const browseMatch = code.match(/<TouchableOpacity[\s\S]*?🔍 Browse Groups[\s\S]*?<\/TouchableOpacity>/);
if (browseMatch) {
  code = code.replace(browseMatch[0], '');
  console.log('✅ Removed Browse Groups button');
}

// 6. Remove the Group Management section if it exists
const groupManagementMatch = code.match(/{\/\* Group Management Section[^*]*\*\/}[\s\S]*?{hasGroup && teamId && \([\s\S]*?<\/View>\s*\)}\s*\)}/);
if (groupManagementMatch) {
  code = code.replace(groupManagementMatch[0], '');
  console.log('✅ Removed Group Management section');
}

fs.writeFileSync('App.js', code);
console.log('');
console.log('✅ All group-related buttons removed from Profile tab!');
console.log('');
console.log('📝 The Profile tab now only contains:');
console.log('   - User profile info (name, email, vehicle)');
console.log('   - Personal plan management');
console.log('   - Manage Purposes');
console.log('   - Refer & Earn');
console.log('   - Admin Panel (App Admin only)');
console.log('   - Sign Out');
console.log('');
console.log('📍 All group functionality is in the Groups tab');
