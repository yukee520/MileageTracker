import { supabase } from '../supabaseClient';

class ReferralService {
  /**
   * Get user's referral code
   */
  async getReferralCode(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('referral_code, referral_count, free_months_earned, referral_rewards_used')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting referral code:', error);
      return null;
    }
  }

  /**
   * Generate a referral code for a user if they don't have one
   */
  async generateReferralCode(userId, fullName) {
    try {
      // Check if user already has a code
      const { data: existing, error: checkError } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', userId)
        .single();

      if (checkError) throw checkError;

      if (existing && existing.referral_code) {
        return { success: true, referral_code: existing.referral_code };
      }

      // Generate a new code
      const namePart = fullName ? fullName.substring(0, 3).toUpperCase() : 'USR';
      const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      const referralCode = `${namePart}-${randomPart}`;

      // Update the user with the new code
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ referral_code: referralCode })
        .eq('id', userId);

      if (updateError) throw updateError;

      return { success: true, referral_code: referralCode };
    } catch (error) {
      console.error('Error generating referral code:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Apply referral when new user signs up
   */
  async applyReferral(referralCode, newUserId) {
    try {
      // Find the referrer
      const { data: referrer, error: findError } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', referralCode.toUpperCase())
        .single();

      if (findError || !referrer) {
        return { success: false, error: 'Invalid referral code' };
      }

      // Update new user with referred_by
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ referred_by: referrer.id })
        .eq('id', newUserId);

      if (updateError) throw updateError;

      // Apply reward
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { error: rewardError } = await supabase.rpc('apply_referral_reward', {
        p_referred_by: referrer.id,
        p_new_user_id: newUserId,
        p_month_year: currentMonth
      });

      if (rewardError) throw rewardError;

      return { 
        success: true, 
        message: 'Referral applied! You will get a free month after the new user completes their first trip.',
        referrerId: referrer.id
      };
    } catch (error) {
      console.error('Error applying referral:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if a user is eligible for a free month
   */
  async checkFreeMonthEligibility(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('free_months_earned, referral_rewards_used, referral_count')
        .eq('id', userId)
        .single();

      if (error) throw error;

      const available = (data.free_months_earned || 0) - (data.referral_rewards_used || 0);
      return {
        available: available > 0,
        count: available,
        totalEarned: data.free_months_earned || 0,
        totalUsed: data.referral_rewards_used || 0
      };
    } catch (error) {
      console.error('Error checking eligibility:', error);
      return { available: false, count: 0 };
    }
  }

  /**
   * Apply a free month to the user
   */
  async applyFreeMonth(userId) {
    try {
      // Check eligibility
      const eligibility = await this.checkFreeMonthEligibility(userId);
      if (!eligibility.available) {
        return { success: false, error: 'No free months available' };
      }

      const currentMonth = new Date().toISOString().slice(0, 7);
      const { error } = await supabase.rpc('apply_free_month_to_user', {
        p_user_id: userId,
        p_month_year: currentMonth
      });

      if (error) throw error;

      return { success: true, message: 'Free month applied successfully!' };
    } catch (error) {
      console.error('Error applying free month:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get referral rewards history
   */
  async getRewardsHistory(userId) {
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

  /**
   * Check if new user was referred and validate first trip
   */
  async checkAndRewardReferral(userId) {
    try {
      // Get user's referral info
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('referred_by, referral_count')
        .eq('id', userId)
        .single();

      if (userError || !user.referred_by) return;

      // Check if this is the first trip for this user
      const { data: trips, error: tripsError } = await supabase
        .from('trip_logs')
        .select('id', { count: 'exact' })
        .eq('user_id', userId);

      if (tripsError) return;

      // If this is the first trip and user was referred
      if (trips.length === 1 && user.referred_by) {
        // Check if reward was already given
        const { data: existingReward } = await supabase
          .from('referral_rewards')
          .select('id')
          .eq('referred_user_id', userId)
          .single();

        if (!existingReward) {
          // Apply reward again just to be safe
          const currentMonth = new Date().toISOString().slice(0, 7);
          await supabase.rpc('apply_referral_reward', {
            p_referred_by: user.referred_by,
            p_new_user_id: userId,
            p_month_year: currentMonth
          });
        }
      }
    } catch (error) {
      console.error('Error checking referral reward:', error);
    }
  }
}

export default new ReferralService();
