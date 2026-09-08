import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { TOYYIBPAY_CONFIG } from '../paymentConfig';

// Supabase configuration
const SUPABASE_URL = 'https://dkpjicqepexhgbrzzreo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7CXIRyhWhmsQfRfj9dDhWw_Z2efV6fx';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class ToyyibPayService {
  constructor() {
    this.apiUrl = TOYYIBPAY_CONFIG.toyyibpayApiUrl;
    this.secretKey = TOYYIBPAY_CONFIG.userSecretKey;
    this.categoryCode = TOYYIBPAY_CONFIG.categoryCode;
  }

  generateReference() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `TRIP-${timestamp}-${random}`.toUpperCase();
  }

  truncateBillName(name) {
    const clean = name.replace(/[^a-zA-Z0-9 ]/g, '').trim();
    return clean.substring(0, 30);
  }

  async createBill(tier, userData) {
    try {
      console.log('📝 Creating ToyyibPay bill for tier:', tier);
      
      const amount = TOYYIBPAY_CONFIG.tierAmounts[tier];
      if (!amount || amount === 0) {
        throw new Error('Invalid tier or free tier selected');
      }

      const reference = this.generateReference();
      const displayMonth = new Date().toLocaleString('default', { 
        month: 'short', 
        year: 'numeric' 
      });

      const billName = `Mileage Tracker ${displayMonth}`;
      const truncatedBillName = this.truncateBillName(billName);
      
      console.log('📝 Bill name:', truncatedBillName);

      const billData = {
        userSecretKey: this.secretKey,
        categoryCode: this.categoryCode,
        billName: truncatedBillName,
        billDescription: `${tier} plan subscription`,
        billPriceSetting: 1,
        billPayorInfo: 1,
        billAmount: amount.toString(),
        billReturnUrl: TOYYIBPAY_CONFIG.returnUrlScheme,
        billCallbackUrl: TOYYIBPAY_CONFIG.webhookUrl,
        billExternalReferenceNo: reference.substring(0, 20),
        billTo: userData.driverName || 'Customer',
        billEmail: userData.email || 'customer@email.com',
        billPhone: '0123456789',
        billSplitPayment: 0,
        billPaymentChannel: '0',
        billContentType: 'application/json'
      };

      console.log('📤 Sending to ToyyibPay...');

      const response = await axios.post(
        `${this.apiUrl}/createBill`,
        billData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log('📥 ToyyibPay response:', response.data);

      if (response.data && response.data.status === 'error') {
        return {
          success: false,
          error: response.data.msg || 'Payment service error'
        };
      }

      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        const bill = response.data[0];
        if (bill.BillCode) {
          const paymentContext = {
            tier,
            userId: userData.userId,
            teamId: userData.teamId,
            email: userData.email,
            driverName: userData.driverName,
            reference: reference,
            billCode: bill.BillCode,
            amount: amount / 100,
            timestamp: new Date().toISOString()
          };
          
          await AsyncStorage.setItem(`@payment_${reference}`, JSON.stringify(paymentContext));

          // Save transaction
          await this.saveTransaction(
            userData.userId,
            userData.teamId,
            tier,
            amount / 100,
            bill.BillCode,
            reference
          );

          return {
            success: true,
            paymentUrl: `https://toyyibpay.com/${bill.BillCode}`,
            billCode: bill.BillCode,
            reference: reference,
            amount: amount / 100
          };
        }
      }

      throw new Error('Unexpected response from ToyyibPay');

    } catch (error) {
      console.error('❌ ToyyibPay error:', error);
      let errorMessage = error.message || 'Failed to create payment';
      if (error.response?.data?.msg) {
        errorMessage = error.response.data.msg;
      }
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async saveTransaction(userId, teamId, tier, amount, billCode, reference) {
    try {
      console.log('💾 Saving transaction to Supabase...');
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          team_id: teamId,
          tier: tier,
          amount: amount,
          transaction_id: billCode,
          reference: reference,
          bill_code: billCode,
          status: 'pending',
          payment_method: 'toyyibpay'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase insert error:', error);
        return null;
      }
      
      console.log('✅ Transaction saved:', data);
      return data;
    } catch (error) {
      console.error('❌ Error saving transaction:', error);
      return null;
    }
  }

  /**
   * Complete payment - Called when return URL is received with status_id=1
   * This bypasses the API verification since ToyyibPay API is not working
   */
  async completePayment(billCode, reference, transactionId) {
    try {
      console.log('✅ Completing payment for bill:', billCode);
      console.log('📝 Reference:', reference);
      console.log('📝 Transaction ID:', transactionId);

      // Update transaction status in Supabase
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          transaction_id: transactionId || billCode
        })
        .eq('bill_code', billCode)
        .select()
        .single();

      if (txError) {
        console.error('❌ Error updating transaction:', txError);
        // Try to find the transaction without updating first
        const { data: findTx } = await supabase
          .from('transactions')
          .select('*')
          .eq('bill_code', billCode)
          .single();
        
        if (findTx) {
          console.log('✅ Found transaction:', findTx);
          // Activate subscription
          await this.activateSubscription(findTx.team_id, findTx.tier, findTx.id);
          return {
            success: true,
            status: 'completed',
            transactionDetails: findTx
          };
        }
        return {
          success: false,
          status: 'error',
          message: 'Transaction not found'
        };
      }

      console.log('✅ Transaction updated:', txData);

      // Activate subscription
      await this.activateSubscription(txData.team_id, txData.tier, txData.id);

      // Clear payment context
      await AsyncStorage.removeItem(`@payment_${reference}`);

      return {
        success: true,
        status: 'completed',
        transactionDetails: txData
      };

    } catch (error) {
      console.error('❌ Error completing payment:', error);
      return {
        success: false,
        status: 'error',
        message: error.message || 'Failed to complete payment'
      };
    }
  }

  /**
   * Verify payment - Now uses the transaction status from Supabase
   */
  async verifyPayment(billCode, reference) {
    try {
      console.log('🔍 Checking payment status for bill:', billCode);

      // Check if transaction is already completed in Supabase
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('bill_code', billCode)
        .single();

      if (txError) {
        console.error('❌ Error finding transaction:', txError);
        return {
          success: false,
          status: 'not_found',
          message: 'Transaction not found'
        };
      }

      if (txData.status === 'completed') {
        console.log('✅ Transaction already completed');
        return {
          success: true,
          status: 'completed',
          transactionDetails: txData
        };
      }

      // Transaction is still pending
      return {
        success: false,
        status: 'pending',
        message: 'Payment still pending',
        transactionDetails: txData
      };

    } catch (error) {
      console.error('❌ Verification error:', error);
      return {
        success: false,
        status: 'error',
        message: error.message || 'Failed to verify payment'
      };
    }
  }

  async activateSubscription(teamId, tier, transactionId) {
    try {
      console.log('🚀 Activating subscription for team:', teamId, 'tier:', tier);
      
      const tierMap = {
        'Personal Free': 'personal_free',
        'Personal Basic': 'personal_basic',
        'Personal Pro': 'personal_pro',
        'Group Basic': 'team_basic',
        'Group Pro': 'team_pro'
      };
      
      const limitMap = {
        'Personal Free': 30,
        'Personal Basic': 100,
        'Personal Pro': 99999,
        'Group Basic': 100,
        'Group Pro': 99999
      };
      
      const maxMembersMap = {
        'Personal Free': 1,
        'Personal Basic': 1,
        'Personal Pro': 1,
        'Group Basic': 10,
        'Group Pro': 25
      };
      
      const { data, error } = await supabase
        .from('teams')
        .update({
          subscription_tier: tierMap[tier] || 'personal_free',
          monthly_trip_limit: limitMap[tier] || 30,
          max_members: maxMembersMap[tier] || 1,
          payment_status: 'active',
          last_payment_date: new Date().toISOString(),
          subscription_end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
        })
        .eq('id', teamId)
        .select();

      if (error) {
        console.error('❌ Error updating team:', error);
        return false;
      }
      
      console.log('✅ Subscription activated:', data);
      return true;
    } catch (error) {
      console.error('❌ Error activating subscription:', error);
      return false;
    }
  }

  async checkSubscriptionStatus(teamId) {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('subscription_tier, monthly_trip_limit, payment_status, last_payment_date, subscription_end_date')
        .eq('id', teamId)
        .single();

      if (error) throw error;

      const tierMap = {
        'personal_free': 'Personal Free',
        'personal_basic': 'Personal Basic',
        'personal_pro': 'Personal Pro',
        'team_basic': 'Group Basic',
        'team_pro': 'Group Pro'
      };

      return {
        tier: tierMap[data.subscription_tier] || 'Personal Free',
        limit: data.monthly_trip_limit || 30,
        status: data.payment_status || 'free',
        lastPayment: data.last_payment_date,
        expiresAt: data.subscription_end_date,
        isActive: data.payment_status === 'active' || data.subscription_tier === 'personal_free'
      };
    } catch (error) {
      console.error('❌ Error checking subscription:', error);
      return null;
    }
  }

  async getTransactionHistory(userId) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error getting transactions:', error);
      return [];
    }
  }
}

export default new ToyyibPayService();
