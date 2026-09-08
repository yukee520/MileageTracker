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
import ToyyibPayService from '../services/ToyyibPayService';
import { TOYYIBPAY_CONFIG } from '../paymentConfig';

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
  const webViewRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const verificationAttemptedRef = useRef(false);
  const isProcessingReturn = useRef(false);
  const [returnUrlDetected, setReturnUrlDetected] = useState(false);

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
      
      // Force close WebView
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
              `Your ${tier} subscription has been activated!`,
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

  const getTierDetails = () => {
    const details = {
      'Personal Basic': {
        features: ['100 trips per month', 'Excel export included', 'RM4.99/month'],
        color: '#007AFF'
      },
      'Personal Pro': {
        features: ['Unlimited trips', 'Excel export included', 'RM9.99/month'],
        color: '#28A745'
      },
      'Group Basic': {
        features: ['100 trips per month', 'Up to 10 team seats', 'Excel export included', 'RM7/seat/month'],
        color: '#FF6B35'
      },
      'Group Pro': {
        features: ['Unlimited trips', 'Up to 25 team seats', 'Excel export included', 'RM12/seat/month'],
        color: '#6F42C1'
      }
    };
    return details[tier] || details['Personal Basic'];
  };

  const initiatePayment = async () => {
    try {
      setLoading(true);
      setPaymentStatus('creating');
      
      if (!userData || !userData.userId) {
        throw new Error('User information is missing');
      }

      const result = await ToyyibPayService.createBill(tier, userData);
      
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

  const handleWebViewNavigation = (event) => {
    const { url } = event;
    console.log('🌐 Navigation:', url);
    
    // Check for return URL
    if (url.includes('mileagetracker://payment/return')) {
      console.log('🔙 Return URL detected in WebView');
      // Close WebView immediately
      setShowWebView(false);
      
      // Let the deep link handler process it (or process here as fallback)
      if (!isProcessingReturn.current) {
        const params = new URLSearchParams(url.split('?')[1]);
        const status = params.get('status_id');
        const billcode = params.get('billcode');
        const orderId = params.get('order_id');
        const transactionId = params.get('transaction_id');
        
        if (status === '1' && billcode) {
          setBillCode(billcode);
          // Process payment directly since deep link might not work
          processPaymentCompletion(billcode, orderId, transactionId);
        }
      }
      return false; // Stop navigation
    }
    
    // Check for direct completion from ToyyibPay
    if (url.includes('toyyibpay.com') && url.includes('status=1')) {
      console.log('✅ Payment completed');
      return true; // Let it navigate naturally
    }
    
    // Handle cancellation
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

  // Process payment completion (fallback if deep link doesn't work)
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
          `Your ${tier} subscription has been activated!`,
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

  const renderPaymentDetails = () => {
    const details = getTierDetails();
    const amount = TOYYIBPAY_CONFIG.tierDisplayAmounts[tier] || 'RM0.00';

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
              <Text style={styles.amountLabel}>Total Amount:</Text>
              <Text style={[styles.amountValue, { color: details.color }]}>{amount}</Text>
            </View>

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
                  <Text style={styles.buttonText}>🔒 Proceed to Payment</Text>
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
              // Intercept return URL and handle it
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
                  // Process payment directly
                  processPaymentCompletion(billcode, orderId, transactionId);
                }
                return false; // Prevent navigation
              }
              return true; // Allow navigation
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
  featuresContainer: { marginTop: 5 },
  featuresTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  featureItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  featureCheck: { fontSize: 16, marginRight: 10 },
  featureText: { fontSize: 14, color: '#555' },
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
