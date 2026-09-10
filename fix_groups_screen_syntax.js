const fs = require('fs');
let code = fs.readFileSync('components/GroupsScreen.js', 'utf8');

console.log('🔧 Fixing syntax error in GroupsScreen.js...');

// The error is that the return statement for !hasGroup is not properly formatted
// We need to ensure the JSX is properly structured

// Find and fix the problematic section
const hasGroupCheck = code.match(/if \(!hasGroup\) \{[\s\S]*?return \([\s\S]*?<ScrollView[\s\S]*?<\/ScrollView>[\s\S]*?\);/);
if (hasGroupCheck) {
  console.log('✅ Found the problematic section, fixing...');
  
  // The issue is that the return statement is missing proper JSX structure
  // Let's replace the entire section
  const fixedSection = `if (!hasGroup) {
    return (
      <ScrollView 
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefreshPull} />}
      >
        <View style={styles.noGroupContainer}>
          <Text style={styles.noGroupIcon}>👥</Text>
          <Text style={styles.noGroupTitle}>No Group Yet</Text>
          <Text style={styles.noGroupSubtitle}>
            Join an existing group or create your own to collaborate with team members.
          </Text>

          <TouchableOpacity 
            style={[styles.actionCard, styles.createCard]}
            onPress={() => setShowCreateGroup(true)}
          >
            <Text style={styles.actionIcon}>🚀</Text>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Create a Group</Text>
              <Text style={styles.actionSubtitle}>Start your own group and become an admin</Text>
            </View>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, styles.joinCard]}
            onPress={() => setShowSearchGroup(true)}
          >
            <Text style={styles.actionIcon}>🔍</Text>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Join a Group</Text>
              <Text style={styles.actionSubtitle}>Search and request to join an existing group</Text>
            </View>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {showCreateGroup && (
          <CreateGroupScreen
            user={user}
            onClose={() => { setShowCreateGroup(false); loadGroupData(); }}
            onGroupCreated={() => { setShowCreateGroup(false); loadGroupData(); }}
          />
        )}

        {showSearchGroup && (
          <GroupSearchScreen
            user={user}
            onClose={() => { setShowSearchGroup(false); loadGroupData(); }}
            onJoinGroup={() => { setShowSearchGroup(false); loadGroupData(); }}
          />
        )}
      </ScrollView>
    );
  }`;
  
  code = code.replace(hasGroupCheck[0], fixedSection);
  console.log('✅ Fixed !hasGroup return statement');
}

// Also fix the loading return statement
const loadingCheck = code.match(/if \(loading\) \{[\s\S]*?return \([\s\S]*?\);/);
if (loadingCheck && loadingCheck[0].includes('loadingContainer')) {
  console.log('✅ Loading return statement looks OK');
}

fs.writeFileSync('components/GroupsScreen.js', code);
console.log('');
console.log('✅ Syntax error fixed!');
