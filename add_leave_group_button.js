const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

// Find the Group Management section and add Leave Group button
const groupManagementMatch = code.match(/{\/\* Group Management Section[^*]*\*\/}[\s\S]*?<\/View>\s*}\);/);
if (groupManagementMatch) {
  const updatedSection = groupManagementMatch[0].replace(
    /<\/TouchableOpacity>\s*<\/View>\s*}\)/,
    `</TouchableOpacity>
                
                {!isAdmin && (
                  <TouchableOpacity 
                    style={[styles.btn, { backgroundColor: '#dc3545', marginTop: 8 }]} 
                    onPress={handleLeaveGroup}
                  >
                    <Text style={styles.btnText}>🚪 Leave Group</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}`
  );
  
  code = code.replace(groupManagementMatch[0], updatedSection);
  console.log('✅ Added Leave Group button');
}

// Add handleLeaveGroup function
const leaveGroupFunction = `
  // ============================================================
  // LEAVE GROUP
  // ============================================================
  const handleLeaveGroup = () => {
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              // Update user's profile
              const { error } = await supabase
                .from('profiles')
                .update({ team_id: null, role: 'member' })
                .eq('id', user.id);
              
              if (error) throw error;
              
              setTeamId(null);
              setIsAdmin(false);
              setHasGroup(false);
              setTeamMembers([]);
              setGroupMembers([]);
              
              Alert.alert('Success', 'You have left the group.');
              loadUserData(user);
            } catch (error) {
              console.error('Error leaving group:', error);
              Alert.alert('Error', 'Failed to leave group: ' + error.message);
            }
          }
        }
      ]
    );
  };
`;

// Add the function before the render section
if (!code.includes('handleLeaveGroup')) {
  code = code.replace(
    /const handleAdminGroupPanel = \(\) => \{/,
    `${leaveGroupFunction}
  const handleAdminGroupPanel = () => {`
  );
  console.log('✅ Added handleLeaveGroup function');
}

fs.writeFileSync('App.js', code);
console.log('✅ All fixes applied!');
