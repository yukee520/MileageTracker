const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

console.log('🔧 Adding Groups button to bottom navigation...');

// Find the bottom tab bar section
const bottomBarRegex = /<View style={styles.bottomTabBar}>[\s\S]*?<\/View>/;
const bottomBarMatch = code.match(bottomBarRegex);

if (bottomBarMatch) {
  let bottomBar = bottomBarMatch[0];
  
  // Check if Groups button already exists
  if (!bottomBar.includes("setActiveTab('groups')")) {
    console.log('❌ Groups button missing - adding it');
    
    // Add Groups button before Profile button
    const groupsButton = `
        <TouchableOpacity style={styles.bottomTabItem} onPress={() => setActiveTab('groups')}>
          <Text style={[styles.bottomTabIcon, activeTab === 'groups' && styles.bottomTabIconActive]}>👥</Text>
          <Text style={[styles.bottomTabText, activeTab === 'groups' && styles.bottomTabTextActive]}>Groups</Text>
        </TouchableOpacity>`;
    
    // Replace the Profile button with Groups + Profile
    bottomBar = bottomBar.replace(
      /<TouchableOpacity style={styles.bottomTabItem} onPress={\(\) => setActiveTab\('profile'\)}>/,
      `${groupsButton}
        <TouchableOpacity style={styles.bottomTabItem} onPress={() => setActiveTab('profile')}>`
    );
    
    code = code.replace(bottomBarMatch[0], bottomBar);
    console.log('✅ Added Groups button to bottom navigation');
  } else {
    console.log('✅ Groups button already exists');
  }
}

// Also check if Groups tab content exists
if (!code.includes("activeTab === 'groups'")) {
  console.log('❌ Groups tab content missing - adding it');
  
  const groupsContent = `
        {/* GROUPS TAB */}
        {activeTab === 'groups' && (
          <GroupsScreen 
            user={user} 
            onRefresh={() => loadUserData(user)}
          />
        )}`;
  
  // Add before Profile tab
  code = code.replace(
    /{activeTab === 'profile' && \(/,
    `${groupsContent}
        {activeTab === 'profile' && (`
  );
  console.log('✅ Added Groups tab content');
}

fs.writeFileSync('App.js', code);
console.log('');
console.log('✅ Bottom navigation updated!');
console.log('');
console.log('📝 New bottom navigation:');
console.log('  🏠 Home | 📊 Dashboard | 📋 History | 👥 Groups | 👤 Profile');
