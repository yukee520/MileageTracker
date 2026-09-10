const fs = require('fs');
let code = fs.readFileSync('components/GroupsScreen.js', 'utf8');

console.log('🔧 Adding real-time notifications for join requests...');

// Find where to add the subscription - after the useEffect
const subscriptionCode = `
  // ============================================================
  // REAL-TIME SUBSCRIPTION FOR JOIN REQUESTS
  // ============================================================
  useEffect(() => {
    if (!user?.id || !hasGroup || !isGroupLeader) return;
    
    console.log('📡 Setting up real-time subscription for join requests...');
    
    // Subscribe to new join requests
    const subscription = supabase
      .channel('group_join_requests_' + groupInfo?.id)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_join_requests',
        filter: 'team_id=eq.' + groupInfo?.id
      }, (payload) => {
        console.log('🆕 New join request detected!', payload);
        
        // Show notification alert
        Alert.alert(
          '📨 New Join Request!',
          \`\${payload.new?.profiles?.full_name || 'Someone'} wants to join your group.\`,
          [
            { 
              text: 'View Now', 
              onPress: () => {
                // Refresh the data immediately
                loadGroupData();
              }
            },
            { 
              text: 'Later', 
              style: 'cancel' 
            }
          ]
        );
        
        // Auto-refresh to show the new request
        loadGroupData();
      })
      .subscribe();
    
    return () => {
      console.log('📡 Unsubscribing from join requests...');
      supabase.removeChannel(subscription);
    };
  }, [user?.id, hasGroup, isGroupLeader, groupInfo?.id]);`;

// Insert the subscription after the existing useEffect
const useEffectEnd = code.lastIndexOf('}, []);');
if (useEffectEnd !== -1) {
  // Find the end of the last useEffect
  const insertPosition = useEffectEnd + 6;
  code = code.substring(0, insertPosition) + '\n\n' + subscriptionCode + code.substring(insertPosition);
  console.log('✅ Added real-time subscription with notifications');
}

// Also add the pending request count badge to the Groups tab title
const badgeCode = `
  // ============================================================
  // PENDING REQUEST COUNT
  // ============================================================
  const getPendingCount = () => {
    return pendingRequests.length;
  };`;

// Insert the badge function
code = code.replace(
  /const getMemberCount = \(\) => groupMembers\.length \|\| 1;/,
  `const getMemberCount = () => groupMembers.length || 1;
  ${badgeCode}`
);

fs.writeFileSync('components/GroupsScreen.js', code);
console.log('✅ Real-time notifications added');
