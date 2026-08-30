import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOYYIBPAY_CONFIG } from '../paymentConfig';

class PaymentService {
  constructor() {
    this.apiBaseUrl = TOYYIBPAY_CONFIG.apiBaseUrl;
  }

  /**
   * Generate a unique reference for the transaction
   * Matches the backend format
   */
  generateReference() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `TRIP-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Create a payment request via the backend
   * This calls your FastAPI endpoint that creates the ToyyibPay bill
   */
  async createPaymentRequest(tier, userData) {
    try {
      console.log('📝 Creating payment request for tier:', tier);
      console.log('👤 User data:', userData);

      // Validate tier exists in configuration
      const tierAmount = TOYYIBPAY_CONFIG.tierAmounts[tier];
      if (!tierAmount) {
        throw new Error(`No payment amount configured for tier: ${tier}`);
      }

      // Generate reference
      const reference = this.generateReference();
      
      // Store payment context for verification
      const paymentContext = {
        tier,
        userId: userData.userId,
        teamId: userData.teamId,
        email: userData.email || 'user@example.com',
        driverName: userData.driverName || 'User',
        timestamp: new Date().toISOString(),
        reference
      };
      
      await AsyncStorage.setItem(`@payment_${reference}`, JSON.stringify(paymentContext));
      console.log('💾 Payment context saved:', paymentContext);

      // Use the backend API to create bill
      // This matches your FastAPI endpoint structure
      const response = await axios.post(
        `${this.apiBaseUrl}/create-payment`,
        {
          telegram_id: userData.userId,
          user_name: userData.driverName || 'User',
          user_email: userData.email || 'user@example.com',
          tier: tier,
          amount: tierAmount,
          reference: reference,
          team_id: userData.teamId,
          return_url: TOYYIBPAY_CONFIG.returnUrlScheme
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      console.log('📤 Backend response:', response.data);

      if (response.data && response.data.success) {
        return {
          success: true,
          paymentUrl: response.data.payment_url || response.data.url,
          reference: response.data.reference || reference,
          billCode: response.data.bill_code,
          transactionId: response.data.transaction_id
        };
      } else {
        throw new Error(response.data.error || 'Failed to create payment');
      }
      
    } catch (error) {
      console.error('❌ Payment creation error:', error);
      
      // Handle different error types
      let errorMessage = 'Failed to create payment request.';
      if (error.response) {
        // Server responded with error
        console.error('Server response:', error.response.data);
        errorMessage = error.response.data.message || error.response.data.error || errorMessage;
      } else if (error.request) {
        // Request made but no response
        errorMessage = 'Payment service is unavailable. Please try again later.';
      } else {
        // Something else
        errorMessage = error.message || errorMessage;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Verify payment status with the backend
   */
  async verifyPayment(reference) {
    try {
      console.log('🔍 Verifying payment:', reference);
      
      const response = await axios.get(
        `${this.apiBaseUrl}/payment-status/${reference}`,
        {
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      console.log('📥 Verification response:', response.data);

      if (response.data && response.data.status === 'completed') {
        // Payment confirmed - clear the temporary payment context
        await AsyncStorage.removeItem(`@payment_${reference}`);
        return {
          success: true,
          status: 'completed',
          transactionDetails: response.data
        };
      }

      return {
        success: false,
        status: response.data?.status || 'pending',
        transactionDetails: response.data
      };
      
    } catch (error) {
      console.error('❌ Payment verification error:', error);
      return {
        success: false,
        error: error.message || 'Failed to verify payment'
      };
    }
  }

  /**
   * Get transaction history for a user
   */
  async getTransactionHistory(userId) {
    try {
      const response = await axios.get(
        `${this.apiBaseUrl}/transactions/${userId}`,
        {
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      return {
        success: true,
        transactions: response.data || []
      };
    } catch (error) {
      console.error('❌ Transaction history error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch transaction history'
      };
    }
  }

  /**
   * Check if user has an active subscription
   */
  async checkSubscriptionStatus(userId) {
    try {
      const response = await axios.get(
        `${this.apiBaseUrl}/subscription-status/${userId}`,
        {
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      return {
        success: true,
        isActive: response.data.is_active || false,
        tier: response.data.tier || 'Personal Free',
        expiresAt: response.data.expires_at,
        monthlyTripsUsed: response.data.monthly_trips_used || 0,
        monthlyTripsLimit: response.data.monthly_trips_limit || 30
      };
    } catch (error) {
      console.error('❌ Subscription status error:', error);
      return {
        success: false,
        isActive: false,
        error: error.message || 'Failed to check subscription status'
      };
    }
  }
}

export default new PaymentService();
