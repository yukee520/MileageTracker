const fs = require('fs');
let code = fs.readFileSync('components/GroupsScreen.js', 'utf8');

// Find the dismiss group function and update it
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

              // Step 2: Remove all members from the group
              console.log('👥 Removing', members?.length || 0, 'members...');
              for (const member of members || []) {
                await supabase
                  .from('profiles')
                  .update({ team_id: null, role: 'member' })
                  .eq('id', member.id);
              }

              // Step 3: Delete all join requests
              console.log('📨 Deleting join requests...');
              const { error: requestsError } = await supabase
                .from('group_join_requests')
                .delete()
                .eq('team_id', teamId);

              if (requestsError) {
                console.error('❌ Error deleting join requests:', requestsError);
                // Continue anyway
              }

              // Step 4: Delete the team
              console.log('🗑️ Deleting team...');
              const { error: deleteError } = await supabase
                .from('teams')
                .delete()
                .eq('id', teamId);

              if (deleteError) {
                console.error('❌ Error deleting team:', deleteError);
                // If delete fails because of foreign key, try to force delete
                if (deleteError.code === '23503') {
                  console.log('⚠️ Foreign key constraint, trying to clean up...');
                  // Delete all join requests first (again)
                  await supabase
                    .from('group_join_requests')
                    .delete()
                    .eq('team_id', teamId);
                  // Then try deleting the team again
                  const { error: retryError } = await supabase
                    .from('teams')
                    .delete()
                    .eq('id', teamId);
                  if (retryError) throw retryError;
                } else {
                  throw deleteError;
                }
              }

              // Step 5: Reset state
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
  console.log('✅ Updated handleDismissGroup with better cleanup');
}

fs.writeFileSync('components/GroupsScreen.js', code);
console.log('✅ Dismiss group fix applied');
