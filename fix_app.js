const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

// 1. Fix performTierUpgrade function
const oldPerform = code.match(/const performTierUpgrade = async \(newTier\) => \{[\s\S]*?\n  \};/);
if (oldPerform) {
  const newPerform = `const performTierUpgrade = async (newTier) => {
    try {
      setPaymentLoading(true);
      const config = TIER_CONFIG[newTier];
      if (!config) {
        Alert.alert('Error', 'Invalid subscription tier');
        return;
      }

      // Check if this is a downgrade from group to personal
      const isGroupToPersonal = 
        (subscriptionTier === 'Group Basic' || subscriptionTier === 'Group Pro') && 
        (newTier === 'Personal Free' || newTier === 'Personal Basic' || newTier === 'Personal Pro');

      // Update team subscription
      const { error } = await supabase
        .from('teams')
        .update({
          subscription_tier: config.db_tier,
          monthly_trip_limit: config.limit,
          max_members: config.maxMembers || 1
        })
        .eq('id', teamId);

      if (error) throw error;

      // If downgrading from group to personal, remove user from group
      if (isGroupToPersonal) {
        // Update user's profile to leave the group
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            team_id: null,
            role: 'member'
          })
          .eq('id', user.id);

        if (profileError) throw profileError;

        // Also remove all other members from the group
        const { data: members, error: membersError } = await supabase
          .from('profiles')
          .select('id')
          .eq('team_id', teamId)
          .neq('id', user.id);

        if (membersError) throw membersError;

        // For each member, remove them from the group
        for (const member of members || []) {
          await supabase
            .from('profiles')
            .update({
              team_id: null,
              role: 'member'
            })
            .eq('id', member.id);
        }

        // Reset state
        setTeamId(null);
        setIsAdmin(false);
        setHasGroup(false);
        setTeamMembers([]);
        setGroupMembers([]);

        Alert.alert(
          'Group Downgraded',
          'You have been removed from the group. All members have been moved to personal plans.'
        );
      }

      setSubscriptionTier(newTier);
      await loadUserData(user);
      setShowSubscriptionModal(false);
      Alert.alert('Success', \`You are now on the \${newTier} plan!\`);
    } catch (error) {
      console.error('Error upgrading tier:', error);
      Alert.alert('Error', 'Failed to upgrade subscription: ' + error.message);
    } finally {
      setPaymentLoading(false);
      setShowSubscriptionModal(false);
    }
  };`;
  
  code = code.replace(oldPerform[0], newPerform);
  console.log('✅ Updated performTierUpgrade');
}

// 2. Fix handleUpgradeTier to handle group downgrades
const oldHandle = code.match(/const handleUpgradeTier = async \(newTier\) => \{[\s\S]*?\n  \};/);
if (oldHandle) {
  const newHandle = `const handleUpgradeTier = async (newTier) => {
    console.log('Initiating upgrade to tier:', newTier);

    const paidTiers = ['Personal Basic', 'Personal Pro'];
    const groupTiers = ['Group Basic', 'Group Pro'];
    const isNewTierPaid = paidTiers.includes(newTier);
    const isCurrentTierPaid = paidTiers.includes(subscriptionTier);
    const isCurrentGroup = groupTiers.includes(subscriptionTier);
    const isNewGroup = groupTiers.includes(newTier);

    // If downgrading from group to personal, confirm with user
    if (isCurrentGroup && !isNewGroup) {
      Alert.alert(
        '⚠️ Warning: Leaving Group',
        'You are about to leave the group and downgrade to a personal plan.\\n\\nAll group members will be removed from the group and moved to personal plans.\\n\\nAre you sure you want to continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes, Leave Group',
            style: 'destructive',
            onPress: async () => {
              const status = await checkSubscriptionStatus(teamId);
              if (status && status.isActive && status.status === 'active') {
                const expiryDate = status.expiresAt ? new Date(status.expiresAt).toLocaleDateString() : 'Unknown';
                Alert.alert(
                  'Active Subscription',
                  \`You have an active group subscription until \${expiryDate}. You can downgrade after it expires.\`
                );
                return;
              }
              await performTierUpgrade(newTier);
            }
          }
        ]
      );
      return;
    }

    // Group plans are handled in AdminGroupPanel
    if (newTier === 'Group Basic' || newTier === 'Group Pro') {
      Alert.alert(
        'Group Plan',
        'Group plans can only be purchased by group admins.\\n\\nPlease go to Group Management → Pay for Members.'
      );
      return;
    }

    if (isCurrentTierPaid && !isNewTierPaid) {
      const status = await checkSubscriptionStatus(teamId);
      if (status && status.isActive && status.status === 'active') {
        const expiryDate = status.expiresAt ? new Date(status.expiresAt).toLocaleDateString() : 'Unknown';
        Alert.alert(
          'Cannot Downgrade',
          \`You have an active \${subscriptionTier} subscription until \${expiryDate}.\`
        );
        return;
      }
    }

    if (isNewTierPaid) {
      if (subscriptionTier === newTier) {
        Alert.alert('Already Subscribed', \`You are already on the \${newTier} plan.\`);
        return;
      }
      setPendingTierUpgrade(newTier);
      setShowPaymentModal(true);
    } else {
      const status = await checkSubscriptionStatus(teamId);
      if (status && status.isActive && status.status === 'active') {
        Alert.alert('Cannot Downgrade', \`You have an active \${subscriptionTier} subscription. Please wait until it expires.\`);
        return;
      }
      await performTierUpgrade(newTier);
    }
  };`;
  
  code = code.replace(oldHandle[0], newHandle);
  console.log('✅ Updated handleUpgradeTier');
}

fs.writeFileSync('App.js', code);
console.log('✅ Fixes applied successfully!');
