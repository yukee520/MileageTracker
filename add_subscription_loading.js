const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

console.log('🔧 Adding subscription loading to loadUserData...');

// Find where setUserId is called and add subscription loading after it
const insertPoint = code.match(/setUserId\(user\.id\);\s+setHasGroup\(hasValidTeam\);/);

if (insertPoint) {
  console.log('✅ Found insertion point');
  
  const subscriptionCode = `
      // ============================================================
      // LOAD SUBSCRIPTION FROM PROFILE (for personal plans)
      // ============================================================
      // Check if user has a personal subscription from profile
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
        console.log('📊 Checking team subscription...');
        // Team subscription will be loaded below
      } else {
        // No subscription - Personal Free
        console.log('📊 No subscription found - Personal Free');
        setSubscriptionTier('Personal Free');
        setSubscriptionStatus('free');
        setSubscriptionExpiry(null);
      }`;
  
  // Insert the subscription code after setHasGroup
  const replacement = `setUserId(user.id);
      setHasGroup(hasValidTeam);${subscriptionCode}`;
  
  code = code.replace(insertPoint[0], replacement);
  console.log('✅ Added subscription loading');
}

// Also find and update the team subscription loading section
const teamSubscriptionMatch = code.match(/if \(currentTeamId\) \{\s+console\.log\('Fetching team subscription\.\.\.'\);\s+const status = await checkSubscriptionStatus\(currentTeamId\);\s+if \(status\) \{\s+setSubscriptionTier\(status\.tier\);\s+setSubscriptionStatus\(status\.status\);\s+setSubscriptionExpiry\(status\.expiresAt\);\s+console\.log\('Subscription status:', status\);\s+\}\s+\}\s+else \{\s+setTeamMembers\(\[\]\);\s+setGroupMembers\(\[\]\);\s+setHasGroup\(false\);\s+\}/);

if (teamSubscriptionMatch) {
  console.log('✅ Found team subscription loading');
  
  // Update to only load team subscription if personal subscription is not set
  const updatedTeamSection = `if (currentTeamId) {
        // Only load team subscription if user doesn't have a personal subscription
        if (!profileTier || profileTier === 'personal_free') {
          console.log('Fetching team subscription...');
          const status = await checkSubscriptionStatus(currentTeamId);
          if (status) {
            setSubscriptionTier(status.tier);
            setSubscriptionStatus(status.status);
            setSubscriptionExpiry(status.expiresAt);
            console.log('Subscription status:', status);
          }
        } else {
          console.log('📊 Personal subscription already set, skipping team subscription');
        }
        // Load team members
        await loadTeamMembers(currentTeamId);
      } else {
        // No team - reset team members
        setTeamMembers([]);
        setGroupMembers([]);
        setHasGroup(false);
      }`;
  
  code = code.replace(teamSubscriptionMatch[0], updatedTeamSection);
  console.log('✅ Updated team subscription loading');
}

fs.writeFileSync('App.js', code);
console.log('✅ Subscription loading added successfully');
console.log('');
console.log('📝 Changes:');
console.log('1. Added subscription loading from profiles table');
console.log('2. Personal subscriptions (Basic/Pro) are applied from profile');
console.log('3. Team subscriptions only used if no personal subscription');
console.log('4. Fallback to Personal Free if no subscription found');
