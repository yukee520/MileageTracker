const fs = require('fs');
let code = fs.readFileSync('components/GroupsScreen.js', 'utf8');

console.log('🔧 Fixing approve join request to delete instead of update...');

// Find the handleRequest function
const handleRequestMatch = code.match(/const handleRequest = async \(requestId, userId, action\) => \{[\s\S]*?\n  \};/);

if (handleRequestMatch) {
  console.log('✅ Found handleRequest function');
  
  const newHandleRequest = `const handleRequest = async (requestId, userId, action) => {
    try {
      setProcessing(true);
      
      if (action === 'approved') {
        // 1. Get the request details to know which team
        const { data: request, error: requestError } = await supabase
          .from('group_join_requests')
          .select('team_id')
          .eq('id', requestId)
          .single();
        
        if (requestError) throw requestError;
        
        // 2. Add user to team
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ team_id: request.team_id })
          .eq('id', userId);
        
        if (profileError) throw profileError;
        
        // 3. DELETE the join request (instead of updating to approved)
        const { error: deleteError } = await supabase
          .from('group_join_requests')
          .delete()
          .eq('id', requestId);
        
        if (deleteError) throw deleteError;
        
        Alert.alert('Success', 'User approved and added to group');
        
      } else if (action === 'rejected') {
        // For rejected, delete the request too
        const { error: deleteError } = await supabase
          .from('group_join_requests')
          .delete()
          .eq('id', requestId);
        
        if (deleteError) throw deleteError;
        
        Alert.alert('Success', 'Request rejected');
      }
      
      loadGroupData();
      
    } catch (error) {
      console.error('Error handling request:', error);
      Alert.alert('Error', 'Failed to process request: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };`;
  
  code = code.replace(handleRequestMatch[0], newHandleRequest);
  console.log('✅ Updated handleRequest to delete instead of update');
}

fs.writeFileSync('components/GroupsScreen.js', code);
console.log('✅ Fix applied');
