const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

console.log('🔧 Lifting pending count to App.js level...');

// Find where loadUserData is defined
// We need to fetch pending count in loadUserData, not in GroupsScreen

// Add the fetch for pending requests directly in App.js loadUserData
const fetchPendingPattern = /setHasGroup\(hasValidTeam\);\s+console\.log\('📧 User email:', user\.email\);/;

if (fetchPendingPattern.test(code)) {
  console.log('✅ Found insertion point in loadUserData');
  
  const newCode = `setHasGroup(hasValidTeam);
      
      // Fetch pending requests count for leaders (for badge display)
      if (hasValidTeam && currentProfile.role === 'leader' && currentTeamId) {
        try {
          const { count } = await supabase
            .from('group_join_requests')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', currentTeamId)
            .eq('status', 'pending');
          setPendingRequestsCount(count || 0);
          console.log('📨 Pending requests count (App.js):', count);
        } catch (e) {
          console.log('Error fetching pending count:', e);
        }
      } else {
        setPendingRequestsCount(0);
      }
      
      console.log('📧 User email:', user.email);`;
  
  code = code.replace(fetchPendingPattern, newCode);
  console.log('✅ Added pending count fetch in App.js');
}

// Add a real-time subscription in App.js for the leader's team
const realtimePattern = /const \{ data: \{ subscription \} \} = supabase\.auth\.onAuthStateChange\(/;

if (realtimePattern.test(code)) {
  // Insert a useEffect before the auth effect
  const realtimeEffect = `
  // ============================================================
  // REAL-TIME SUBSCRIPTION FOR PENDING REQUESTS COUNT
  // ============================================================
  useEffect(() => {
    if (!user?.id || !teamId || !isAdmin) return;
    
    console.log('📡 App.js: Setting up pending requests subscription...');
    
    const channel = supabase
      .channel('pending_requests_count_' + teamId)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'group_join_requests',
        filter: 'team_id=eq.' + teamId
      }, async (payload) => {
        console.log('🔄 Pending request change detected:', payload.eventType);
        // Refetch the count
        const { count } = await supabase
          .from('group_join_requests')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', teamId)
          .eq('status', 'pending');
        setPendingRequestsCount(count || 0);
        console.log('📨 Updated pending count:', count);
        
        // Show notification for new requests
        if (payload.eventType === 'INSERT') {
          Alert.alert(
            '📨 New Join Request!',
            'Someone wants to join your group.',
            [{ text: 'OK' }]
          );
        }
      })
      .subscribe();
    
    return () => {
      console.log('📡 App.js: Unsubscribing from pending requests...');
      supabase.removeChannel(channel);
    };
  }, [user?.id, teamId, isAdmin]);
`;
  
  code = code.replace(realtimePattern, realtimeEffect + '\n' + realtimePattern);
  console.log('✅ Added real-time subscription in App.js');
}

fs.writeFileSync('App.js', code);
console.log('✅ App.js updated with real-time pending count');
