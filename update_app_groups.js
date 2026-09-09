const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

// 1. Add import for GroupsScreen
if (!code.includes('import GroupsScreen')) {
  code = code.replace(
    /import AdminGroupPanel from '\.\/components\/AdminGroupPanel';/,
    `import AdminGroupPanel from './components/AdminGroupPanel';
import GroupsScreen from './components/GroupsScreen';`
  );
  console.log('✅ Added GroupsScreen import');
}

// 2. Add Groups tab to bottom navigation
// Find the bottom tab bar section and add Groups tab
const tabBarRegex = /{activeTab === 'profile' && \([\s\S]*?\)}\s*<\/View>\s*<\/View>\s*{\/\* Bottom Tab Bar \*\/}/;
if (tabBarRegex.test(code)) {
  // Add Groups tab before Profile tab in bottom bar
  code = code.replace(
    /<TouchableOpacity style={styles.bottomTabItem} onPress={\(\) => setActiveTab\('profile'\)}>/,
    `<TouchableOpacity style={styles.bottomTabItem} onPress={() => setActiveTab('groups')}>
          <Text style={[styles.bottomTabIcon, activeTab === 'groups' && styles.bottomTabIconActive]}>👥</Text>
          <Text style={[styles.bottomTabText, activeTab === 'groups' && styles.bottomTabTextActive]}>Groups</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomTabItem} onPress={() => setActiveTab('profile')}>`
  );
  console.log('✅ Added Groups tab to bottom bar');
}

// 3. Add Groups tab content
const groupsTabContent = `
        {/* GROUPS TAB */}
        {activeTab === 'groups' && (
          <GroupsScreen 
            user={user} 
            onRefresh={() => loadUserData(user)}
          />
        )}`;

// Find where other tabs are rendered and add Groups tab
if (!code.includes('activeTab === \'groups\'')) {
  code = code.replace(
    /{activeTab === 'profile' && \(/,
    `${groupsTabContent}
        {activeTab === 'profile' && (`
  );
  console.log('✅ Added Groups tab content');
}

// 4. Remove Group Management section from Profile tab
// Find and remove the Group Management section
const groupManagementSection = code.match(/{\/\* Group Management Section[^*]*\*\/}[\s\S]*?{\/\* Create Group/);
if (groupManagementSection) {
  // Keep the Create Group section but remove the Group Management section
  // We'll remove everything from Group Management to Create Group
  const startIdx = code.indexOf('{/* Group Management Section */}');
  const endIdx = code.indexOf('{/* Create Group - Only show if user has NO group */}');
  
  if (startIdx !== -1 && endIdx !== -1) {
    // Remove the Group Management section, keep Create Group
    // But we want to remove it all since Groups tab handles it
    const sectionToRemove = code.substring(startIdx, endIdx);
    code = code.replace(sectionToRemove, '');
    console.log('✅ Removed Group Management section from Profile tab');
  }
}

// 5. Update Create Group section in Profile tab to show a simpler version
const createGroupSection = code.match(/{\/\* Create Group - Only show if user has NO group \*\/}[\s\S]*?{!hasGroup && !teamId && \([\s\S]*?<\/>}\s*\)}/);
if (createGroupSection) {
  // Replace with a simpler version that directs to Groups tab
  const simpleSection = `{/* Create Group - Only show if user has NO group */}
            {!hasGroup && !teamId && (
              <TouchableOpacity style={styles.settingOptionRow} onPress={() => setActiveTab('groups')}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingOptionTitle}>👥 Manage Groups</Text>
                  <Text style={styles.settingOptionSub}>Create or join a group in the Groups tab</Text>
                </View>
                <Text style={styles.settingOptionArrow}>▶</Text>
              </TouchableOpacity>
            )}`;
  
  code = code.replace(createGroupSection[0], simpleSection);
  console.log('✅ Updated Profile tab with simple group link');
}

fs.writeFileSync('App.js', code);
console.log('✅ All updates applied!');
console.log('');
console.log('📝 Changes made:');
console.log('1. Added GroupsScreen component');
console.log('2. Added Groups tab to bottom navigation');
console.log('3. Moved group management to Groups tab');
console.log('4. Simplified Profile tab group section');
console.log('');
console.log('🚀 New bottom tabs: Home | Dashboard | History | Groups | Profile');
