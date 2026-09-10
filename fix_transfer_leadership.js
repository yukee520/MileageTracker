const fs = require('fs');
let code = fs.readFileSync('components/GroupsScreen.js', 'utf8');

// Fix the handleTransferLeadership function
const transferFunction = code.match(/const handleTransferLeadership = \(member\) => \{[\s\S]*?\n  \};/);
if (transferFunction) {
  const fixedTransfer = `const handleTransferLeadership = (member) => {
    Alert.alert(
      'Transfer Leadership',
      \`Transfer group leadership to \${member.full_name || member.email}?\`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer',
          onPress: async () => {
            try {
              setProcessing(true);
              
              // First, demote current leader
              const { error: demoteError } = await supabase
                .from('profiles')
                .update({ role: 'member' })
                .eq('id', user.id);
              
              if (demoteError) throw demoteError;
              
              // Then promote new leader
              const { error: promoteError } = await supabase
                .from('profiles')
                .update({ role: 'leader' })
                .eq('id', member.id);
              
              if (promoteError) throw promoteError;
              
              // Update team's created_by
              const { error: teamError } = await supabase
                .from('teams')
                .update({ created_by: member.id })
                .eq('id', groupInfo?.id);
              
              if (teamError) throw teamError;
              
              setIsGroupLeader(false);
              Alert.alert('Success', \`Leadership transferred to \${member.full_name || member.email}\`);
              
              // Reload data without causing a sign-out
              await loadGroupData();
              
            } catch (error) {
              console.error('Error transferring leadership:', error);
              Alert.alert('Error', 'Failed to transfer leadership: ' + error.message);
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  };`;
  
  code = code.replace(transferFunction[0], fixedTransfer);
  console.log('✅ Fixed handleTransferLeadership');
}

fs.writeFileSync('components/GroupsScreen.js', code);
console.log('✅ Transfer leadership fix applied');
