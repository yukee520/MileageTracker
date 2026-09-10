const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

console.log('🔧 Adding pending request badge to Groups tab...');

// Find the Groups tab in bottom navigation
const groupsTabRegex = /<TouchableOpacity style={styles\.bottomTabItem} onPress={\(\) => setActiveTab\('groups'\)}>[\s\S]*?<\/TouchableOpacity>/;
const groupsTabMatch = code.match(groupsTabRegex);

if (groupsTabMatch) {
  console.log('✅ Found Groups tab');
  
  // Add badge with pending count
  const newTab = groupsTabMatch[0].replace(
    /<Text style={\[styles\.bottomTabIcon, activeTab === 'groups' && styles\.bottomTabIconActive\]}>👥<\/Text>/,
    `<Text style={[styles.bottomTabIcon, activeTab === 'groups' && styles.bottomTabIconActive]}>👥</Text>
          {pendingRequestsCount > 0 && (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{pendingRequestsCount}</Text>
            </View>
          )}`
  );
  
  code = code.replace(groupsTabMatch[0], newTab);
  console.log('✅ Added badge to Groups tab');
}

// Add badge styles
const stylesEnd = code.lastIndexOf('});');
if (stylesEnd !== -1) {
  const badgeStyles = `
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#dc3545',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },`;
  
  code = code.substring(0, stylesEnd) + badgeStyles + code.substring(stylesEnd);
  console.log('✅ Added badge styles');
}

fs.writeFileSync('App.js', code);
console.log('✅ Tab badge added');
