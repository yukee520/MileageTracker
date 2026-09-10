const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

console.log('🔧 Adding missing Groups tab content...');

// Find where the Groups tab content should be rendered
// Look for the pattern after the tracking tab

// Check if Groups tab content exists
if (!code.includes('activeTab === \'groups\' && (')) {
  console.log('❌ Groups tab content missing - adding it...');
  
  // Find the tracking tab end and profile tab start
  const trackingEnd = code.indexOf('{/* TRACKING TAB */}');
  const profileStart = code.indexOf('{/* PROFILE TAB */}');
  
  if (trackingEnd !== -1 && profileStart !== -1) {
    // Find the end of the tracking tab
    const trackingTabEnd = code.indexOf('        )}\n          </ScrollView>\n        )}\n      </View>', trackingEnd);
    
    if (trackingTabEnd !== -1) {
      // Insert Groups tab content before Profile tab
      const insertPoint = code.indexOf('{/* PROFILE TAB */}');
      
      const groupsTabContent = `
        {/* GROUPS TAB */}
        {activeTab === 'groups' && (
          <GroupsScreen 
            user={user} 
            onRefresh={() => loadUserData(user)}
          />
        )}`;
      
      code = code.substring(0, insertPoint) + groupsTabContent + code.substring(insertPoint);
      console.log('✅ Added Groups tab content');
    } else {
      // Alternative: find the end of the tracking tab differently
      const trackingSection = code.substring(trackingEnd, profileStart);
      const endOfTracking = trackingSection.lastIndexOf('</View>');
      
      if (endOfTracking !== -1) {
        const insertPoint = trackingEnd + endOfTracking + 7;
        const groupsTabContent = `
        {/* GROUPS TAB */}
        {activeTab === 'groups' && (
          <GroupsScreen 
            user={user} 
            onRefresh={() => loadUserData(user)}
          />
        )}`;
        
        code = code.substring(0, insertPoint) + groupsTabContent + code.substring(insertPoint);
        console.log('✅ Added Groups tab content (alternative method)');
      }
    }
  }
} else {
  console.log('✅ Groups tab content already exists');
}

fs.writeFileSync('App.js', code);
console.log('✅ Groups tab content fixed');
