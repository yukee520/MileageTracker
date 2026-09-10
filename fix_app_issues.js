const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

console.log('🔧 Fixing App.js issues...');

// 1. Add pendingRequestsCount state
if (!code.includes('const [pendingRequestsCount')) {
  code = code.replace(
    /const \[isAppAdmin, setIsAppAdmin\] = useState\(false\);/,
    `const [isAppAdmin, setIsAppAdmin] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);`
  );
  console.log('✅ Added pendingRequestsCount state');
}

// 2. Fix the missing comma after editCategoryTextActive
code = code.replace(
  /editCategoryTextActive: \{ color: '#fff' \}\s*\n\s*\n\s*badgeContainer:/,
  `editCategoryTextActive: { color: '#fff' },
  
  badgeContainer:`
);
console.log('✅ Fixed missing comma after editCategoryTextActive');

// 3. Fix the closing brace issue - replace `},});` with `},\n});`
code = code.replace(
  /badgeText: \{\s*color: '#fff',\s*fontSize: 10,\s*fontWeight: 'bold',\s*\},\}\);/,
  `badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});`
);
console.log('✅ Fixed closing brace of styles object');

// 4. Add fetchPendingCount function and call it
if (!code.includes('fetchPendingCount')) {
  // Add the function before loadTrips
  code = code.replace(
    /  \/\/ ============================================================\s+  \/\/ LOAD TRIPS/,
    `  // ============================================================
  // FETCH PENDING REQUESTS COUNT
  // ============================================================
  const fetchPendingCount = async (teamId, isLeader) => {
    if (!teamId || !isLeader) {
      setPendingRequestsCount(0);
      return;
    }
    
    try {
      const { count, error } = await supabase
        .from('group_join_requests')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('status', 'pending');
      
      if (!error) {
        setPendingRequestsCount(count || 0);
        console.log('📨 Pending requests count:', count);
      }
    } catch (error) {
      console.error('Error fetching pending count:', error);
    }
  };

  // ============================================================
  // LOAD TRIPS`
  );
  console.log('✅ Added fetchPendingCount function');
  
  // Call fetchPendingCount in loadUserData after setHasGroup
  code = code.replace(
    /setHasGroup\(hasValidTeam\);\s+console\.log\('📧 User email:', user\.email\);/,
    `setHasGroup(hasValidTeam);
      
      // Fetch pending requests count if user is a group leader
      const isGroupLeader = hasValidTeam && currentProfile.role === 'leader';
      if (isGroupLeader && currentTeamId) {
        await fetchPendingCount(currentTeamId, true);
      } else {
        setPendingRequestsCount(0);
      }
      
      console.log('📧 User email:', user.email);`
  );
  console.log('✅ Added fetchPendingCount call in loadUserData');
}

fs.writeFileSync('App.js', code);
console.log('✅ All fixes applied');
console.log('');
console.log('📝 Changes:');
console.log('1. Added pendingRequestsCount state');
console.log('2. Fixed missing comma after editCategoryTextActive');
console.log('3. Fixed closing brace of styles object');
console.log('4. Added fetchPendingCount function');
console.log('5. Added fetchPendingCount call in loadUserData');
