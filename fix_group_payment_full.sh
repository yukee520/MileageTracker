#!/bin/bash

echo "========================================="
echo "  FIXING GROUP PAYMENT FLOW"
echo "========================================="
echo ""

# ============================================
# 1. BACKUP EXISTING FILES
# ============================================
echo "📦 Creating backups..."
cp components/PaymentModal.js components/PaymentModal.js.backup 2>/dev/null
cp services/ToyyibPayService.js services/ToyyibPayService.js.backup 2>/dev/null
cp App.js App.js.backup 2>/dev/null
echo "✅ Backups created"
echo ""

# ============================================
# 2. UPDATE PAYMENT MODAL
# ============================================
echo "📝 Updating PaymentModal.js..."

cat > components/PaymentModal.js << 'MODALEOF'
import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  AppState,
  Linking,
  Platform
} from 'react-native';
import { WebView } from 'react-native-webview';
import { createClient } from '@supabase/supabase-js';
import ToyyibPayService from '../services/ToyyibPayService';
import { TOYYIBPAY_CONFIG } from '../paymentConfig';

// Supabase configuration
const SUPABASE_URL = 'https://dkpjicqepexhgbrzzreo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7CXIRyhWhmsQfRfj9dDhWw_Z2efV6fx';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PaymentModal = ({
  visible,
  onClose,
  tier,
  userData,
  onPaymentSuccess,
  onPaymentError,
  onPaymentCancel
}) => {
  const [loading, setLoading] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [reference, setReference] = useState('');
  const [billCode, setBillCode] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('init');
  const [errorMessage, setErrorMessage] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [memberCount, setMemberCount] = useState(1);
  const [teamMembers, setTeamMembers] = useState([]);
  const webViewRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const verificationAttemptedRef = useRef(false);
  const isProcessingReturn = useRef(false);
  const [returnUrlDetected, setReturnUrlDetected] = useState(false);

  // ============================================================
  // GET MEMBER COUNT
  // ============================================================
  const getMemberCount = async () => {
    try {
      if (!userData?.teamId) return 1;
      
      const { data, error, count } = await supabase
        .from('profiles')
        .select('id, full_name, email, role', { count: 'exact' })
        .eq('team_id', userData.teamId);

      if (error) throw error;
      
      setTeamMembers(data || []);
      const count_num = data ? data.length : 1;
      setMemberCount(count_num);
      return count_num;
    } catch (error) {
      console.error('Error getting member count:', error);
      return 1;
    }
  };

  // ============================================================
  // EFFECTS
  // ============================================================
  useEffect(() => {
    if (visible) {
      setPaymentStatus('init');
      setErrorMessage('');
      setShowWebView(false);
      setPaymentUrl('');
      setReference('');
      setBillCode('');
      setVerifying(false);
      setReturnUrlDetected(false);
      verificationAttemptedRef.current = false;
      isProcessingReturn.current = false;
      
      // Get member count when modal opens
      getMemberCount();
    }
  }, [visible]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    const linkingSubscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
      linkingSubscription.remove();
    };
  }, []);

  const handleAppStateChange = (nextAppState) => {
    if (
      appStateRef.current.match(/inactive|background/) &&
      nextAppState === 'active' &&
      showWebView &&
      !verificationAttemptedRef.current &&
      !verifying &&
      !isProcessingReturn.current
    ) {
      console.log('📱 App returned from background, checking payment...');
    }
    appStateRef.current = nextAppState;
  };

  // ============================================================
  // DEEP LINK HANDLER
  // ============================================================
  const handleDeepLink = async (event) => {
    const { url } = event;
    console.log('🔗 Deep link received:', url);

    if (url.includes('mileagetracker://payment/return')) {
      console.log('🔙 Deep link return detected');

      if (isProcessingReturn.current) {
        console.log('⏳ Already processing return, skipping...');
        return;
      }
      isProcessingReturn.current = true;
      setReturnUrlDetected(true);

      setShowWebView(false);

      const params = new URLSearchParams(url.split('?')[1]);
      const status = params.get('status_id');
      const billcode = params.get('billcode');
      const orderId = params.get('order_id');
      const transactionId = params.get('transaction_id');

      console.log('📊 Payment return params:', { status, billcode, orderId, transactionId });

      if (status === '1' && billcode) {
        console.log('✅ Payment successful, completing...');
        setBillCode(billcode);
        setVerifying(true);
        setPaymentStatus('verifying');

        try {
          const result = await ToyyibPayService.completePayment(billcode, orderId, transactionId);

          if (result.success && result.status === 'completed') {
            console.log('✅ Payment completed successfully!');
            setPaymentStatus('completed');

            Alert.alert(
              'Payment Successful 🎉',
              `Your ${tier} subscription has been activated for ${memberCount} team members!`,
              [
                {
                  text: 'OK',
                  onPress: () => {
                    if (onPaymentSuccess) onPaymentSuccess(tier, result.transactionDetails);
                    onClose();
                  }
                }
              ]
            );
          } else {
            console.log('⚠️ Payment completion failed:', result);
            Alert.alert(
              'Payment Status',
              'Payment was received but subscription activation failed. Please contact support.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    onClose();
                  }
                }
              ]
            );
          }
        } catch (error) {
          console.error('❌ Error completing payment:', error);
          Alert.alert(
            'Error',
            'There was an error completing your payment. Please check your subscription status.',
            [
              {
                text: 'OK',
                onPress: () => {
                  onClose();
                }
              }
            ]
          );
        } finally {
          setVerifying(false);
          isProcessingReturn.current = false;
          setReturnUrlDetected(false);
        }
      } else {
        console.log('❌ Payment not successful:', status);
        setPaymentStatus('cancelled');
        Alert.alert(
          'Payment Status',
          'Payment was not completed. Please try again.',
          [
            {
              text: 'OK',
              onPress: () => {
                onClose();
                if (onPaymentCancel) onPaymentCancel();
              }
            }
          ]
        );
        isProcessingReturn.current = false;
        setReturnUrlDetected(false);
      }
    }
  };

  // ============================================================
  // GET TIER DETAILS
  // ============================================================
  const getTierDetails = () => {
    const pricePerSeat = tier === 'Group Basic' ? 7 : (tier === 'Group Pro' ? 12 : 0);
    const totalAmount = memberCount * pricePerSeat;
    
    const details = {
      'Personal Basic': {
        features: ['100 trips per month', 'Excel export included', 'RM4.99/month'],
        color: '#007AFF',
        price: 4.99,
        isGroup: false
      },
      'Personal Pro': {
        features: ['Unlimited trips', 'Excel export included', 'RM9.99/month'],
        color: '#28A745',
        price: 9.99,
        isGroup: false
      },
      'Group Basic': {
        features: [
          '100 trips per month per member',
          `Up to 10 team seats (${memberCount} current)`,
          'Excel export included',
          `RM7/seat × ${memberCount} = RM${totalAmount.toFixed(2)}/month`
        ],
        color: '#FF6B35',
        price: 7,
        isGroup: true,
        totalAmount: totalAmount,
        memberCount: memberCount
      },
      'Group Pro': {
        features: [
          'Unlimited trips per member',
          `Up to 25 team seats (${memberCount} current)`,
          'Excel export included',
          `RM12/seat × ${memberCount} = RM${totalAmount.toFixed(2)}/month`
        ],
        color: '#6F42C1',
        price: 12,
        isGroup: true,
        totalAmount: totalAmount,
        memberCount: memberCount
      }
    };
    return details[tier] || details['Personal Basic'];
  };

  // ============================================================
  // INITIATE PAYMENT
  // ============================================================
  const initiatePayment = async () => {
    try {
      setLoading(true);
      setPaymentStatus('creating');

      if (!userData || !userData.userId) {
        throw new Error('User information is missing');
      }

      // For group plans, include member count in userData
      const paymentUserData = {
        ...userData,
        memberCount: memberCount,
        teamMembers: teamMembers
      };

      const result = await ToyyibPayService.createBill(tier, paymentUserData);

      if (result.success) {
        console.log('✅ Bill created:', result);
        setPaymentUrl(result.paymentUrl);
        setReference(result.reference);
        setBillCode(result.billCode);
        setShowWebView(true);
        setPaymentStatus('redirecting');
      } else {
        setErrorMessage(result.error || 'Could not create payment');
        setPaymentStatus('error');
        Alert.alert('Payment Error', result.error || 'Could not create payment. Please try again.');
        if (onPaymentError) onPaymentError(result.error);
      }
    } catch (error) {
      console.error('❌ Initiate payment error:', error);
      setErrorMessage(error.message || 'Failed to connect to payment gateway');
      setPaymentStatus('error');
      Alert.alert('Error', error.message || 'Failed to connect to payment gateway');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // WEBVIEW NAVIGATION HANDLER
  // ============================================================
  const handleWebViewNavigation = (event) => {
    const { url } = event;
    console.log('🌐 Navigation:', url);

    if (url.includes('mileagetracker://payment/return')) {
      console.log('🔙 Return URL detected in WebView');
      setShowWebView(false);

      if (!isProcessingReturn.current) {
        const params = new URLSearchParams(url.split('?')[1]);
        const status = params.get('status_id');
        const billcode = params.get('billcode');
        const orderId = params.get('order_id');
        const transactionId = params.get('transaction_id');

        if (status === '1' && billcode) {
          setBillCode(billcode);
          processPaymentCompletion(billcode, orderId, transactionId);
        }
      }
      return false;
    }

    if (url.includes('toyyibpay.com') && url.includes('status=1')) {
      console.log('✅ Payment completed');
      return true;
    }

    if (url.includes('error') || url.includes('cancel') || url.includes('status=0')) {
      console.log('❌ Payment cancelled');
      setShowWebView(false);
      setPaymentStatus('cancelled');

      Alert.alert(
        'Payment Cancelled',
        'The payment process was cancelled.',
        [
          {
            text: 'Try Again',
            onPress: () => {
              setShowWebView(false);
              setPaymentStatus('init');
              verificationAttemptedRef.current = false;
              setVerifying(false);
              isProcessingReturn.current = false;
              setReturnUrlDetected(false);
            }
          },
          {
            text: 'Close',
            style: 'cancel',
            onPress: () => {
              onClose();
              if (onPaymentCancel) onPaymentCancel();
            }
          }
        ]
      );
      return false;
    }

    return true;
  };

  // ============================================================
  // PROCESS PAYMENT COMPLETION
  // ============================================================
  const processPaymentCompletion = async (billcode, orderId, transactionId) => {
    if (isProcessingReturn.current) return;
    isProcessingReturn.current = true;
    setVerifying(true);
    setPaymentStatus('verifying');

    try {
      const result = await ToyyibPayService.completePayment(billcode, orderId, transactionId);

      if (result.success && result.status === 'completed') {
        console.log('✅ Payment completed successfully!');
        setPaymentStatus('completed');

        Alert.alert(
          'Payment Successful 🎉',
          `Your ${tier} subscription has been activated for ${memberCount} team members!`,
          [
            {
              text: 'OK',
              onPress: () => {
                if (onPaymentSuccess) onPaymentSuccess(tier, result.transactionDetails);
                onClose();
              }
            }
          ]
        );
      } else {
        console.log('⚠️ Payment completion failed:', result);
        Alert.alert(
          'Payment Status',
          'Payment was received but subscription activation failed. Please contact support.',
          [
            {
              text: 'OK',
              onPress: () => {
                onClose();
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Error completing payment:', error);
      Alert.alert(
        'Error',
        'There was an error completing your payment. Please check your subscription status.',
        [
          {
            text: 'OK',
            onPress: () => {
              onClose();
            }
          }
        ]
      );
    } finally {
      setVerifying(false);
      isProcessingReturn.current = false;
      setReturnUrlDetected(false);
    }
  };

  // ============================================================
  // HANDLE CLOSE
  // ============================================================
  const handleClose = () => {
    if (showWebView && paymentStatus !== 'completed') {
      Alert.alert(
        'Payment in Progress',
        'Are you sure you want to cancel?',
        [
          { text: 'Continue', style: 'cancel' },
          {
            text: 'Cancel Payment',
            style: 'destructive',
            onPress: () => {
              setShowWebView(false);
              onClose();
              if (onPaymentCancel) onPaymentCancel();
            }
          }
        ]
      );
    } else {
      onClose();
    }
  };

  // ============================================================
  // RENDER PAYMENT DETAILS
  // ============================================================
  const renderPaymentDetails = () => {
    const details = getTierDetails();
    const isGroup = details.isGroup || false;
    
    // Get display amount
    let displayAmount = TOYYIBPAY_CONFIG.tierDisplayAmounts[tier] || 'RM0.00';
    if (isGroup && details.totalAmount) {
      displayAmount = `RM${details.totalAmount.toFixed(2)}/month`;
    }

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Upgrade to {tier}</Text>
          </View>

          <View style={[styles.planCard, { borderColor: details.color }]}>
            <View style={[styles.planBadge, { backgroundColor: details.color }]}>
              <Text style={styles.planBadgeText}>{tier}</Text>
            </View>

            <View style={styles.amountContainer}>
              <Text style={styles.amountLabel}>
                {isGroup ? `Total Amount (${memberCount} members):` : 'Total Amount:'}
              </Text>
              <Text style={[styles.amountValue, { color: details.color }]}>
                {displayAmount}
              </Text>
            </View>

            {isGroup && memberCount > 0 && (
              <View style={styles.memberBreakdown}>
                <Text style={styles.breakdownTitle}>👥 Team Members ({memberCount}):</Text>
                {teamMembers.slice(0, 5).map((member, index) => (
                  <Text key={index} style={styles.breakdownText}>
                    • {member.full_name || member.email || 'Member'} {member.role === 'admin' ? '(Admin)' : ''}
                  </Text>
                ))}
                {teamMembers.length > 5 && (
                  <Text style={styles.breakdownMore}>+ {teamMembers.length - 5} more members</Text>
                )}
              </View>
            )}

            <View style={styles.featuresContainer}>
              <Text style={styles.featuresTitle}>What you get:</Text>
              {details.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Text style={styles.featureCheck}>✅</Text>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>ℹ️ Payment Information</Text>
            <Text style={styles.infoText}>• Securely processed via ToyyibPay</Text>
            <Text style={styles.infoText}>• Receipt will be sent to: {userData?.email || 'your email'}</Text>
            <Text style={styles.infoText}>• Instant subscription activation</Text>
            {isGroup && (
              <Text style={styles.infoText}>• Covers all {memberCount} team members</Text>
            )}
          </View>

          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            </View>
          ) : null}

          {verifying ? (
            <View style={styles.verifyingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.verifyingText}>Verifying payment...</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.button, styles.payButton, loading && styles.buttonDisabled]}
                onPress={initiatePayment}
                disabled={loading}
              >
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.buttonText}> Creating payment...</Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>
                    {isGroup ? `🔒 Pay RM${details.totalAmount?.toFixed(2) || '0'} for ${memberCount} members` : '🔒 Proceed to Payment'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}

          <Text style={styles.secureText}>🔒 Your payment is secure and encrypted</Text>
        </ScrollView>
      </SafeAreaView>
    );
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      {showWebView ? (
        <SafeAreaView style={styles.webViewContainer}>
          <View style={styles.webViewHeader}>
            <TouchableOpacity onPress={handleClose} style={styles.webViewClose}>
              <Text style={styles.webViewCloseText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.webViewTitle}>Payment</Text>
            <View style={{ width: 40 }} />
          </View>
          <WebView
            ref={webViewRef}
            source={{ uri: paymentUrl }}
            startInLoadingState={true}
            onNavigationStateChange={handleWebViewNavigation}
            onShouldStartLoadWithRequest={(event) => {
              const { url } = event;
              if (url.includes('mileagetracker://payment/return')) {
                console.log('🔙 Intercepted return URL in shouldStartLoad');
                setShowWebView(false);

                const params = new URLSearchParams(url.split('?')[1]);
                const status = params.get('status_id');
                const billcode = params.get('billcode');
                const orderId = params.get('order_id');
                const transactionId = params.get('transaction_id');

                if (status === '1' && billcode) {
                  setBillCode(billcode);
                  processPaymentCompletion(billcode, orderId, transactionId);
                }
                return false;
              }
              return true;
            }}
            onError={() => {
              setShowWebView(false);
              Alert.alert('Error', 'Failed to load payment page. Please try again.');
            }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            style={styles.webView}
            renderLoading={() => (
              <View style={styles.webViewLoading}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.webViewLoadingText}>Loading payment page...</Text>
              </View>
            )}
          />
        </SafeAreaView>
      ) : (
        renderPaymentDetails()
      )}
    </Modal>
  );
};

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e9ecef', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  closeButtonText: { fontSize: 18, color: '#333', fontWeight: 'bold' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' },
  planCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 2, marginBottom: 20, elevation: 3 },
  planBadge: { position: 'absolute', top: -12, right: 20, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, elevation: 2 },
  planBadgeText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  amountContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', marginBottom: 15 },
  amountLabel: { fontSize: 16, color: '#666' },
  amountValue: { fontSize: 24, fontWeight: 'bold' },
  memberBreakdown: { backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8, marginBottom: 15 },
  breakdownTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  breakdownText: { fontSize: 13, color: '#555', paddingVertical: 2 },
  breakdownMore: { fontSize: 13, color: '#888', fontStyle: 'italic', marginTop: 4 },
  featuresContainer: { marginTop: 5 },
  featuresTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  featureItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  featureCheck: { fontSize: 16, marginRight: 10 },
  featureText: { fontSize: 14, color: '#555', flex: 1 },
  infoCard: { backgroundColor: '#f8f9fa', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#e9ecef' },
  infoTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  infoText: { fontSize: 13, color: '#666', marginBottom: 4, lineHeight: 20 },
  errorContainer: { backgroundColor: '#fff3cd', borderRadius: 8, padding: 12, marginBottom: 15, borderWidth: 1, borderColor: '#ffeeba' },
  errorText: { color: '#856404', fontSize: 14 },
  button: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  payButton: { backgroundColor: '#007AFF', elevation: 2 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  cancelButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#dc3545' },
  cancelButtonText: { fontSize: 16, fontWeight: 'bold', color: '#dc3545' },
  secureText: { textAlign: 'center', fontSize: 12, color: '#888', marginTop: 10 },
  verifyingContainer: { alignItems: 'center', paddingVertical: 30 },
  verifyingText: { marginTop: 12, fontSize: 16, color: '#666' },
  webViewContainer: { flex: 1, backgroundColor: '#fff' },
  webViewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#f8f9fa', borderBottomWidth: 1, borderBottomColor: '#e9ecef' },
  webViewClose: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  webViewCloseText: { fontSize: 24, color: '#333' },
  webViewTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  webView: { flex: 1 },
  webViewLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  webViewLoadingText: { marginTop: 16, fontSize: 16, color: '#666' }
});

export default PaymentModal;
MODALEOF

echo "✅ PaymentModal.js updated with member count display"
echo ""

# ============================================
# 3. UPDATE TOYYIBPAY SERVICE
# ============================================
echo "📝 Updating ToyyibPayService.js..."

cat > services/ToyyibPayService.js << 'SERVICEEOF'
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

  // ============================================================
  // CREATE BILL WITH MEMBER COUNT
  // ============================================================
  async createBill(tier, userData) {
    try {
      console.log('📝 Creating ToyyibPay bill for tier:', tier);
      console.log('👤 User data:', userData);

      // Check if this is a group plan
      const isGroup = tier === 'Group Basic' || tier === 'Group Pro';
      
      // Get member count
      let memberCount = 1;
      let totalAmount = 0;
      let pricePerSeat = 0;

      if (isGroup && userData.teamId) {
        // Get actual member count from database
        const { count, error } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('team_id', userData.teamId);

        if (error) {
          console.error('Error getting member count:', error);
          memberCount = 1;
        } else {
          memberCount = count || 1;
        }

        pricePerSeat = tier === 'Group Basic' ? 7 : 12;
        totalAmount = memberCount * pricePerSeat;
      } else {
        // Personal plan
        const amount = TOYYIBPAY_CONFIG.tierAmounts[tier];
        if (!amount || amount === 0) {
          throw new Error('Invalid tier or free tier selected');
        }
        totalAmount = amount / 100;
        pricePerSeat = totalAmount;
      }

      console.log(`📊 Member count: ${memberCount}, Total amount: RM${totalAmount}`);

      const amountInCents = totalAmount * 100;
      const reference = this.generateReference();
      const displayMonth = new Date().toLocaleString('default', {
        month: 'short',
        year: 'numeric'
      });

      const billName = isGroup 
        ? `Mileage Tracker ${tier} (${memberCount} seats) ${displayMonth}`
        : `Mileage Tracker ${tier} ${displayMonth}`;
      
      const truncatedBillName = this.truncateBillName(billName);

      console.log('📝 Bill name:', truncatedBillName);

      const billData = {
        userSecretKey: this.secretKey,
        categoryCode: this.categoryCode,
        billName: truncatedBillName,
        billDescription: isGroup 
          ? `${tier} plan for ${memberCount} team members (RM${pricePerSeat}/seat × ${memberCount})`
          : `${tier} plan subscription`,
        billPriceSetting: 1,
        billPayorInfo: 1,
        billAmount: amountInCents.toString(),
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
            amount: totalAmount,
            memberCount: memberCount,
            isGroup: isGroup,
            timestamp: new Date().toISOString()
          };

          await AsyncStorage.setItem(`@payment_${reference}`, JSON.stringify(paymentContext));

          // Save transaction
          await this.saveTransaction(
            userData.userId,
            userData.teamId,
            tier,
            totalAmount,
            bill.BillCode,
            reference,
            memberCount
          );

          return {
            success: true,
            paymentUrl: `https://toyyibpay.com/${bill.BillCode}`,
            billCode: bill.BillCode,
            reference: reference,
            amount: totalAmount,
            memberCount: memberCount
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

  // ============================================================
  // SAVE TRANSACTION WITH MEMBER COUNT
  // ============================================================
  async saveTransaction(userId, teamId, tier, amount, billCode, reference, memberCount) {
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
          payment_method: 'toyyibpay',
          member_count: memberCount || 1
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

  // ============================================================
  // COMPLETE PAYMENT
  // ============================================================
  async completePayment(billCode, reference, transactionId) {
    try {
      console.log('✅ Completing payment for bill:', billCode);
      console.log('📝 Reference:', reference);

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
        const { data: findTx } = await supabase
          .from('transactions')
          .select('*')
          .eq('bill_code', billCode)
          .single();

        if (findTx) {
          console.log('✅ Found transaction:', findTx);
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

      await this.activateSubscription(txData.team_id, txData.tier, txData.id);

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

  // ============================================================
  // ACTIVATE SUBSCRIPTION
  // ============================================================
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

  // ============================================================
  // CHECK SUBSCRIPTION STATUS
  // ============================================================
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

  // ============================================================
  // GET TRANSACTION HISTORY
  // ============================================================
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
SERVICEEOF

echo "✅ ToyyibPayService.js updated with member count support"
echo ""

# ============================================
# 4. CREATE SQL MIGRATION
# ============================================
echo "🗄️  Creating SQL migration file..."

cat > create_transactions_table.sql << 'SQLEOF'
-- ============================================================
-- CREATE TRANSACTIONS TABLE
-- ============================================================
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  team_id UUID REFERENCES teams(id),
  tier TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  transaction_id TEXT,
  reference TEXT,
  bill_code TEXT UNIQUE,
  status TEXT DEFAULT 'pending',
  payment_method TEXT DEFAULT 'toyyibpay',
  member_count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_team_id ON transactions(team_id);
CREATE INDEX IF NOT EXISTS idx_transactions_bill_code ON transactions(bill_code);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Add comment for documentation
COMMENT ON TABLE transactions IS 'Stores payment transaction records for ToyyibPay';
COMMENT ON COLUMN transactions.member_count IS 'Number of team members covered by this transaction (for group plans)';
SQLEOF

echo "✅ SQL migration created: create_transactions_table.sql"
echo ""

# ============================================
# 5. SUMMARY
# ============================================
echo "========================================="
echo "  ✅ FIX COMPLETE"
echo "========================================="
echo ""
echo "📝 Files Updated:"
echo "  1. components/PaymentModal.js"
echo "  2. services/ToyyibPayService.js"
echo "  3. create_transactions_table.sql (new)"
echo ""
echo "📋 What Changed:"
echo "  ✅ PaymentModal now shows member count"
echo "  ✅ Member breakdown displayed for group plans"
echo "  ✅ Total amount calculation includes all members"
echo "  ✅ Transaction table includes member_count column"
echo ""
echo "🚀 Next Steps:"
echo ""
echo "1. Run the SQL in Supabase SQL Editor:"
echo "   cat create_transactions_table.sql"
echo "   Copy and paste into Supabase SQL Editor"
echo ""
echo "2. Test the flow:"
echo "   - Have a team with 3 members"
echo "   - Admin upgrades to Group Basic"
echo "   - Should show: RM7/seat × 3 = RM21/month"
echo ""
echo "3. Push to GitHub:"
echo "   git add ."
echo "   git commit -m 'Fix: Group payment with member count'"
echo "   git push origin main"
echo ""
echo "========================================="

