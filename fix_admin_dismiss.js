const fs = require('fs');
let code = fs.readFileSync('components/AdminGroupPanel.js', 'utf8');

// Check if dismiss function exists in AdminGroupPanel
const dismissMatch = code.match(/const handleDismissGroup = \(\) => \{[\s\S]*?\n  \};/);
if (dismissMatch) {
  const newDismiss = `const handleDismissGroup = () => {
    Alert.alert(
      'Dismiss Group',
      '⚠️ Warning: This will permanently delete the group and remove all members.\\n\\nAll join requests will also be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Dismiss',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessing(true);
              const teamId = groupInfo?.id;
              
              if (!teamId) {
                Alert.alert('Error', 'No group found to dismiss');
                setProcessing(false);
                return;
              }
              
              console.log('🗑️ Dismissing group:', teamId);
              
              // Step 1: Get all members
              const { data: members, error: membersError } = await supabase
                .from('profiles')
                .select('id')
                .eq('team_id', teamId);

              if (membersError) throw membersError;

              // Step 2: Remove all members
              for (const member of members || []) {
                await supabase
                  .from('profiles')
                  .update({ team_id: null, role: 'member' })
                  .eq('id', member.id);
              }

              // Step 3: Delete all join requests
              await supabase
                .from('group_join_requests')
                .delete()
                .eq('team_id', teamId);

              // Step 4: Delete the team
              const { error: deleteError } = await supabase
                .from('teams')
                .delete()
                .eq('id', teamId);

              if (deleteError) throw deleteError;

              setHasGroup(false);
              setGroupInfo(null);
              setGroupMembers([]);
              setPendingRequests([]);
              setIsGroupLeader(false);
              
              Alert.alert('Success', 'Group has been dismissed successfully.');
              loadGroupData();
              
            } catch (error) {
              console.error('❌ Error dismissing group:', error);
              Alert.alert('Error', 'Failed to dismiss group: ' + error.message);
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  };`;
  
  code = code.replace(dismissMatch[0], newDismiss);
  console.log('✅ Updated AdminGroupPanel dismiss function');
}

fs.writeFileSync('components/AdminGroupPanel.js', code);
console.log('✅ AdminGroupPanel dismiss fix applied');
