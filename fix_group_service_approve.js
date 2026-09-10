const fs = require('fs');
let code = fs.readFileSync('services/GroupService.js', 'utf8');

console.log('🔧 Fixing GroupService handleJoinRequest...');

// Find the handleJoinRequest function
const handleJoinMatch = code.match(/static async handleJoinRequest\(requestId, teamId, userId, action\) \{[\s\S]*?\n  \}/);

if (handleJoinMatch) {
  console.log('✅ Found handleJoinRequest in GroupService');
  
  const newHandleJoin = `static async handleJoinRequest(requestId, teamId, userId, action) {
    try {
      if (action === 'approved') {
        // Add user to team
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ team_id: teamId })
          .eq('id', userId);

        if (profileError) throw profileError;
      }

      // DELETE the join request (for both approved and rejected)
      const { error: deleteError } = await supabase
        .from('group_join_requests')
        .delete()
        .eq('id', requestId);

      if (deleteError) throw deleteError;

      return { success: true };
    } catch (error) {
      console.error('Error handling join request:', error);
      return { success: false, error: error.message };
    }
  }`;
  
  code = code.replace(handleJoinMatch[0], newHandleJoin);
  console.log('✅ Updated GroupService handleJoinRequest');
}

fs.writeFileSync('services/GroupService.js', code);
console.log('✅ GroupService fix applied');
