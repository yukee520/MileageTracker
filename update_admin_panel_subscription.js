const fs = require('fs');
let code = fs.readFileSync('components/AdminGroupPanel.js', 'utf8');

console.log('🔧 Adding real-time subscription to AdminGroupPanel...');

// Add subscription for admin panel
const subscriptionCode = `
  // ============================================================
  // REAL-TIME SUBSCRIPTION FOR ADMIN
  // ============================================================
  useEffect(() => {
    if (!teamId) return;
    
    console.log('📡 AdminPanel: Setting up real-time subscription...');
    
    const subscription = supabase
      .channel('admin_group_requests_' + teamId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_join_requests',
        filter: 'team_id=eq.' + teamId
      }, (payload) => {
        console.log('🆕 AdminPanel: New join request detected!');
        loadData();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [teamId]);`;

// Insert after the useEffect
const useEffectEnd = code.lastIndexOf('}, []);');
if (useEffectEnd !== -1) {
  const insertPosition = useEffectEnd + 6;
  code = code.substring(0, insertPosition) + '\n\n' + subscriptionCode + code.substring(insertPosition);
  console.log('✅ Added real-time subscription to AdminGroupPanel');
}

fs.writeFileSync('components/AdminGroupPanel.js', code);
console.log('✅ AdminGroupPanel subscription added');
