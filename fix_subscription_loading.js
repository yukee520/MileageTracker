const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

console.log('🔧 Fixing subscription loading from profile...');

// Find the loadUserData function and add subscription loading from profile
const loadUserDataSection = code.match(/const loadUserData = useCallback\(async \(user\) => \{[\s\S]*?\/\/ Check if user has a valid team[\s\S]*?const hasValidTeam = currentTeamId !== null && currentTeamId !== undefined;[\s\S]*?\/\/ App Admin \(super admin\) - only specific email[\s\S]*?const APP_ADMIN_EMAIL = 'yukeemc@gmail.com';[\s\S]*?const isAppAdminCheck = user\.email === APP_ADMIN_EMAIL;[\s\S]*?setIsAppAdmin\(isAppAdminCheck\);[\s\S]*?\/\/ Group Admin \(leader\) - leader of their group[\s\S]*?const isGroupAdminCheck = hasValidTeam && currentProfile\.role === 'leader';[\s\S]*?setIsAdmin\(isGroupAdminCheck\);[\s\S]*?console\.log\('📧 User email:', user\.email\);[\s\S]*?console\.log\('👑 App Admin check:', isAppAdminCheck, 'for:', user\.email\);[\s\S]*?console\.log\('👥 Group Admin check:', isGroupAdminCheck\);[\s\S]*?setProfile\(currentProfile\);[\s\S]*?setDriverName\(currentProfile\.full_name \|\| ''\);\s+setUserEmail\(currentProfile\.email \|\| ''\);\s+setTeamId\(currentTeamId\);\s+setUserId\(user\.id\);\s+setHasGroup\(hasValidTeam\);/);

if (loadUserDataSection) {
  console.log('✅ Found loadUserData section');
  
  // Find where subscription is being set and add profile subscription loading
  const subscriptionBlock = code.match(/if \(currentTeamId\) \{\s+console\.log\('Fetching team subscription\.\.\.'\);\s+const status = await checkSubscriptionStatus\(currentTeamId\);\s+if \(status\) \{\s+setSubscriptionTier\(status\.tier\);\s+setSubscriptionStatus\(status\.status\);\s+setSubscriptionExpiry\(status\.expiresAt\);\s+console\.log\('Subscription status:', status\);\s+\}\s+\}\s+else \{\s+setTeamMembers\(\[\]\);\s+setGroupMembers\(\[\]\);\s+setHasGroup\(false\);\s+\}/);

  if (subscriptionBlock) {
    console.log('✅ Found subscription block');
    
    // Replace with version that reads from profile first
    const newSubscriptionBlock = `// Check if user has a personal subscription from profile
      const profileTier = currentProfile.subscription_tier || 'personal_free';
      const profileExpiry = currentProfile.subscription_expiry || null;
      
      console.log('📊 Profile subscription tier:', profileTier);
      console.log('📅 Profile subscription expiry:', profileExpiry);
      
      // Map subscription tier to display name
      const tierMap = {
        'personal_free': 'Personal Free',
        'personal_basic': 'Personal Basic',
        'personal_pro': 'Personal Pro',
        'team_basic': 'Group Basic',
        'team_pro': 'Group Pro'
      };
      
      // If user has a personal subscription (Basic or Pro), use it
      if (profileTier && profileTier !== 'personal_free') {
        console.log('📊 Using personal subscription from profile:', profileTier);
        setSubscriptionTier(tierMap[profileTier] || 'Personal Free');
        setSubscriptionStatus('active');
        setSubscriptionExpiry(profileExpiry);
      } else if (currentTeamId) {
        console.log('Fetching team subscription...');
        const status = await checkSubscriptionStatus(currentTeamId);
        if (status) {
          setSubscriptionTier(status.tier);
          setSubscriptionStatus(status.status);
          setSubscriptionExpiry(status.expiresAt);
          console.log('Subscription status:', status);
        }
      } else {
        // No subscription - Personal Free
        console.log('📊 No subscription found - Personal Free');
        setSubscriptionTier('Personal Free');
        setSubscriptionStatus('free');
        setSubscriptionExpiry(null);
      }
      
      if (currentTeamId) {
        // Load team members
        await loadTeamMembers(currentTeamId);
      } else {
        // No team - reset team members
        setTeamMembers([]);
        setGroupMembers([]);
        setHasGroup(false);
      }`;
    
    code = code.replace(subscriptionBlock[0], newSubscriptionBlock);
    console.log('✅ Updated subscription loading logic');
  }
}

fs.writeFileSync('App.js', code);
console.log('✅ Subscription loading fixed');
console.log('');
console.log('📝 Changes:');
console.log('1. loadUserData now reads subscription_tier from profile');
console.log('2. Personal subscriptions (Basic/Pro) are applied from profile');
console.log('3. Team subscriptions are only used for group plans');
console.log('4. Fallback to Personal Free if no subscription found');
