import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dkpjicqepexhgbrzzreo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7CXIRyhWhmsQfRfj9dDhWw_Z2efV6fx';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// CONFIGURATION
// ============================================================
// Maximum free months a user can earn TOTAL (not per referral)
// Set to 1 month maximum - once earned, no more free months
const MAX_FREE_MONTHS_PER_USER = 1;

// How many free months each successful referral earns
const FREE_MONTHS_PER_REFERRAL = 1;

class ReferralService {
  // ============================================================
  // GENERATE REFERRAL CODE
  // ============================================================
  static async generateReferralCode(userId, userName) {
    try {
      // Check if user already has a referral code
      const { data: existing, error: checkError } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        return {
          success: true,
          message: 'Referral code already exists',
          data: existing
        };
      }

      // Generate a unique code
      const namePart = userName ? userName.substring(0, 3).toUpperCase() : 'REF';
      const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      const code = `${namePart}-${randomPart}`;

      // Insert the referral code
      const { data, error } = await supabase
        .from('referral_codes')
        .insert({
          user_id: userId,
          referral_code: code,
          referral_count: 0,
          free_months_earned: 0,
          referral_rewards_used: 0,
          has_received_reward: false // Track if user already got their free month
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        message: 'Referral code generated successfully',
        data: data
      };
    } catch (error) {
      console.error('Error generating referral code:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================
  // GET REFERRAL CODE
  // ============================================================
  static async getReferralCode(userId) {
    try {
      const { data, error } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error getting referral code:', error);
      return null;
    }
  }

  // ============================================================
  // APPLY REFERRAL CODE
  // ============================================================
  static async applyReferral(code, userId) {
    try {
      // Check if referral code exists and is valid
      const { data: referralData, error: referralError } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('referral_code', code)
        .maybeSingle();

      if (referralError) throw referralError;

      if (!referralData) {
        return {
          success: false,
          error: 'Invalid referral code'
        };
      }

      // Check if user is trying to use their own referral code
      if (referralData.user_id === userId) {
        return {
          success: false,
          error: 'You cannot use your own referral code'
        };
      }

      // Check if user already used a referral code
      const { data: existingUser, error: userError } = await supabase
        .from('referral_usage')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (userError) throw userError;

      if (existingUser) {
        return {
          success: false,
          error: 'You have already used a referral code'
        };
      }

      // Check if the referrer has already received their free month reward
      if (referralData.has_received_reward === true) {
        return {
          success: false,
          error: 'This referrer has already received their free month reward'
        };
      }

      // Check if the referrer has reached the maximum free months limit
      if (referralData.free_months_earned >= MAX_FREE_MONTHS_PER_USER) {
        return {
          success: false,
          error: `This referrer has already earned their free month`
        };
      }

      // Record the referral usage
      const { data: usageData, error: usageError } = await supabase
        .from('referral_usage')
        .insert({
          user_id: userId,
          referrer_id: referralData.user_id,
          referral_code: code,
          status: 'pending'
        })
        .select()
        .single();

      if (usageError) throw usageError;

      return {
        success: true,
        message: 'Referral code applied successfully! Complete your first trip to earn your free month.',
        data: usageData
      };
    } catch (error) {
      console.error('Error applying referral:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================
  // CHECK AND REWARD REFERRAL
  // ============================================================
  static async checkAndRewardReferral(userId) {
    try {
      // Check if this user used a referral code and hasn't been rewarded yet
      const { data: usageData, error: usageError } = await supabase
        .from('referral_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .maybeSingle();

      if (usageError) throw usageError;

      if (!usageData) {
        return {
          success: false,
          message: 'No pending referral to reward'
        };
      }

      // Get the referrer's data
      const { data: referrerData, error: referrerError } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('user_id', usageData.referrer_id)
        .maybeSingle();

      if (referrerError) throw referrerError;

      if (!referrerData) {
        return {
          success: false,
          error: 'Referrer not found'
        };
      }

      // Check if referrer has already received their free month reward
      if (referrerData.has_received_reward === true) {
        // Update usage to 'completed' but don't give reward
        await supabase
          .from('referral_usage')
          .update({ status: 'completed' })
          .eq('id', usageData.id);

        return {
          success: false,
          message: 'Referrer has already received their free month reward'
        };
      }

      // Check if referrer has reached max free months
      if (referrerData.free_months_earned >= MAX_FREE_MONTHS_PER_USER) {
        await supabase
          .from('referral_usage')
          .update({ status: 'completed' })
          .eq('id', usageData.id);

        return {
          success: false,
          message: 'Referrer has already earned their free month'
        };
      }

      // Update referral count and free months earned
      const newFreeMonths = (referrerData.free_months_earned || 0) + FREE_MONTHS_PER_REFERRAL;
      
      const { error: updateError } = await supabase
        .from('referral_codes')
        .update({
          referral_count: (referrerData.referral_count || 0) + 1,
          free_months_earned: newFreeMonths,
          has_received_reward: true, // Mark as received so they can't get more
          last_referral_date: new Date().toISOString()
        })
        .eq('id', referrerData.id);

      if (updateError) throw updateError;

      // Update usage status
      await supabase
        .from('referral_usage')
        .update({ 
          status: 'completed',
          rewarded_at: new Date().toISOString()
        })
        .eq('id', usageData.id);

      // Add to rewards history
      await supabase
        .from('referral_rewards')
        .insert({
          user_id: usageData.referrer_id,
          referred_user_id: userId,
          reward_type: 'free_month',
          amount: FREE_MONTHS_PER_REFERRAL,
          status: 'used',
          created_at: new Date().toISOString()
        });

      // Auto-apply the free month to the referrer's account
      await this.applyFreeMonth(usageData.referrer_id);

      return {
        success: true,
        message: `🎉 Congratulations! You earned 1 free month for referring a friend!`,
        data: {
          totalFreeMonths: newFreeMonths,
          maxReached: true,
          maxLimit: MAX_FREE_MONTHS_PER_USER
        }
      };
    } catch (error) {
      console.error('Error checking and rewarding referral:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================
  // GET REWARDS HISTORY
  // ============================================================
  static async getRewardsHistory(userId) {
    try {
      const { data, error } = await supabase
        .from('referral_rewards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting rewards history:', error);
      return [];
    }
  }

  // ============================================================
  // APPLY FREE MONTH
  // ============================================================
  static async applyFreeMonth(userId) {
    try {
      // Get user's referral info
      const { data: referralData, error: referralError } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (referralError) throw referralError;

      if (!referralData) {
        return {
          success: false,
          error: 'No referral data found'
        };
      }

      // Check if user has any free months available
      const availableMonths = (referralData.free_months_earned || 0) - (referralData.referral_rewards_used || 0);

      if (availableMonths <= 0) {
        return {
          success: false,
          error: 'No free months available'
        };
      }

      // Check if user already used their free month
      if (referralData.referral_rewards_used >= 1) {
        return {
          success: false,
          error: 'You have already used your free month'
        };
      }

      // Update the used count
      const { error: updateError } = await supabase
        .from('referral_codes')
        .update({
          referral_rewards_used: (referralData.referral_rewards_used || 0) + 1,
          has_received_reward: true
        })
        .eq('id', referralData.id);

      if (updateError) throw updateError;

      // Update user's subscription in the team
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      if (profileData?.team_id) {
        // Check current subscription
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('subscription_tier, subscription_end_date')
          .eq('id', profileData.team_id)
          .single();

        if (!teamError && teamData) {
          const currentEndDate = teamData.subscription_end_date ? new Date(teamData.subscription_end_date) : new Date();
          const newEndDate = new Date(currentEndDate);
          newEndDate.setMonth(newEndDate.getMonth() + 1);

          await supabase
            .from('teams')
            .update({
              subscription_tier: 'personal_basic',
              subscription_end_date: newEndDate.toISOString(),
              payment_status: 'active'
            })
            .eq('id', profileData.team_id);
        }
      }

      return {
        success: true,
        message: '✅ Free month applied successfully!'
      };
    } catch (error) {
      console.error('Error applying free month:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================
  // GET REFERRAL STATS (for admin)
  // ============================================================
  static async getReferralStats() {
    try {
      const { data, error } = await supabase
        .from('referral_codes')
        .select('*')
        .order('referral_count', { ascending: false });

      if (error) throw error;

      return {
        totalReferrals: data.length,
        totalFreeMonthsEarned: data.reduce((sum, item) => sum + (item.free_months_earned || 0), 0),
        totalReferralCount: data.reduce((sum, item) => sum + (item.referral_count || 0), 0),
        maxFreeMonths: MAX_FREE_MONTHS_PER_USER,
        data: data
      };
    } catch (error) {
      console.error('Error getting referral stats:', error);
      return null;
    }
  }
}

export default ReferralService;
