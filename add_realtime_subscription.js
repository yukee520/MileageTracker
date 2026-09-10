const fs = require('fs');
let code = fs.readFileSync('components/GroupsScreen.js', 'utf8');

console.log('🔧 Adding real-time subscription...');

// Add a real-time subscription for group changes
const subscriptionCode = `
  // ============================================================
  // REAL-TIME SUBSCRIPTION
  // ============================================================
  useEffect(() => {
    if (!user?.id || !hasGroup) return;
    
    console.log('📡 Setting up real-time subscription for group changes...');
    
    // Subscribe to changes in group_join_requests
    const subscription = supabase
      .channel('group_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'group_join_requests',
        filter: 'team_id=eq.' + groupInfo?.id
      }, (payload) => {
        console.log('🔄 Group change detected:', payload);
        // Refresh group data when a change occurs
        loadGroupData();
      })
      .subscribe();
    
    return () => {
      console.log('📡 Unsubscribing from group updates...');
      supabase.removeChannel(subscription);
    };
  }, [user?.id, hasGroup, groupInfo?.id]);`;

// Insert the subscription after the existing useEffect
const useEffects = code.match(/useEffect\(\(\) => \{[\s\S]*?\}, \[\]\);/g);
if (useEffects && useEffects.length > 0) {
  const lastEffect = useEffects[useEffects.length - 1];
  const insertIndex = code.indexOf(lastEffect) + lastEffect.length;
  
  // Add the subscription code
  code = code.substring(0, insertIndex) + '\n\n' + subscriptionCode + code.substring(insertIndex);
  console.log('✅ Added real-time subscription');
}

fs.writeFileSync('components/GroupsScreen.js', code);
console.log('✅ Real-time subscription added');
