const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

console.log('🔧 Adding fetchPendingCount call in loadUserData...');

// Check if already called
if (code.includes('await fetchPendingCount')) {
  console.log('✅ fetchPendingCount is already called');
} else {
  console.log('⚠️ Adding fetchPendingCount call');
  
  // Find where setHasGroup is called in loadUserData (inside the main function)
  const pattern = /setHasGroup\(hasValidTeam\);\s+console\.log\('📧 User email:', user\.email\);/;
  
  if (pattern.test(code)) {
    console.log('✅ Found insertion point');
    
    const newCall = `setHasGroup(hasValidTeam);
      
      // Fetch pending requests count for group leaders
      const isGroupLeaderCheck = hasValidTeam && (currentProfile.role === 'leader' || currentProfile.role === 'admin');
      console.log('👑 Is Group Leader for badge:', isGroupLeaderCheck);
      if (isGroupLeaderCheck && currentTeamId) {
        await fetchPendingCount(currentTeamId, true);
      } else {
        setPendingRequestsCount(0);
      }
      
      console.log('📧 User email:', user.email);`;
    
    code = code.replace(pattern, newCall);
    console.log('✅ Added fetchPendingCount call');
  } else {
    console.log('⚠️ Pattern not found, trying alternative...');
    
    // Alternative: use sed-style replacement
    const altMatch = code.match(/(\s+)setHasGroup\(hasValidTeam\);/);
    if (altMatch) {
      code = code.replace(
        altMatch[0],
        `${altMatch[1]}setHasGroup(hasValidTeam);
${altMatch[1]}
${altMatch[1]}// Fetch pending requests count for group leaders
${altMatch[1]}const isGroupLeaderCheck = hasValidTeam && (currentProfile.role === 'leader' || currentProfile.role === 'admin');
${altMatch[1]}if (isGroupLeaderCheck && currentTeamId) {
${altMatch[1]}  await fetchPendingCount(currentTeamId, true);
${altMatch[1]}  console.log('📨 Fetched pending count for team:', currentTeamId);
${altMatch[1]}} else {
${altMatch[1]}  setPendingRequestsCount(0);
${altMatch[1]}}`
      );
      console.log('✅ Added fetchPendingCount call (alternative)');
    }
  }
}

fs.writeFileSync('App.js', code);
console.log('✅ App.js updated');
