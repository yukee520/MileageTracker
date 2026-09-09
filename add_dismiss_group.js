const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

// Add dismiss group function
const dismissGroupFunction = `
  // ============================================================
  // DISMISS GROUP (Admin only)
  // ============================================================
  const handleDismissGroup = () => {
    Alert.alert(
      'Dismiss Group',
      '⚠️ Warning: This will permanently delete the group and remove all members.\\n\\nAll members will be moved to personal plans.\\n\\nAre you sure you want to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Dismiss Group',
          style: 'destructive',
          onPress: async () => {
            try {
              // Get all members in the group
              const { data: members, error: membersError } = await supabase
                .from('profiles')
                .select('id')
                .eq('team_id', teamId);

              if (membersError) throw membersError;

              // Remove ALL members from the group
              for (const member of members || []) {
                await supabase
                  .from('profiles')
                  .update({
                    team_id: null,
                    role: 'member'
                  })
                  .eq('id', member.id);
              }

              // Delete the team/group
              const { error: deleteError } = await supabase
                .from('teams')
                .delete()
                .eq('id', teamId);

              if (deleteError) throw deleteError;

              // Reset state
              setTeamId(null);
              setIsAdmin(false);
              setHasGroup(false);
              setTeamMembers([]);
              setGroupMembers([]);
              setSubscriptionTier('Personal Free');

              Alert.alert('Success', 'Group has been dismissed. All members have been moved to personal plans.');
              loadUserData(user);
            } catch (error) {
              console.error('Error dismissing group:', error);
              Alert.alert('Error', 'Failed to dismiss group: ' + error.message);
            }
          }
        }
      ]
    );
  };
`;

// Add dismiss group function before handleLeaveGroup if not exists
if (!code.includes('handleDismissGroup')) {
  code = code.replace(
    /const handleLeaveGroup = \(\) => \{/,
    `${dismissGroupFunction}
  const handleLeaveGroup = () => {`
  );
  console.log('✅ Added handleDismissGroup function');
}

// Add Dismiss Group button in Group Management section for admins
const dismissButton = `
                {isAdmin && (
                  <TouchableOpacity 
                    style={[styles.btn, { backgroundColor: '#dc3545', marginTop: 8 }]} 
                    onPress={handleDismissGroup}
                  >
                    <Text style={styles.btnText}>🗑️ Dismiss Group</Text>
                  </TouchableOpacity>
                )}`;

// Find where Leave Group button is and add Dismiss Group button next to it
if (code.includes('Leave Group') && code.includes('isAdmin')) {
  // Check if Dismiss Group already exists
  if (!code.includes('Dismiss Group')) {
    code = code.replace(
      /{!isAdmin && \(/,
      `${dismissButton}
                {!isAdmin && (`
    );
    console.log('✅ Added Dismiss Group button for admins');
  }
}

fs.writeFileSync('App.js', code);
console.log('✅ All fixes applied!');
