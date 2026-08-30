import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Share, TextInput, Modal, Linking, Platform
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import ReferralService from '../services/ReferralService';

// ============================================================
// APP DOWNLOAD CONFIGURATION
// ============================================================
// Option 1: Google Drive APK Link (Recommended for testing)
// Upload your APK to Google Drive, get the shareable link
// Make sure the link is set to "Anyone with the link can view"
const APP_DOWNLOAD_LINK = 'https://drive.google.com/file/d/YOUR_FILE_ID/view?usp=sharing';

// Option 2: Google Play Store Link (For production)
// const APP_DOWNLOAD_LINK = 'https://play.google.com/store/apps/details?id=com.yourcompany.mileagetracker';

// Option 3: Direct APK Download (If you have a hosting service)
// const APP_DOWNLOAD_LINK = 'https://yourdomain.com/mileage-tracker.apk';

// Deep link scheme for auto-capturing referral codes
const APP_DEEP_LINK_SCHEME = 'mileagetracker://referral';

// URL Shortener API
const URL_SHORTENER_API = 'https://is.gd/create.php';

const ReferralScreen = ({ user, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [referralInfo, setReferralInfo] = useState({
    referral_code: '',
    referral_count: 0,
    free_months_earned: 0,
    referral_rewards_used: 0
  });
  const [availableMonths, setAvailableMonths] = useState(0);
  const [rewardsHistory, setRewardsHistory] = useState([]);
  const [applyCode, setApplyCode] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applying, setApplying] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [shortUrl, setShortUrl] = useState('');
  const [shortening, setShortening] = useState(false);
  const [fullReferralLink, setFullReferralLink] = useState('');

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      setLoading(true);
      
      let info = await ReferralService.getReferralCode(user.id);
      
      if (!info || !info.referral_code) {
        setGenerating(true);
        const result = await ReferralService.generateReferralCode(user.id, user.full_name || user.email);
        if (result.success) {
          info = await ReferralService.getReferralCode(user.id);
        }
        setGenerating(false);
      }
      
      if (info) {
        setReferralInfo(info);
        const available = (info.free_months_earned || 0) - (info.referral_rewards_used || 0);
        setAvailableMonths(available);
        
        // Build referral link with deep link
        const link = `${APP_DEEP_LINK_SCHEME}?code=${info.referral_code}`;
        setFullReferralLink(link);
        
        // Generate short URL
        await generateShortUrl(link);
      }
      
      const history = await ReferralService.getRewardsHistory(user.id);
      setRewardsHistory(history);
    } catch (error) {
      console.error('Error loading referral data:', error);
      Alert.alert('Error', 'Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const generateShortUrl = async (longUrl) => {
    try {
      setShortening(true);
      
      const response = await fetch(
        `${URL_SHORTENER_API}?format=simple&url=${encodeURIComponent(longUrl)}`
      );
      
      const shortUrlResult = await response.text();
      
      if (shortUrlResult && !shortUrlResult.includes('error')) {
        setShortUrl(shortUrlResult.trim());
        console.log('✅ Short URL generated:', shortUrlResult);
      } else {
        setShortUrl(longUrl);
        console.log('⚠️ Short URL failed, using full URL');
      }
    } catch (error) {
      console.error('❌ URL shortening error:', error);
      setShortUrl(longUrl);
    } finally {
      setShortening(false);
    }
  };

  const buildShareMessage = (includeCode = true) => {
    const appLink = shortUrl || fullReferralLink;
    const downloadLink = APP_DOWNLOAD_LINK;
    const code = referralInfo.referral_code || '';
    
    let message = `🚗 Track your mileage easily with Mileage Tracker!\n\n`;
    message += `📱 Download the app (APK):\n${downloadLink}\n\n`;
    message += `🔗 Referral link (auto-applies code):\n${appLink}\n\n`;
    
    if (includeCode && code) {
      message += `🎁 Or use referral code: ${code}\n\n`;
    }
    
    message += `Referral benefits:\n`;
    message += `• Get 1 free month for each friend who joins and completes their first trip\n`;
    message += `• Unlimited tracking\n`;
    message += `• Excel export reports\n`;
    message += `• Team management\n\n`;
    message += `Start tracking your mileage today! 🎉`;
    
    return message;
  };

  const handleShare = async () => {
    try {
      const message = buildShareMessage(true);
      
      await Share.share({
        message: message,
        title: 'Refer Mileage Tracker'
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleCopyLink = async () => {
    try {
      const message = buildShareMessage(true);
      
      await Share.share({
        message: message,
        title: 'Copy Referral Link'
      });
    } catch (error) {
      console.error('Copy link error:', error);
    }
  };

  const handleOpenDownloadLink = async () => {
    try {
      const canOpen = await Linking.canOpenURL(APP_DOWNLOAD_LINK);
      if (canOpen) {
        await Linking.openURL(APP_DOWNLOAD_LINK);
      } else {
        Alert.alert('Error', 'Cannot open download link');
      }
    } catch (error) {
      console.error('Open link error:', error);
      Alert.alert('Error', 'Failed to open download link');
    }
  };

  const handleSaveToDrive = async () => {
    try {
      const content = buildShareMessage(true);
      const fileName = `MileageTracker_Referral_${referralInfo.referral_code}.txt`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(filePath, content);
      
      if (Platform.OS === 'ios' && !(await Sharing.isAvailableAsync())) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }
      
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/plain',
        dialogTitle: 'Save Referral Link',
        UTI: 'public.plain-text'
      });
      
    } catch (error) {
      console.error('Save to Drive error:', error);
      Alert.alert('Error', 'Failed to save to Google Drive');
    }
  };

  const handleApplyReferral = async () => {
    if (!applyCode.trim()) {
      Alert.alert('Error', 'Please enter a referral code');
      return;
    }

    setApplying(true);
    try {
      const result = await ReferralService.applyReferral(applyCode, user.id);
      
      if (result.success) {
        Alert.alert('Success!', 'Referral code applied successfully! You will get a free month after your first trip.');
        setShowApplyModal(false);
        setApplyCode('');
        loadReferralData();
      } else {
        Alert.alert('Error', result.error || 'Invalid referral code');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to apply referral code');
    } finally {
      setApplying(false);
    }
  };

  const handleUseFreeMonth = async () => {
    Alert.alert(
      'Apply Free Month',
      `You have ${availableMonths} free month(s) available. This will upgrade your account to Personal Basic for 1 month.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply Now',
          onPress: async () => {
            const result = await ReferralService.applyFreeMonth(user.id);
            if (result.success) {
              Alert.alert('Success!', 'Your free month has been applied!');
              loadReferralData();
            } else {
              Alert.alert('Error', result.error || 'Failed to apply free month');
            }
          }
        }
      ]
    );
  };

  if (loading || generating) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 20 }}>{generating ? 'Generating your referral code...' : 'Loading...'}</Text>
      </View>
    );
  }

  return (
    <Modal visible={true} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🎁 Refer & Earn</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Referral Code Section */}
          <View style={styles.codeSection}>
            <Text style={styles.sectionTitle}>Your Referral Code</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{referralInfo.referral_code || 'Loading...'}</Text>
            </View>
            
            <View style={styles.linkSection}>
              <Text style={styles.linkLabel}>Your Referral Link:</Text>
              <View style={styles.linkBox}>
                <Text style={styles.linkText} numberOfLines={1}>
                  {shortening ? 'Generating short link...' : shortUrl || fullReferralLink}
                </Text>
              </View>
            </View>
            
            <View style={styles.shareButtonsRow}>
              <TouchableOpacity style={[styles.shareBtn, styles.shareBtnShare]} onPress={handleShare}>
                <Text style={styles.shareBtnText}>📤 Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.shareBtn, styles.shareBtnCopy]} onPress={handleCopyLink}>
                <Text style={styles.shareBtnText}>📋 Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.shareBtn, styles.shareBtnDrive]} onPress={handleSaveToDrive}>
                <Text style={styles.shareBtnText}>💾 Drive</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Download App Section */}
          <View style={styles.downloadSection}>
            <Text style={styles.sectionTitle}>📱 Download APK from Google Drive</Text>
            <Text style={styles.downloadSubText}>
              Download the APK from Google Drive and share with friends!
            </Text>
            
            <TouchableOpacity style={styles.downloadBtn} onPress={handleOpenDownloadLink}>
              <Text style={styles.downloadBtnText}>⬇️ Open Google Drive</Text>
            </TouchableOpacity>
            
            <Text style={styles.downloadLinkText} numberOfLines={1}>
              {APP_DOWNLOAD_LINK}
            </Text>
            
            <View style={styles.driveInfoBox}>
              <Text style={styles.driveInfoText}>
                💡 Tip: Upload your APK to Google Drive and set sharing to "Anyone with the link can view"
              </Text>
            </View>
          </View>

          {/* Stats Section */}
          <View style={styles.statsSection}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{referralInfo.referral_count || 0}</Text>
              <Text style={styles.statLabel}>Friends Referred</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#e8f5e9' }]}>
              <Text style={[styles.statNumber, { color: '#2e7d32' }]}>{availableMonths}</Text>
              <Text style={styles.statLabel}>Free Months Available</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#e3f2fd' }]}>
              <Text style={[styles.statNumber, { color: '#1976d2' }]}>{referralInfo.free_months_earned || 0}</Text>
              <Text style={styles.statLabel}>Total Earned</Text>
            </View>
          </View>

          {/* Available Months Action */}
          {availableMonths > 0 && (
            <TouchableOpacity style={styles.useBtn} onPress={handleUseFreeMonth}>
              <Text style={styles.useBtnText}>🎯 Apply Free Month ({availableMonths} available)</Text>
            </TouchableOpacity>
          )}

          {/* Apply Referral Code */}
          <TouchableOpacity style={styles.applyBtn} onPress={() => setShowApplyModal(true)}>
            <Text style={styles.applyBtnText}>🔑 Have a referral code? Click here</Text>
          </TouchableOpacity>

          {/* Rewards History */}
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>📋 Reward History</Text>
            {rewardsHistory.length === 0 ? (
              <Text style={styles.emptyText}>No rewards yet. Refer a friend to earn!</Text>
            ) : (
              rewardsHistory.map((reward, index) => (
                <View key={index} style={styles.historyItem}>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyDate}>
                      {new Date(reward.created_at).toLocaleDateString()}
                    </Text>
                    <Text style={styles.historyDetail}>
                      {reward.reward_type === 'free_month' ? '🎁 Free Month' : 'Referral Bonus'}
                    </Text>
                  </View>
                  <Text style={[
                    styles.historyStatus,
                    reward.status === 'used' ? styles.statusUsed : styles.statusPending
                  ]}>
                    {reward.status === 'used' ? '✅ Used' : '⏳ Pending'}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* How It Works */}
          <View style={styles.howItWorks}>
            <Text style={styles.sectionTitle}>💡 How It Works</Text>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>1</Text>
              <Text style={styles.stepText}>Upload your APK to Google Drive</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>Share your referral link with friends</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>3</Text>
              <Text style={styles.stepText}>Friend downloads APK from Google Drive</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>4</Text>
              <Text style={styles.stepText}>Friend installs and uses your referral code</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>5</Text>
              <Text style={styles.stepText}>Friend completes first trip → You get 1 free month! 🎉</Text>
            </View>
          </View>
        </ScrollView>

        {/* Apply Referral Modal */}
        <Modal visible={showApplyModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Enter Referral Code</Text>
              <Text style={styles.modalSubtitle}>
                Enter a friend's referral code to get started!
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., YUK-ABC123"
                value={applyCode}
                onChangeText={setApplyCode}
                autoCapitalize="characters"
              />
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.cancelBtn]} 
                  onPress={() => setShowApplyModal(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.applyModalBtn]} 
                  onPress={handleApplyReferral}
                  disabled={applying}
                >
                  <Text style={styles.applyModalBtnText}>
                    {applying ? 'Applying...' : 'Apply Code'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },
  closeBtn: { padding: 8 },
  closeBtnText: { fontSize: 24, color: '#333' },
  content: { flex: 1, padding: 16 },
  codeSection: { backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 16, alignItems: 'center', elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  codeBox: { backgroundColor: '#f0f2f5', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, marginBottom: 12 },
  codeText: { fontSize: 20, fontWeight: 'bold', color: '#007AFF', letterSpacing: 2 },
  linkSection: { width: '100%', marginBottom: 12 },
  linkLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  linkBox: { backgroundColor: '#f8f9fa', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#e0e0e0' },
  linkText: { fontSize: 12, color: '#333' },
  shareButtonsRow: { flexDirection: 'row', justifyContent: 'center', width: '100%', flexWrap: 'wrap' },
  shareBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, marginHorizontal: 4, marginBottom: 4, flex: 1, minWidth: 80 },
  shareBtnShare: { backgroundColor: '#007AFF' },
  shareBtnCopy: { backgroundColor: '#28a745' },
  shareBtnDrive: { backgroundColor: '#ff6f00' },
  shareBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  downloadSection: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, alignItems: 'center', elevation: 1, borderWidth: 1, borderColor: '#007AFF' },
  downloadSubText: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 12 },
  downloadBtn: { backgroundColor: '#ff6f00', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 8 },
  downloadBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  downloadLinkText: { fontSize: 10, color: '#999', marginTop: 8, textAlign: 'center', maxWidth: '100%' },
  driveInfoBox: { backgroundColor: '#fff3cd', padding: 10, borderRadius: 8, marginTop: 10, width: '100%' },
  driveInfoText: { fontSize: 12, color: '#856404', textAlign: 'center' },
  statsSection: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 10, marginHorizontal: 4, alignItems: 'center', elevation: 1 },
  statNumber: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  useBtn: { backgroundColor: '#28a745', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  useBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  applyBtn: { backgroundColor: '#fff', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#007AFF' },
  applyBtnText: { color: '#007AFF', fontSize: 14, fontWeight: '600' },
  historySection: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, elevation: 1 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  historyInfo: { flex: 1 },
  historyDate: { fontSize: 12, color: '#666' },
  historyDetail: { fontSize: 14, color: '#333', marginTop: 2 },
  historyStatus: { fontSize: 12, fontWeight: 'bold' },
  statusUsed: { color: '#28a745' },
  statusPending: { color: '#ff9800' },
  howItWorks: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 20, elevation: 1 },
  step: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  stepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#007AFF', color: '#fff', textAlign: 'center', lineHeight: 28, fontSize: 14, fontWeight: 'bold', marginRight: 12 },
  stepText: { flex: 1, fontSize: 14, color: '#333' },
  emptyText: { textAlign: 'center', color: '#999', paddingVertical: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 16 },
  modalInput: { backgroundColor: '#f0f2f5', borderRadius: 8, padding: 12, fontSize: 16, textAlign: 'center', letterSpacing: 2 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 6 },
  cancelBtn: { backgroundColor: '#f0f2f5' },
  applyModalBtn: { backgroundColor: '#007AFF' },
  cancelBtnText: { color: '#666', fontWeight: 'bold' },
  applyModalBtnText: { color: '#fff', fontWeight: 'bold' }
});

export default ReferralScreen;
