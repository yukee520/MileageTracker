import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, Modal, Share, Platform, Linking } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import ExcelJS from 'exceljs';
import PaymentModal from './components/PaymentModal';
import AdminPanel from './components/AdminPanel';
import ReferralScreen from './components/ReferralScreen';
import ReferralService from './services/ReferralService';

// ============================================================
// SUPABASE CONFIGURATION
// ============================================================
const SUPABASE_URL = 'https://dkpjicqepexhgbrzzreo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7CXIRyhWhmsQfRfj9dDhWw_Z2efV6fx';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// CONSTANTS
// ============================================================
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DEFAULT_PURPOSES = {
  business: ['Client Visit', 'Site Inspection', 'Office Delivery', 'Meeting', 'Business Travel'],
  personal: ['Commute', 'Shopping / Groceries', 'Family / Personal', 'Leisure', 'Medical']
};

const TIER_CONFIG = {
  'Personal Free': { limit: 30, excel: false, price: '$0/mo', group: false, db_tier: 'personal_free' },
  'Personal Basic': { limit: 100, excel: true, price: '$4.99/mo', group: false, db_tier: 'personal_basic' },
  'Personal Pro': { limit: 99999, excel: true, price: '$9.99/mo', group: false, db_tier: 'personal_pro' },
  'Group Basic': { limit: 100, maxMembers: 10, excel: true, price: '$7/seat/mo', group: true, db_tier: 'team_basic' },
  'Group Pro': { limit: 99999, maxMembers: 25, excel: true, price: '$12/seat/mo', group: true, db_tier: 'team_pro' },
};

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('loading'); 
  const [activeTab, setActiveTab] = useState('home');
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [userId, setUserId] = useState(null);
  const [driverName, setDriverName] = useState('');
  const [vehicleInfo, setVehicleInfo] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [subscriptionTier, setSubscriptionTier] = useState('Personal Free');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [teamId, setTeamId] = useState(null);
  const [subscriptionExpiry, setSubscriptionExpiry] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState('free');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showReferralScreen, setShowReferralScreen] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editVehicle, setEditVehicle] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [showMemberTripDetails, setShowMemberTripDetails] = useState(false);
  const [selectedMemberTrips, setSelectedMemberTrips] = useState([]);
  const [selectedMemberName, setSelectedMemberName] = useState('');
  const [trips, setTrips] = useState([]);
  const [purposes, setPurposes] = useState(DEFAULT_PURPOSES);
  const [selectedCategory, setSelectedCategory] = useState('Business');
  const [selectedPurpose, setSelectedPurpose] = useState('');
  const [showPurposeManager, setShowPurposeManager] = useState(false);
  const [managerCategory, setManagerCategory] = useState('Business');
  const [newPurposeInput, setNewPurposeInput] = useState('');
  const [editingPurposeIndex, setEditingPurposeIndex] = useState(null);
  const [editingPurposeText, setEditingPurposeText] = useState('');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedMonthNum, setSelectedMonthNum] = useState('ALL');
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [editPurpose, setEditPurpose] = useState('');
  const [editFrom, setEditFrom] = useState('');
  const [editTo, setEditTo] = useState('');
  const [editPlaceName, setEditPlaceName] = useState('');
  const [editDistance, setEditDistance] = useState('');
  const [editCategory, setEditCategory] = useState('Business');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [tracking, setTracking] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [route, setRoute] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [activeTrip, setActiveTrip] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [viewingTrip, setViewingTrip] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingTierUpgrade, setPendingTierUpgrade] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  
  // Referral deep link state
  const [pendingReferralCode, setPendingReferralCode] = useState(null);

  const isLoadingRef = useRef(false);
  const isInitializedRef = useRef(false);
  const isFirstRender = useRef(true);

  // ============================================================
  // DEEP LINK HANDLER
  // ============================================================
  const handleDeepLink = async (url) => {
    try {
      console.log('🔗 Deep link received:', url);
      
      if (url && url.includes('mileagetracker://referral')) {
        const params = new URLSearchParams(url.split('?')[1]);
        const code = params.get('code');
        
        if (code) {
          console.log('✅ Referral code captured:', code);
          setPendingReferralCode(code);
          
          // Save to AsyncStorage for later use during registration
          await AsyncStorage.setItem('@referral_code', code);
          
          Alert.alert(
            '🎉 Referral Code Detected!',
            `You were referred by a friend!\n\nYour friend will get a free month after you complete your first trip.`,
            [
              {
                text: 'Great!',
                onPress: () => {
                  // If user is already logged in, apply the referral
                  if (user?.id) {
                    applyReferralCode(code);
                  }
                }
              }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
    }
  };

  const applyReferralCode = async (code) => {
    try {
      const result = await ReferralService.applyReferral(code, user.id);
      if (result.success) {
        Alert.alert('✅ Referral Applied!', 'Your referral code has been applied successfully.');
        await AsyncStorage.removeItem('@referral_code');
      }
    } catch (error) {
      console.error('Error applying referral:', error);
    }
  };

  // ============================================================
  // DEEP LINK EFFECTS
  // ============================================================
  useEffect(() => {
    // Handle initial URL when app starts
    const handleInitialUrl = async () => {
      try {
        const url = await Linking.getInitialURL();
        if (url) {
          await handleDeepLink(url);
        }
      } catch (error) {
        console.error('Error getting initial URL:', error);
      }
    };

    handleInitialUrl();

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Check for saved referral code on login
  useEffect(() => {
    const checkSavedReferral = async () => {
      if (user?.id) {
        const savedCode = await AsyncStorage.getItem('@referral_code');
        if (savedCode) {
          await applyReferralCode(savedCode);
        }
      }
    };
    
    if (user?.id) {
      checkSavedReferral();
    }
  }, [user]);

  // ============================================================
  // LOAD TRIPS
  // ============================================================
  const loadTrips = useCallback(async (userId, teamId, role) => {
    try {
      console.log('🔍 Loading trips for user:', userId);
      const userRole = role || 'user';
      let query = supabase
        .from('trip_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (userRole === 'admin' && teamId) {
        query = query.eq('team_id', teamId);
      } else {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('❌ Error loading trips:', error);
        return [];
      }

      setUserId(userId);
      const formattedTrips = (data || []).map(trip => ({
        id: trip.id,
        userId: trip.user_id,
        userName: trip.user_id === userId ? driverName : 'Team Member',
        vehicle: 'Vehicle',
        date: new Date(trip.trip_date).toLocaleDateString(),
        year: new Date(trip.trip_date).getFullYear().toString(),
        month: String(new Date(trip.trip_date).getMonth() + 1).padStart(2, '0'),
        time: '00:00 - 00:00',
        purposeCategory: trip.purpose_category,
        purpose: trip.purpose,
        from: trip.from_address,
        to: trip.to_address,
        placeName: trip.place_name || '',
        distance: parseFloat(trip.distance_km)
      }));

      setTrips(formattedTrips);
      return formattedTrips;
    } catch (error) {
      console.error('❌ Error in loadTrips:', error);
      return [];
    }
  }, [driverName]);

  // ============================================================
  // CHECK SUBSCRIPTION STATUS
  // ============================================================
  const checkSubscriptionStatus = useCallback(async (teamId) => {
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

      const isActive = data.payment_status === 'active' || data.subscription_tier === 'personal_free';
      const expiryDate = data.subscription_end_date ? new Date(data.subscription_end_date) : null;
      
      if (data.payment_status === 'active' && expiryDate && expiryDate < new Date()) {
        await supabase
          .from('teams')
          .update({
            subscription_tier: 'personal_free',
            monthly_trip_limit: 30,
            payment_status: 'expired',
            max_members: 1
          })
          .eq('id', teamId);
        
        return {
          tier: 'Personal Free',
          limit: 30,
          status: 'expired',
          isActive: false,
          expiresAt: expiryDate
        };
      }

      return {
        tier: tierMap[data.subscription_tier] || 'Personal Free',
        limit: data.monthly_trip_limit || 30,
        status: data.payment_status || 'free',
        isActive: isActive,
        expiresAt: expiryDate
      };
    } catch (error) {
      console.error('❌ Error checking subscription:', error);
      return null;
    }
  }, []);

  // ============================================================
  // LOAD TEAM MEMBERS
  // ============================================================
  const loadTeamMembers = async (teamId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('team_id', teamId);

      if (error) throw error;

      const membersWithStats = await Promise.all(data.map(async (member) => {
        const { count, error: countError } = await supabase
          .from('trip_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', member.id);

        const { data: distanceData } = await supabase
          .from('trip_logs')
          .select('distance_km')
          .eq('user_id', member.id);

        const totalDistance = distanceData?.reduce((sum, t) => sum + parseFloat(t.distance_km), 0) || 0;

        return {
          id: member.id,
          name: member.full_name || member.email,
          role: member.role || 'member',
          trips: count || 0,
          distance: totalDistance
        };
      }));

      setTeamMembers(membersWithStats);
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  // ============================================================
  // LOAD USER DATA
  // ============================================================
  const loadUserData = useCallback(async (user) => {
    if (isLoadingRef.current) {
      console.log('⏳ Already loading, skipping...');
      return;
    }

    if (!user || !user.id) {
      console.log('⚠️ No user provided to loadUserData');
      return;
    }

    console.log('📱 Loading user data for:', user.id);
    
    try {
      isLoadingRef.current = true;
      setIsLoading(true);
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('❌ Profile fetch error:', profileError);
        throw profileError;
      }

      let currentProfile = profileData;
      let currentTeamId = null;

      if (!currentProfile) {
        console.log('🆕 No profile found, creating one...');
        const teamName = `${user.email.split('@')[0]}'s Team`;
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .insert({
            name: teamName,
            subscription_tier: 'personal_free',
            monthly_trip_limit: 30,
            max_members: 1
          })
          .select()
          .single();

        if (teamError) {
          console.error('❌ Team creation error:', teamError);
        } else {
          currentTeamId = teamData.id;
          console.log('✅ Team created:', currentTeamId);
        }

        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email.split('@')[0],
            role: 'member',
            team_id: currentTeamId
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ Profile creation error:', createError);
          throw createError;
        }

        currentProfile = newProfile;
        currentTeamId = currentProfile.team_id;
        console.log('✅ Profile created:', currentProfile);
      } else {
        currentTeamId = currentProfile.team_id;
        console.log('✅ Existing profile found:', currentProfile);
      }

      const isUserAdmin = currentProfile.role === 'admin';
      setIsAdmin(isUserAdmin);

      setProfile(currentProfile);
      setDriverName(currentProfile.full_name || '');
      setUserEmail(currentProfile.email || '');
      setTeamId(currentTeamId);
      setUserId(user.id);

      if (currentTeamId) {
        console.log('🔍 Fetching team subscription...');
        const status = await checkSubscriptionStatus(currentTeamId);
        if (status) {
          setSubscriptionTier(status.tier);
          setSubscriptionStatus(status.status);
          setSubscriptionExpiry(status.expiresAt);
          console.log('📊 Subscription status:', status);
        }
      }

      console.log('📋 Loading trips...');
      const userRole = currentProfile.role || 'member';
      const loadedTrips = await loadTrips(user.id, currentTeamId, userRole);
      console.log(`📊 Total trips loaded: ${loadedTrips?.length || 0}`);

      if (userRole === 'admin' && currentTeamId) {
        console.log('👥 Loading team members...');
        await loadTeamMembers(currentTeamId);
      }

      console.log('✅ User data loaded successfully');
      setCurrentScreen('app');
      isFirstRender.current = false;
    } catch (error) {
      console.error('❌ Error loading user data:', error);
      Alert.alert('Error', 'Failed to load user data. Please try again.\n\nError: ' + error.message);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [loadTrips, checkSubscriptionStatus]);

  // ============================================================
  // AUTH EFFECT
  // ============================================================
  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      if (isInitializedRef.current) {
        console.log('⏳ Already initialized, skipping...');
        return;
      }

      try {
        console.log('🚀 Initializing app...');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && isMounted) {
          console.log('✅ Session found for user:', session.user.id);
          setSession(session);
          setUser(session.user);
          await loadUserData(session.user);
          isInitializedRef.current = true;
        } else if (isMounted) {
          console.log('❌ No session found, showing auth screen');
          setCurrentScreen('auth');
          isFirstRender.current = false;
        }
      } catch (error) {
        console.error('❌ Initialization error:', error);
        if (isMounted) {
          setCurrentScreen('auth');
          isFirstRender.current = false;
        }
      }
    };

    initializeApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth event:', event);
        
        if (event === 'SIGNED_IN' && session?.user && isMounted) {
          console.log('✅ User signed in:', session.user.id);
          setSession(session);
          setUser(session.user);
          isInitializedRef.current = false;
          await loadUserData(session.user);
          isInitializedRef.current = true;
        } else if (event === 'SIGNED_OUT' && isMounted) {
          console.log('🚪 User signed out');
          setSession(null);
          setUser(null);
          setTrips([]);
          setProfile(null);
          setTeamMembers([]);
          isInitializedRef.current = false;
          setCurrentScreen('auth');
        }
      }
    );

    return () => {
      console.log('🧹 Cleaning up');
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [loadUserData]);

  // ============================================================
  // COMPUTED VALUES
  // ============================================================
  const getCurrentMonthTripCount = useCallback(() => {
    const now = new Date();
    const currentYear = `${now.getFullYear()}`;
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    
    const count = trips.filter(t => {
      if (userId && t.userId === userId) {
        return t.year === currentYear && t.month === currentMonth;
      }
      return t.year === currentYear && t.month === currentMonth && t.userName === driverName;
    }).length;
    
    return count;
  }, [trips, userId, driverName]);

  const monthlyUsageCount = useMemo(() => getCurrentMonthTripCount(), [getCurrentMonthTripCount]);
  const currentConfig = useMemo(() => TIER_CONFIG[subscriptionTier] || TIER_CONFIG['Personal Free'], [subscriptionTier]);
  const currentLimit = useMemo(() => currentConfig.limit, [currentConfig]);
  const isUsageLimitReached = useMemo(() => monthlyUsageCount >= currentLimit, [monthlyUsageCount, currentLimit]);

  const availableYears = useMemo(() => {
    return Array.from(new Set(trips.map(t => t.year).filter(Boolean))).sort().reverse();
  }, [trips]);
  
  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      const matchYear = selectedYear === 'ALL' || t.year === selectedYear;
      const matchMonth = selectedMonthNum === 'ALL' || t.month === selectedMonthNum;
      return matchYear && matchMonth;
    });
  }, [trips, selectedYear, selectedMonthNum]);
  
  const currentUserTrips = useMemo(() => {
    return filteredTrips.filter(t => {
      if (userId && t.userId === userId) return true;
      return t.userName === driverName;
    });
  }, [filteredTrips, userId, driverName]);
  
  const totalTripsCount = useMemo(() => currentUserTrips.length, [currentUserTrips]);
  const totalDistanceCount = useMemo(() => {
    return currentUserTrips.reduce((acc, curr) => acc + curr.distance, 0).toFixed(1);
  }, [currentUserTrips]);

  const teamStats = useMemo(() => {
    const filtered = filteredTrips;
    const teamNames = teamMembers.map(m => m.name);
    const teamTrips = filtered.filter(t => teamNames.includes(t.userName));
    const totalTrips = teamTrips.length;
    const totalDistance = teamTrips.reduce((acc, curr) => acc + curr.distance, 0);
    return { totalTrips, totalDistance: totalDistance.toFixed(1) };
  }, [filteredTrips, teamMembers]);

  // ============================================================
  // PAYMENT HANDLERS
  // ============================================================
  const handleUpgradeTier = async (newTier) => {
    console.log('⬆️ Initiating upgrade to tier:', newTier);
    
    const paidTiers = ['Personal Basic', 'Personal Pro', 'Group Basic', 'Group Pro'];
    const isNewTierPaid = paidTiers.includes(newTier);
    const isCurrentTierPaid = paidTiers.includes(subscriptionTier);
    
    if (isCurrentTierPaid && !isNewTierPaid) {
      const status = await checkSubscriptionStatus(teamId);
      if (status && status.isActive && status.status === 'active') {
        const expiryDate = status.expiresAt ? new Date(status.expiresAt).toLocaleDateString() : 'Unknown';
        Alert.alert(
          'Cannot Downgrade',
          `You have an active ${subscriptionTier} subscription until ${expiryDate}.`
        );
        return;
      }
    }
    
    if (isNewTierPaid) {
      if (subscriptionTier === newTier) {
        Alert.alert('Already Subscribed', `You are already on the ${newTier} plan.`);
        return;
      }
      setPendingTierUpgrade(newTier);
      setShowPaymentModal(true);
    } else {
      const status = await checkSubscriptionStatus(teamId);
      if (status && status.isActive && status.status === 'active') {
        Alert.alert('Cannot Downgrade', `You have an active ${subscriptionTier} subscription. Please wait until it expires.`);
        return;
      }
      await performTierUpgrade(newTier);
    }
  };

  const performTierUpgrade = async (newTier) => {
    try {
      setPaymentLoading(true);
      const config = TIER_CONFIG[newTier];
      if (!config) {
        Alert.alert('Error', 'Invalid subscription tier');
        return;
      }

      const { error } = await supabase
        .from('teams')
        .update({
          subscription_tier: config.db_tier,
          monthly_trip_limit: config.limit,
          max_members: config.maxMembers || 1
        })
        .eq('id', teamId);

      if (error) throw error;

      setSubscriptionTier(newTier);
      await loadUserData(user);
      setShowSubscriptionModal(false);
      Alert.alert('Success', `You are now on the ${newTier} plan!`);
    } catch (error) {
      console.error('❌ Error upgrading tier:', error);
      Alert.alert('Error', 'Failed to upgrade subscription: ' + error.message);
    } finally {
      setPaymentLoading(false);
      setShowPaymentModal(false);
    }
  };

  const handlePaymentSuccess = async (tier) => {
    console.log('✅ Payment successful for tier:', tier);
    await performTierUpgrade(tier);
    setShowPaymentModal(false);
    setPendingTierUpgrade(null);
  };

  const handlePaymentError = (error) => {
    console.error('❌ Payment error:', error);
    Alert.alert('Payment Failed', error || 'There was an issue with your payment.');
    setShowPaymentModal(false);
    setPendingTierUpgrade(null);
  };

  const handlePaymentCancel = () => {
    console.log('Payment cancelled by user');
    setShowPaymentModal(false);
    setPendingTierUpgrade(null);
  };

  // ============================================================
  // AUTH HANDLERS
  // ============================================================
  const handleAuth = async () => {
    if (!loginEmail || !loginPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      let result;
      if (isLogin) {
        result = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: loginPassword,
        });
      } else {
        result = await supabase.auth.signUp({
          email: loginEmail,
          password: loginPassword,
          options: {
            data: {
              full_name: loginEmail.split('@')[0],
            }
          }
        });
      }

      if (result.error) {
        console.error('Auth error:', result.error);
        throw result.error;
      }

      if (!isLogin) {
        Alert.alert(
          'Success', 
          'Account created! Please sign in.',
          [{ text: 'OK', onPress: () => {
            setIsLogin(true);
            setLoginPassword('');
            setIsLoading(false);
          }}]
        );
      } else {
        Alert.alert('Welcome!', 'Logged in successfully.');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Auth error:', error);
      Alert.alert('Authentication Error', error.message);
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setCurrentScreen('auth');
    } catch (error) {
      Alert.alert('Error', 'Failed to logout');
    }
  };

  // ============================================================
  // SYNC FUNCTIONS
  // ============================================================
  const syncProfileToSupabase = async (updatedProfile) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: updatedProfile.name,
          email: updatedProfile.email,
        })
        .eq('id', user.id);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error syncing profile:', error);
      return false;
    }
  };

  const syncTripToSupabase = async (tripData) => {
    try {
      console.log('Saving trip to Supabase...');
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, team_id, full_name, role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        throw new Error('Could not find your profile. Please logout and login again.');
      }

      let teamId = profileData.team_id;
      
      if (!teamId) {
        console.log('No team found, creating one...');
        const teamName = `${profileData.full_name || user.email.split('@')[0]}'s Team`;
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .insert({
            name: teamName,
            subscription_tier: 'personal_free',
            monthly_trip_limit: 30,
            max_members: 1
          })
          .select()
          .single();

        if (teamError) {
          console.error('Error creating team:', teamError);
        } else {
          teamId = teamData.id;
          console.log('Team created:', teamData);
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ team_id: teamId })
            .eq('id', user.id);
          if (updateError) {
            console.error('Error updating profile with team_id:', updateError);
          }
        }
      }

      let formattedDate;
      try {
        if (typeof tripData.date === 'string') {
          const dateParts = tripData.date.split('/');
          if (dateParts.length === 3) {
            const month = parseInt(dateParts[0]) - 1;
            const day = parseInt(dateParts[1]);
            const year = parseInt(dateParts[2]);
            const dateObj = new Date(year, month, day);
            formattedDate = dateObj.toISOString().split('T')[0];
          } else {
            const dateObj = new Date(tripData.date);
            if (!isNaN(dateObj.getTime())) {
              formattedDate = dateObj.toISOString().split('T')[0];
            } else {
              const now = new Date();
              formattedDate = now.toISOString().split('T')[0];
            }
          }
        } else {
          const now = new Date();
          formattedDate = now.toISOString().split('T')[0];
        }
      } catch (dateError) {
        const now = new Date();
        formattedDate = now.toISOString().split('T')[0];
      }

      const insertData = {
        user_id: user.id,
        team_id: teamId || null,
        trip_date: formattedDate,
        purpose_category: tripData.purposeCategory,
        purpose: tripData.purpose,
        from_address: tripData.from,
        to_address: tripData.to,
        place_name: tripData.placeName || null,
        distance_km: tripData.distance
      };
      
      const { data, error } = await supabase
        .from('trip_logs')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error inserting trip:', error);
        throw error;
      }
      
      console.log('Trip saved successfully:', data);
      return data;
    } catch (error) {
      console.error('Error syncing trip:', error);
      Alert.alert('Error', 'Failed to save trip to server. Please try again.\n\nError: ' + error.message);
      return null;
    }
  };

  const syncTripUpdateToSupabase = async (tripId, updatedData) => {
    try {
      let formattedDate;
      try {
        if (typeof updatedData.date === 'string') {
          const dateParts = updatedData.date.split('/');
          if (dateParts.length === 3) {
            const month = parseInt(dateParts[0]) - 1;
            const day = parseInt(dateParts[1]);
            const year = parseInt(dateParts[2]);
            const dateObj = new Date(year, month, day);
            formattedDate = dateObj.toISOString().split('T')[0];
          } else {
            const dateObj = new Date(updatedData.date);
            if (!isNaN(dateObj.getTime())) {
              formattedDate = dateObj.toISOString().split('T')[0];
            } else {
              const now = new Date();
              formattedDate = now.toISOString().split('T')[0];
            }
          }
        } else {
          const now = new Date();
          formattedDate = now.toISOString().split('T')[0];
        }
      } catch (e) {
        const now = new Date();
        formattedDate = now.toISOString().split('T')[0];
      }
      
      const { error } = await supabase
        .from('trip_logs')
        .update({
          purpose_category: updatedData.purposeCategory,
          purpose: updatedData.purpose,
          from_address: updatedData.from,
          to_address: updatedData.to,
          place_name: updatedData.placeName || null,
          distance_km: updatedData.distance,
          trip_date: formattedDate
        })
        .eq('id', tripId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating trip:', error);
      Alert.alert('Error', 'Failed to update trip');
      return false;
    }
  };

  const syncTripDeleteToSupabase = async (tripId) => {
    try {
      const { error } = await supabase
        .from('trip_logs')
        .delete()
        .eq('id', tripId);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting trip:', error);
      Alert.alert('Error', 'Failed to delete trip');
      return false;
    }
  };

  // ============================================================
  // PROFILE FUNCTIONS
  // ============================================================
  const saveProfileData = async (updatedProfile) => {
    try {
      setDriverName(updatedProfile.name);
      setUserEmail(updatedProfile.email);
      setVehicleInfo(updatedProfile.vehicle);
      setSubscriptionTier(updatedProfile.tier);

      await syncProfileToSupabase(updatedProfile);
      await loadUserData(user);
    } catch (e) {
      console.error("Failed to save profile", e);
    }
  };

  // ============================================================
  // TRIP FUNCTIONS
  // ============================================================
  const saveTrips = async (newTrips) => {
    setTrips(newTrips);
  };

  const endTrip = async () => {
    if (subscription) subscription.remove();
    setTracking(false);
    setLoadingSummary(true);

    const endTime = new Date();
    const distanceKM = calculateDistance(route);

    let fromAddr = 'N/A', toAddr = 'N/A', extractedPlaceName = '';

    if (route.length > 0) {
      const startInfo = await getAddressInfo(route[0]);
      const endInfo = await getAddressInfo(route[route.length - 1]);
      fromAddr = startInfo.simpleAddress;
      toAddr = endInfo.simpleAddress;
      extractedPlaceName = endInfo.placeName;
    }

    const startDateObj = new Date(startTime);
    const dateString = startDateObj.toLocaleDateString();
    
    const tripData = {
      date: dateString,
      year: startDateObj.getFullYear().toString(),
      month: String(startDateObj.getMonth() + 1).padStart(2, '0'),
      time: `${startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${endTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
      purposeCategory: selectedCategory,
      purpose: selectedPurpose || 'General',
      from: fromAddr,
      to: toAddr,
      placeName: extractedPlaceName,
      distance: parseFloat(distanceKM),
      userName: driverName
    };

    const savedTrip = await syncTripToSupabase(tripData);
    
    if (savedTrip) {
      const newTrip = {
        id: savedTrip.id,
        ...tripData
      };
      const updatedHistory = [newTrip, ...trips];
      await saveTrips(updatedHistory);
      setActiveTrip(newTrip);
      setViewingTrip(newTrip);
      
      // Check if this is the first trip and user was referred (for affiliate rewards)
      await ReferralService.checkAndRewardReferral(user.id);
    }
    
    setLoadingSummary(false);
  };

  const handleSaveEdit = async () => {
    const distNum = parseFloat(editDistance);
    if (isNaN(distNum) || distNum < 0) {
      Alert.alert('Invalid Distance', 'Please enter a valid distance.');
      return;
    }

    const updatedTrip = {
      purpose: editPurpose,
      from: editFrom,
      to: editTo,
      placeName: editPlaceName,
      distance: distNum,
      purposeCategory: editCategory,
      date: editDate,
      time: editTime
    };

    const success = await syncTripUpdateToSupabase(editingTrip.id, updatedTrip);
    
    if (success) {
      const updatedTrips = trips.map((item) => {
        if (item.id === editingTrip.id) {
          return {
            ...item,
            purpose: editPurpose,
            from: editFrom,
            to: editTo,
            placeName: editPlaceName,
            distance: distNum,
            purposeCategory: editCategory,
            date: editDate,
            time: editTime
          };
        }
        return item;
      });

      await saveTrips(updatedTrips);
      
      if (viewingTrip && viewingTrip.id === editingTrip.id) {
        const updatedTripData = updatedTrips.find(t => t.id === editingTrip.id);
        setViewingTrip(updatedTripData);
        setActiveTrip(updatedTripData);
      }
      
      setEditingTrip(null);
      Alert.alert('Success', 'Trip updated successfully!');
    }
  };

  const handleDeleteTrip = (id) => {
    Alert.alert("Delete Trip", "Are you sure you want to remove this trip?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const success = await syncTripDeleteToSupabase(id);
          if (success) {
            const updated = trips.filter(item => item.id !== id);
            await saveTrips(updated);
            if (viewingTrip && viewingTrip.id === id) {
              setViewingTrip(null);
              setActiveTrip(null);
              setActiveTab('home');
            }
          }
        }
      }
    ]);
  };

  // ============================================================
  // EXISTING FUNCTIONS
  // ============================================================
  const getAddressInfo = async (coords) => {
    if (!coords) return { simpleAddress: 'N/A', placeName: '' };
    try {
      const [address] = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      if (address) {
        const district = address.district || address.subregion || address.street || '';
        const city = address.city || address.region || '';
        const simpleParts = [district, city].filter(Boolean);
        const simpleAddress = simpleParts.length > 0 ? simpleParts.join(', ') : `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
        const placeName = address.name || '';
        return { simpleAddress, placeName };
      }
    } catch (error) {
      console.error("Geocoding Error:", error);
    }
    return { simpleAddress: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`, placeName: '' };
  };

  const calculateDistance = (coords) => {
    let totalMeters = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      const lat1 = coords[i].latitude, lon1 = coords[i].longitude;
      const lat2 = coords[i+1].latitude, lon2 = coords[i+1].longitude;
      const R = 6371e3;
      const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
      const Δφ = (lat2 - lat1) * Math.PI / 180;
      const Δλ = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
      totalMeters += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }
    return (totalMeters / 1000).toFixed(2);
  };

  const handleInitiateNewTrip = () => {
    if (isUsageLimitReached) {
      Alert.alert(
        "Limit Reached",
        `You have reached your limit of ${currentLimit} trips this month on the ${subscriptionTier} plan.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "View Upgrade Options", onPress: () => setShowSubscriptionModal(true) }
        ]
      );
      return;
    }
    setActiveTab('purpose_select');
  };

  const startTripWithPurpose = async (purposeName) => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Permission to access location was denied');
      return;
    }

    setSelectedPurpose(purposeName);
    setRoute([]);
    setActiveTrip(null);
    setStartTime(new Date());
    setTracking(true);
    setActiveTab('tracking');

    const sub = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 5 },
      (loc) => {
        setRoute((prev) => [...prev, { latitude: loc.coords.latitude, longitude: loc.coords.longitude }]);
      }
    );
    setSubscription(sub);
  };

  const deleteActiveTrip = () => {
    Alert.alert("Discard Trip?", "Are you sure you want to cancel and delete this trip?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Discard", 
        style: "destructive", 
        onPress: () => {
          if (subscription) subscription.remove();
          setSubscription(null);
          setTracking(false);
          setRoute([]);
          setActiveTrip(null);
          setLoadingSummary(false);
          setActiveTab('home');
        } 
      }
    ]);
  };

  const openEditModal = (trip) => {
    setEditingTrip(trip);
    setEditPurpose(trip.purpose || '');
    setEditFrom(trip.from || '');
    setEditTo(trip.to || '');
    setEditPlaceName(trip.placeName || '');
    setEditDistance(trip.distance ? trip.distance.toString() : '');
    setEditCategory(trip.purposeCategory || 'Business');
    setEditDate(trip.date || '');
    setEditTime(trip.time || '');
  };

  // ============================================================
  // PURPOSE MANAGEMENT FUNCTIONS
  // ============================================================
  const addPurpose = () => {
    if (!newPurposeInput.trim()) {
      Alert.alert('Required', 'Please enter a purpose name.');
      return;
    }

    const category = managerCategory.toLowerCase();
    const currentPurposes = purposes[category] || [];
    
    if (currentPurposes.includes(newPurposeInput.trim())) {
      Alert.alert('Duplicate', 'This purpose already exists.');
      return;
    }

    const updatedPurposes = {
      ...purposes,
      [category]: [...currentPurposes, newPurposeInput.trim()]
    };

    setPurposes(updatedPurposes);
    setNewPurposeInput('');
    Alert.alert('Success', 'Purpose added successfully!');
  };

  const deletePurpose = (index) => {
    Alert.alert(
      'Delete Purpose',
      'Are you sure you want to delete this purpose?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const category = managerCategory.toLowerCase();
            const currentPurposes = purposes[category] || [];
            const updatedPurposes = {
              ...purposes,
              [category]: currentPurposes.filter((_, i) => i !== index)
            };
            setPurposes(updatedPurposes);
          }
        }
      ]
    );
  };

  const startEditingPurpose = (index, text) => {
    setEditingPurposeIndex(index);
    setEditingPurposeText(text);
  };

  const saveEditingPurpose = () => {
    if (!editingPurposeText.trim()) {
      Alert.alert('Required', 'Please enter a purpose name.');
      return;
    }

    const category = managerCategory.toLowerCase();
    const currentPurposes = purposes[category] || [];
    
    if (editingPurposeText.trim() !== currentPurposes[editingPurposeIndex] && 
        currentPurposes.includes(editingPurposeText.trim())) {
      Alert.alert('Duplicate', 'This purpose already exists.');
      return;
    }

    const updatedPurposes = {
      ...purposes,
      [category]: currentPurposes.map((p, i) => 
        i === editingPurposeIndex ? editingPurposeText.trim() : p
      )
    };

    setPurposes(updatedPurposes);
    setEditingPurposeIndex(null);
    setEditingPurposeText('');
    Alert.alert('Success', 'Purpose updated successfully!');
  };

  const resetToDefaultPurposes = () => {
    Alert.alert(
      'Reset Purposes',
      'This will reset all purposes to default. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setPurposes(DEFAULT_PURPOSES);
            Alert.alert('Success', 'Purposes reset to default!');
          }
        }
      ]
    );
  };

  // ============================================================
  // PROFILE EDIT FUNCTIONS
  // ============================================================
  const openProfileEdit = () => {
    setEditName(driverName);
    setEditEmail(userEmail);
    setEditVehicle(vehicleInfo);
    setShowProfileEdit(true);
  };

  const saveProfileEdit = async () => {
    if (!editName.trim()) {
      Alert.alert('Required', 'Name cannot be empty.');
      return;
    }

    const updatedProfile = {
      name: editName.trim(),
      email: editEmail.trim() || 'driver@example.com',
      vehicle: editVehicle.trim() || 'Standard Vehicle',
      tier: subscriptionTier
    };

    await saveProfileData(updatedProfile);
    setShowProfileEdit(false);
    Alert.alert('Success', 'Profile updated successfully!');
  };

  // ============================================================
  // GROUP ADMIN FUNCTIONS
  // ============================================================
  const getTeamMemberNames = useCallback(() => {
    return teamMembers.map(m => m.name);
  }, [teamMembers]);

  const getMemberTrips = useCallback((memberName) => {
    const filtered = filteredTrips;
    if (memberName === 'ALL') {
      const teamNames = getTeamMemberNames();
      return filtered.filter(t => teamNames.includes(t.userName));
    }
    return filtered.filter(t => t.userName === memberName);
  }, [filteredTrips, getTeamMemberNames]);

  const getMemberStats = useCallback((memberName) => {
    const memberTrips = getMemberTrips(memberName);
    const totalTrips = memberTrips.length;
    const totalDistance = memberTrips.reduce((acc, curr) => acc + curr.distance, 0);
    return { totalTrips, totalDistance: totalDistance.toFixed(1) };
  }, [getMemberTrips]);

  const viewMemberTripDetails = (memberName) => {
    const memberTrips = getMemberTrips(memberName);
    setSelectedMemberName(memberName);
    setSelectedMemberTrips(memberTrips);
    setShowMemberTripDetails(true);
  };

  // ============================================================
  // INVITE HANDLER
  // ============================================================
  const handleSendInvite = () => {
    if (!inviteEmail.trim()) {
      Alert.alert('Required', 'Please enter an email address.');
      return;
    }
    Alert.alert('Invitation Sent', `An invitation has been sent to ${inviteEmail}.`);
    setInviteEmail('');
    setShowInviteModal(false);
  };

  // ============================================================
  // EXCEL EXPORT
  // ============================================================
  const generateExcelReport = async () => {
    try {
      setIsExporting(true);
      const allTrips = trips;
      
      if (allTrips.length === 0) {
        Alert.alert('No Data', 'No trips found to export.');
        setIsExporting(false);
        return;
      }

      const workbook = new ExcelJS.Workbook();
      workbook.creator = driverName || 'Mileage Tracker';
      workbook.created = new Date();
      
      const sheet = workbook.addWorksheet('Trip Logs');
      
      sheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Time', key: 'time', width: 20 },
        { header: 'Category', key: 'category', width: 15 },
        { header: 'Purpose', key: 'purpose', width: 25 },
        { header: 'Place Name', key: 'placeName', width: 25 },
        { header: 'From', key: 'from', width: 30 },
        { header: 'To', key: 'to', width: 30 },
        { header: 'Distance (km)', key: 'distance', width: 15 },
        { header: 'Driver', key: 'driver', width: 20 }
      ];

      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF007AFF' } };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
      headerRow.height = 25;

      allTrips.forEach((trip, index) => {
        const row = sheet.addRow({
          date: trip.date || '',
          time: trip.time || '',
          category: trip.purposeCategory || '',
          purpose: trip.purpose || '',
          placeName: trip.placeName || '',
          from: trip.from || '',
          to: trip.to || '',
          distance: trip.distance || 0,
          driver: trip.userName || ''
        });
        row.height = 20;
        if (index % 2 === 0) {
          row.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
          });
        }
      });

      const totalDistance = allTrips.reduce((sum, t) => sum + (t.distance || 0), 0);
      const summaryRow = sheet.addRow({
        date: '',
        time: '',
        category: '',
        purpose: 'TOTAL',
        placeName: '',
        from: '',
        to: '',
        distance: totalDistance.toFixed(1),
        driver: ''
      });
      summaryRow.font = { bold: true };
      summaryRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F8FF' } };
      summaryRow.height = 25;

      if (currentConfig.group && teamMembers.length > 0) {
        const teamSheet = workbook.addWorksheet('Team Summary');
        teamSheet.columns = [
          { header: 'Member', key: 'name', width: 25 },
          { header: 'Trips', key: 'trips', width: 15 },
          { header: 'Distance (km)', key: 'distance', width: 20 }
        ];

        const teamHeader = teamSheet.getRow(1);
        teamHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        teamHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF28A745' } };
        teamHeader.alignment = { horizontal: 'center', vertical: 'middle' };
        teamHeader.height = 25;

        teamMembers.forEach((member) => {
          const stats = getMemberStats(member.name);
          teamSheet.addRow({
            name: member.name,
            trips: stats.totalTrips,
            distance: stats.totalDistance
          });
        });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `mileage_report_${timestamp}.xlsx`;
      
      let baseDir = null;
      try {
        if (FileSystem.documentDirectory) baseDir = FileSystem.documentDirectory;
      } catch (e) {}
      if (!baseDir) {
        try {
          if (FileSystem.cacheDirectory) baseDir = FileSystem.cacheDirectory;
        } catch (e) {}
      }
      if (!baseDir) {
        try {
          const savedDir = await AsyncStorage.getItem('@excel_export_dir');
          if (savedDir) baseDir = savedDir;
        } catch (e) {}
      }
      if (!baseDir) {
        baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '/data/data/com.yourcompany.mileagetracker/cache/';
      }
      if (!baseDir.endsWith('/') && !baseDir.endsWith('\\')) {
        baseDir = baseDir + '/';
      }
      try {
        await AsyncStorage.setItem('@excel_export_dir', baseDir);
      } catch (e) {}
      
      const filePath = `${baseDir}${fileName}`;
      console.log('💾 Saving Excel to:', filePath);

      const buffer = await workbook.xlsx.writeBuffer();
      const base64String = arrayBufferToBase64(buffer);
      
      await FileSystem.writeAsStringAsync(filePath, base64String, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists) {
        throw new Error('File was not created successfully');
      }

      console.log('✅ File saved successfully, size:', fileInfo.size);

      try {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(filePath, {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: 'Export Trip Report',
            UTI: 'com.microsoft.excel.xlsx',
          });
        } else {
          await Share.share({
            title: 'Mileage Report',
            url: filePath,
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          });
        }
      } catch (shareError) {
        console.log('⚠️ Share error, but file was saved:', shareError);
        Alert.alert('File Saved', `Report saved to: ${filePath}`);
      }
      
      Alert.alert('Success', 'Excel report generated successfully!');
    } catch (error) {
      console.error('❌ Error generating Excel report:', error);
      Alert.alert('Error', 'Failed to generate Excel report: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = () => {
    if (!currentConfig.excel) {
      Alert.alert(
        "Feature Locked",
        "Excel exports are only available on Personal Basic, Personal Pro, and Group plans.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "View Plans", onPress: () => setShowSubscriptionModal(true) }
        ]
      );
      return;
    }
    if (isExporting) {
      Alert.alert('Please wait', 'Export is already in progress...');
      return;
    }
    generateExcelReport();
  };

  // ============================================================
  // RENDER
  // ============================================================
  if (currentScreen === 'loading' || isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 20, color: '#666' }}>Loading...</Text>
      </View>
    );
  }

  if (currentScreen === 'auth') {
    return (
      <View style={[styles.container, { justifyContent: 'center', paddingHorizontal: 20 }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.welcomeTitle}>🚗 Mileage Tracker</Text>
          <Text style={styles.welcomeSub}>{isLogin ? 'Sign in to your account' : 'Create a new account'}</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput 
              style={styles.textInput} 
              placeholder="your@email.com" 
              keyboardType="email-address"
              value={loginEmail} 
              onChangeText={setLoginEmail}
              autoCapitalize="none"
            />
            
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput 
              style={styles.textInput} 
              placeholder="••••••••" 
              secureTextEntry
              value={loginPassword} 
              onChangeText={setLoginPassword}
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleAuth} disabled={isLoading}>
              <Text style={styles.submitBtnText}>{isLogin ? 'Sign In' : 'Sign Up'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
              <Text style={styles.switchAuthText}>
                {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ============================================================
  // MAIN APP RENDER
  // ============================================================
  return (
    <View style={styles.container}>
      <View style={{ flex: 1 }}>
        {/* HOME TAB */}
        {activeTab === 'home' && (
          <ScrollView style={styles.content}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={styles.greeting}>Hello, {driverName}! 👋</Text>
                <Text style={styles.subGreeting}>{vehicleInfo ? `🚘 ${vehicleInfo}` : 'Mileage Tracker'}</Text>
              </View>
              <TouchableOpacity style={styles.tierBadge} onPress={() => setShowSubscriptionModal(true)}>
                <Text style={styles.tierBadgeText}>{subscriptionTier.toUpperCase()}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.usageCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={styles.usageTitle}>Monthly Limit ({subscriptionTier})</Text>
                <Text style={styles.usageCountText}>{monthlyUsageCount} / {currentLimit >= 9999 ? '∞' : currentLimit} Trips</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[
                  styles.progressBar, 
                  { width: `${Math.min((monthlyUsageCount / currentLimit) * 100, 100)}%` },
                  isUsageLimitReached && { backgroundColor: '#dc3545' }
                ]} />
              </View>
              {isUsageLimitReached && <Text style={styles.usageWarningText}>⚠️ Usage limit reached. Upgrade to record more trips!</Text>}
            </View>

            <TouchableOpacity 
              style={[styles.startTripBtn, isUsageLimitReached && { backgroundColor: '#6c757d' }]} 
              onPress={handleInitiateNewTrip}>
              <Text style={styles.startTripBtnText}>🚗 START NEW TRIP</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <ScrollView style={styles.content}>
            <Text style={styles.headerTitle}>Dashboard & Analytics</Text>
            <View style={styles.dropdownContainer}>
              <Text style={styles.filterLabel}>Filter Statistics:</Text>
              <View style={styles.dropdownRow}>
                <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowYearPicker(true)}>
                  <Text style={styles.dropdownBtnText}>📅 Year: {selectedYear}</Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowMonthPicker(true)}>
                  <Text style={styles.dropdownBtnText}>📆 Month: {selectedMonthNum === 'ALL' ? 'All' : MONTH_NAMES[parseInt(selectedMonthNum, 10) - 1]}</Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.sectionHeaderTitle}>👤 Personal Metrics</Text>
            <View style={styles.statsCard}>
              <View style={styles.statItem}>
                <Text style={styles.statVal}>{totalTripsCount}</Text>
                <Text style={styles.statLbl}>My Trips</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statVal}>{totalDistanceCount} km</Text>
                <Text style={styles.statLbl}>My Distance</Text>
              </View>
            </View>

            {currentConfig.group && teamMembers.length > 0 ? (
              <View style={styles.groupDashboardSection}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={styles.sectionHeaderTitle}>👑 Group Admin Overview</Text>
                  <TouchableOpacity style={styles.inviteSmallBtn} onPress={() => setShowInviteModal(true)}>
                    <Text style={styles.inviteSmallBtnText}>+ Invite Member</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.statsCard, { backgroundColor: '#eef6ff' }]}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statVal, { color: '#28a745' }]}>{teamStats.totalTrips}</Text>
                    <Text style={styles.statLbl}>Team Total Trips</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statVal, { color: '#28a745' }]}>{teamStats.totalDistance} km</Text>
                    <Text style={styles.statLbl}>Team Distance</Text>
                  </View>
                </View>

                <Text style={styles.subSectionTitle}>Team Members Activity</Text>
                {teamMembers.map((member) => {
                  const stats = getMemberStats(member.name);
                  return (
                    <TouchableOpacity 
                      key={member.id} 
                      style={styles.teamMemberRow}
                      onPress={() => viewMemberTripDetails(member.name)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.memberName}>
                          {member.name} {member.role === 'admin' && '(You)'} <Text style={styles.memberRole}>({member.role})</Text>
                        </Text>
                        <Text style={styles.memberStats}>{stats.totalTrips} trips completed • {stats.totalDistance} km</Text>
                      </View>
                      <Text style={styles.memberViewBtn}>View Trips →</Text>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity 
                  style={styles.viewAllTripsBtn}
                  onPress={() => viewMemberTripDetails('ALL')}
                >
                  <Text style={styles.viewAllTripsBtnText}>📋 View All Team Trips ({getMemberTrips('ALL').length})</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.groupUpgradeBanner} onPress={() => setShowSubscriptionModal(true)}>
                <Text style={styles.groupUpgradeTitle}>👥 Upgrade to Group Plan</Text>
                <Text style={styles.groupUpgradeSub}>Manage team seats, centralize mileage tracking, and access group summaries.</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[styles.exportBtn, isExporting && { backgroundColor: '#6c757d' }]} 
              onPress={handleExportExcel}
              disabled={isExporting}
            >
              <Text style={styles.exportBtnText}>
                {isExporting ? '⏳ Generating...' : '📊 Export Summary Report (.xlsx)'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <ScrollView style={styles.content}>
            <Text style={styles.headerTitle}>Trip Logs</Text>
            {trips.length === 0 ? (
              <Text style={styles.emptyText}>No saved trips yet.</Text>
            ) : (
              trips.map((item) => (
                <View key={item.id} style={styles.historyCard}>
                  <View style={styles.historyCardHeader}>
                    <Text style={styles.historyDate}>{item.date} ({item.time})</Text>
                    <Text style={styles.historyDist}>{item.distance} km</Text>
                  </View>
                  <Text style={styles.historyCategoryTag}>{item.purposeCategory === 'Business' ? '💼' : '👤'} {item.purposeCategory}</Text>
                  <Text style={styles.historyPurposeTag}>🎯 Purpose: {item.purpose}</Text>
                  {item.placeName ? <Text style={styles.historyPlaceName}>🏢 Place: {item.placeName}</Text> : null}
                  <Text style={styles.historyText}>📍 From: {item.from}</Text>
                  <Text style={styles.historyText}>🏁 To: {item.to}</Text>
                  <Text style={[styles.historyText, { color: '#007AFF', fontWeight: 'bold', marginTop: 4 }]}>
                    👤 Driver: {item.userName}
                  </Text>
                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity style={styles.actionBtnEdit} onPress={() => openEditModal(item)}>
                      <Text style={styles.actionBtnEditText}>✏️ Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtnDel} onPress={() => handleDeleteTrip(item.id)}>
                      <Text style={styles.actionBtnDelText}>🗑️ Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <ScrollView style={styles.content}>
            <Text style={styles.headerTitle}>User Account</Text>
            
            <View style={styles.profileCard}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{driverName ? driverName.charAt(0).toUpperCase() : 'U'}</Text>
              </View>
              <Text style={styles.profileName}>{driverName}</Text>
              <Text style={styles.profileEmail}>{userEmail}</Text>
              <Text style={styles.profileVehicle}>{vehicleInfo ? `🚘 ${vehicleInfo}` : 'No vehicle specified'}</Text>
              
              <TouchableOpacity style={styles.editProfileBtn} onPress={openProfileEdit}>
                <Text style={styles.editProfileBtnText}>✏️ Edit Profile</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.settingBox}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Current Plan:</Text>
                <Text style={[styles.tierBadgeText, { color: '#007AFF' }]}>{subscriptionTier}</Text>
              </View>
              {subscriptionExpiry && subscriptionStatus === 'active' && (
                <Text style={{ color: '#666', marginTop: 6, fontSize: 12 }}>
                  Expires: {new Date(subscriptionExpiry).toLocaleDateString()}
                </Text>
              )}
              <Text style={{ color: '#666', marginTop: 6 }}>
                Limit: {monthlyUsageCount} / {currentLimit >= 9999 ? 'Unlimited' : `${currentLimit} trips/month`}
              </Text>
              <TouchableOpacity style={[styles.btn, styles.startBtn, { marginTop: 12 }]} onPress={() => setShowSubscriptionModal(true)}>
                <Text style={styles.btnText}>⚡ Manage Subscription</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.settingOptionRow} onPress={() => {
              setManagerCategory('Business');
              setNewPurposeInput('');
              setEditingPurposeIndex(null);
              setShowPurposeManager(true);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingOptionTitle}>🎯 Manage Purposes</Text>
                <Text style={styles.settingOptionSub}>Add, edit or delete purposes for Business & Personal categories</Text>
              </View>
              <Text style={styles.settingOptionArrow}>▶</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingOptionRow} onPress={() => {
              if (currentConfig.group) {
                setShowInviteModal(true);
              } else {
                Alert.alert("Group Feature", "Team invitations are only available on Group subscriptions.", [
                  { text: "Cancel", style: "cancel" },
                  { text: "View Plans", onPress: () => setShowSubscriptionModal(true) }
                ]);
              }
            }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingOptionTitle}>👥 Team Management & Invitations</Text>
                <Text style={styles.settingOptionSub}>{currentConfig.group ? `Manage ${teamMembers.length} seat(s) & invite members` : 'Upgrade to Group plan to invite members'}</Text>
              </View>
              <Text style={styles.settingOptionArrow}>▶</Text>
            </TouchableOpacity>

            {/* Referral Button */}
            <TouchableOpacity 
              style={[styles.btn, { backgroundColor: '#ff6f00', marginTop: 12 }]} 
              onPress={() => setShowReferralScreen(true)}
            >
              <Text style={styles.btnText}>🎁 Refer & Earn Free Months</Text>
            </TouchableOpacity>

            {/* Admin Panel Button */}
            {isAdmin && (
              <TouchableOpacity 
                style={[styles.btn, { backgroundColor: '#6f42c1', marginTop: 12 }]} 
                onPress={() => setShowAdminPanel(true)}
              >
                <Text style={styles.btnText}>🔐 Admin Panel</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.btn, styles.deleteBtn, { marginTop: 15 }]} onPress={handleLogout}>
              <Text style={styles.btnText}>🚪 Sign Out</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* PURPOSE SELECT TAB */}
        {activeTab === 'purpose_select' && (
          <ScrollView style={styles.content}>
            <View style={styles.screenHeader}>
              <TouchableOpacity onPress={() => setActiveTab('home')}>
                <Text style={styles.backLink}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Select Purpose</Text>
            </View>
            <View style={styles.segmentContainer}>
              <TouchableOpacity style={[styles.segmentTab, selectedCategory === 'Business' && styles.segmentTabActive]} onPress={() => setSelectedCategory('Business')}>
                <Text style={[styles.segmentText, selectedCategory === 'Business' && styles.segmentTextActive]}>💼 Business</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.segmentTab, selectedCategory === 'Personal' && styles.segmentTabActive]} onPress={() => setSelectedCategory('Personal')}>
                <Text style={[styles.segmentText, selectedCategory === 'Personal' && styles.segmentTextActive]}>👤 Personal</Text>
              </TouchableOpacity>
            </View>
            {(purposes[selectedCategory.toLowerCase()] || []).map((item, idx) => (
              <TouchableOpacity key={idx} style={styles.purposeCard} onPress={() => startTripWithPurpose(item)}>
                <Text style={styles.purposeCardText}>{item}</Text>
                <Text style={styles.purposeCardArrow}>▶ Start</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* TRACKING TAB */}
        {activeTab === 'tracking' && (
          <ScrollView style={styles.content}>
            <Text style={styles.header}>Trip Tracking</Text>
            {route.length > 0 && (
              <MapView style={styles.map} initialRegion={{ latitude: route[route.length - 1].latitude, longitude: route[route.length - 1].longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }}>
                <Polyline coordinates={route} strokeWidth={4} strokeColor="blue" />
                <Marker coordinate={route[0]} title="Start" />
                {route.length > 1 && <Marker coordinate={route[route.length - 1]} title="Current" />}
              </MapView>
            )}
            {tracking ? (
              <View style={styles.trackingControls}>
                <TouchableOpacity style={[styles.btn, styles.endBtn, { flex: 1, marginRight: 8 }]} onPress={endTrip}>
                  <Text style={styles.btnText}>🏁 End Trip</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.deleteBtn, { flex: 1, marginLeft: 8 }]} onPress={deleteActiveTrip}>
                  <Text style={styles.btnText}>🗑️ Discard</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {loadingSummary && (
              <View style={{ marginVertical: 20 }}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={{ textAlign: 'center', marginTop: 10 }}>Saving trip...</Text>
              </View>
            )}
            {activeTrip && !loadingSummary && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>✅ Trip Completed</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>📅 Date:</Text>
                  <Text style={styles.summaryValue}>{activeTrip.date}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>⏰ Time:</Text>
                  <Text style={styles.summaryValue}>{activeTrip.time}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>📂 Category:</Text>
                  <Text style={[styles.summaryValue, styles.categoryBadge]}>
                    {activeTrip.purposeCategory === 'Business' ? '💼' : '👤'} {activeTrip.purposeCategory}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>🎯 Purpose:</Text>
                  <Text style={styles.summaryValue}>{activeTrip.purpose}</Text>
                </View>
                {activeTrip.placeName ? (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>🏢 Place:</Text>
                    <Text style={styles.summaryValue}>{activeTrip.placeName}</Text>
                  </View>
                ) : null}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>📍 From:</Text>
                  <Text style={styles.summaryValue}>{activeTrip.from}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>🏁 To:</Text>
                  <Text style={styles.summaryValue}>{activeTrip.to}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>📏 Distance:</Text>
                  <Text style={[styles.summaryValue, styles.distanceHighlight]}>{activeTrip.distance} km</Text>
                </View>
                
                <View style={styles.summaryActions}>
                  <TouchableOpacity 
                    style={[styles.summaryActionBtn, styles.summaryEditBtn]} 
                    onPress={() => openEditModal(activeTrip)}
                  >
                    <Text style={styles.summaryActionBtnText}>✏️ Edit Trip</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.summaryActionBtn, styles.summaryDeleteBtn]} 
                    onPress={() => handleDeleteTrip(activeTrip.id)}
                  >
                    <Text style={styles.summaryActionBtnText}>🗑️ Delete Trip</Text>
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity style={[styles.btn, styles.startBtn, { marginTop: 12 }]} onPress={() => setActiveTab('home')}>
                  <Text style={styles.btnText}>Return to Home</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Bottom Tab Bar */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity style={styles.bottomTabItem} onPress={() => setActiveTab('home')}>
          <Text style={[styles.bottomTabIcon, activeTab === 'home' && styles.bottomTabIconActive]}>🏠</Text>
          <Text style={[styles.bottomTabText, activeTab === 'home' && styles.bottomTabTextActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomTabItem} onPress={() => setActiveTab('dashboard')}>
          <Text style={[styles.bottomTabIcon, activeTab === 'dashboard' && styles.bottomTabIconActive]}>📊</Text>
          <Text style={[styles.bottomTabText, activeTab === 'dashboard' && styles.bottomTabTextActive]}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomTabItem} onPress={() => setActiveTab('history')}>
          <Text style={[styles.bottomTabIcon, activeTab === 'history' && styles.bottomTabIconActive]}>📋</Text>
          <Text style={[styles.bottomTabText, activeTab === 'history' && styles.bottomTabTextActive]}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomTabItem} onPress={() => setActiveTab('profile')}>
          <Text style={[styles.bottomTabIcon, activeTab === 'profile' && styles.bottomTabIconActive]}>👤</Text>
          <Text style={[styles.bottomTabText, activeTab === 'profile' && styles.bottomTabTextActive]}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* ============================================================ */}
      {/* MODALS */}
      {/* ============================================================ */}

      {/* Admin Panel Modal */}
      {showAdminPanel && (
        <AdminPanel 
          user={user}
          onClose={() => setShowAdminPanel(false)}
        />
      )}

      {/* Referral Screen Modal */}
      {showReferralScreen && (
        <ReferralScreen 
          user={user}
          onClose={() => setShowReferralScreen(false)}
        />
      )}

      {/* Profile Edit Modal */}
      <Modal visible={showProfileEdit} animationType="slide" transparent onRequestClose={() => setShowProfileEdit(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <Text style={styles.inputLabel}>Full Name *</Text>
            <TextInput style={styles.textInput} value={editName} onChangeText={setEditName} placeholder="Your full name" />
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput style={styles.textInput} value={editEmail} onChangeText={setEditEmail} placeholder="your@email.com" keyboardType="email-address" />
            <Text style={styles.inputLabel}>Vehicle Model / Plate No.</Text>
            <TextInput style={styles.textInput} value={editVehicle} onChangeText={setEditVehicle} placeholder="e.g. Honda City (WXX 1234)" />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: '#6c757d', flex: 1, marginRight: 8 }]} onPress={() => setShowProfileEdit(false)}>
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: '#007AFF', flex: 1, marginLeft: 8 }]} onPress={saveProfileEdit}>
                <Text style={styles.btnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Invite Modal */}
      <Modal visible={showInviteModal} animationType="slide" transparent onRequestClose={() => setShowInviteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Invite Team Member</Text>
            <Text style={styles.inputLabel}>Member Email Address</Text>
            <TextInput style={styles.textInput} placeholder="e.g. colleague@company.com" keyboardType="email-address" value={inviteEmail} onChangeText={setInviteEmail} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: '#6c757d', flex: 1, marginRight: 8 }]} onPress={() => setShowInviteModal(false)}>
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: '#28a745', flex: 1, marginLeft: 8 }]} onPress={handleSendInvite}>
                <Text style={styles.btnText}>Send Invite</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Purpose Manager Modal */}
      <Modal visible={showPurposeManager} animationType="slide" transparent={false} onRequestClose={() => setShowPurposeManager(false)}>
        <View style={[styles.container, { paddingHorizontal: 20 }]}>
          <View style={styles.screenHeader}>
            <TouchableOpacity onPress={() => setShowPurposeManager(false)}><Text style={styles.backLink}>← Back</Text></TouchableOpacity>
            <Text style={styles.headerTitle}>Manage Purposes</Text>
            <TouchableOpacity style={styles.resetPurposesBtn} onPress={resetToDefaultPurposes}>
              <Text style={styles.resetPurposesBtnText}>Reset Defaults</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.segmentContainer}>
            <TouchableOpacity style={[styles.segmentTab, managerCategory === 'Business' && styles.segmentTabActive]} onPress={() => setManagerCategory('Business')}>
              <Text style={[styles.segmentText, managerCategory === 'Business' && styles.segmentTextActive]}>💼 Business</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.segmentTab, managerCategory === 'Personal' && styles.segmentTabActive]} onPress={() => setManagerCategory('Personal')}>
              <Text style={[styles.segmentText, managerCategory === 'Personal' && styles.segmentTextActive]}>👤 Personal</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.addPurposeContainer}>
            <TextInput style={[styles.textInput, { flex: 1, marginRight: 10 }]} placeholder="Add new purpose..." value={newPurposeInput} onChangeText={setNewPurposeInput} />
            <TouchableOpacity style={styles.addPurposeBtn} onPress={addPurpose}><Text style={styles.addPurposeBtnText}>+ Add</Text></TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1, marginTop: 10 }}>
            {(purposes[managerCategory.toLowerCase()] || []).map((purpose, index) => (
              <View key={index} style={styles.purposeItem}>
                {editingPurposeIndex === index ? (
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    <TextInput style={[styles.textInput, { flex: 1, marginRight: 10 }]} value={editingPurposeText} onChangeText={setEditingPurposeText} autoFocus />
                    <TouchableOpacity style={styles.saveEditBtn} onPress={saveEditingPurpose}><Text style={styles.saveEditBtnText}>Save</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.cancelEditBtn} onPress={() => { setEditingPurposeIndex(null); setEditingPurposeText(''); }}><Text style={styles.cancelEditBtnText}>Cancel</Text></TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <Text style={styles.purposeItemText}>{purpose}</Text>
                    <View style={styles.purposeItemActions}>
                      <TouchableOpacity style={styles.purposeActionBtn} onPress={() => startEditingPurpose(index, purpose)}><Text style={styles.purposeActionEdit}>✏️</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.purposeActionBtn} onPress={() => deletePurpose(index)}><Text style={styles.purposeActionDelete}>🗑️</Text></TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Member Trip Details Modal */}
      <Modal visible={showMemberTripDetails} animationType="slide" transparent={false} onRequestClose={() => setShowMemberTripDetails(false)}>
        <View style={[styles.container, { paddingHorizontal: 20 }]}>
          <View style={styles.screenHeader}>
            <TouchableOpacity onPress={() => setShowMemberTripDetails(false)}><Text style={styles.backLink}>← Back</Text></TouchableOpacity>
            <Text style={styles.headerTitle}>{selectedMemberName === 'ALL' ? 'All Team Trips' : `${selectedMemberName}'s Trips`}</Text>
            <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>{selectedMemberTrips.length} trips • {selectedMemberTrips.reduce((acc, t) => acc + t.distance, 0).toFixed(1)} km</Text>
          </View>
          <ScrollView style={{ flex: 1 }}>
            {selectedMemberTrips.map((item) => (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.historyCardHeader}>
                  <Text style={styles.historyDate}>{item.date} ({item.time})</Text>
                  <Text style={styles.historyDist}>{item.distance} km</Text>
                </View>
                <Text style={styles.historyCategoryTag}>{item.purposeCategory === 'Business' ? '💼' : '👤'} {item.purposeCategory}</Text>
                <Text style={styles.historyPurposeTag}>🎯 Purpose: {item.purpose}</Text>
                {item.placeName ? <Text style={styles.historyPlaceName}>🏢 Place: {item.placeName}</Text> : null}
                <Text style={styles.historyText}>📍 From: {item.from}</Text>
                <Text style={styles.historyText}>🏁 To: {item.to}</Text>
                <Text style={[styles.historyText, { color: '#007AFF', fontWeight: 'bold', marginTop: 4 }]}>👤 Driver: {item.userName}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Subscription Modal */}
      <Modal visible={showSubscriptionModal} animationType="slide" transparent={false} onRequestClose={() => setShowSubscriptionModal(false)}>
        <View style={[styles.container, { paddingHorizontal: 20 }]}>
          <View style={styles.screenHeader}>
            <TouchableOpacity onPress={() => setShowSubscriptionModal(false)}><Text style={styles.backLink}>← Close</Text></TouchableOpacity>
            <Text style={styles.headerTitle}>Plans & Pricing</Text>
          </View>
          <ScrollView style={{ flex: 1 }}>
            {Object.keys(TIER_CONFIG).map((tierKey) => {
              const cfg = TIER_CONFIG[tierKey];
              const isCurrent = subscriptionTier === tierKey;
              const paidTiers = ['Personal Basic', 'Personal Pro', 'Group Basic', 'Group Pro'];
              const isPaid = paidTiers.includes(tierKey);
              
              return (
                <View key={tierKey} style={[styles.planCard, isCurrent && styles.planCardActive]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.planTitle}>{tierKey}</Text>
                    <Text style={styles.planPrice}>{cfg.price}</Text>
                  </View>
                  <Text style={styles.planLimit}>{cfg.group ? `Per-Seat Billing • Max ${cfg.maxMembers} seats` : 'Personal Plan'}</Text>
                  <Text style={{ color: '#444', fontSize: 13, marginBottom: 4 }}>• Limit: {cfg.limit >= 9999 ? 'Unlimited' : `${cfg.limit} trips / mo`}</Text>
                  <Text style={{ color: '#444', fontSize: 13, marginBottom: 12 }}>• Excel Export: {cfg.excel ? '✅ Included' : '❌ Not Available'}</Text>
                  {isCurrent ? (
                    <Text style={styles.currentPlanLabel}>✓ Active Plan</Text>
                  ) : (
                    <TouchableOpacity 
                      style={[styles.planSelectBtn, isPaid && { backgroundColor: '#28a745' }]} 
                      onPress={() => handleUpgradeTier(tierKey)}
                    >
                      <Text style={styles.planSelectBtnText}>
                        {isPaid ? '🔒 Pay & Upgrade' : 'Switch Plan'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* Edit Trip Modal */}
      <Modal visible={editingTrip !== null} animationType="slide" transparent onRequestClose={() => setEditingTrip(null)}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>✏️ Edit Trip</Text>
            <Text style={styles.inputLabel}>📂 Category</Text>
            <View style={styles.editCategoryContainer}>
              <TouchableOpacity style={[styles.editCategoryBtn, editCategory === 'Business' && styles.editCategoryActive]} onPress={() => setEditCategory('Business')}>
                <Text style={[styles.editCategoryText, editCategory === 'Business' && styles.editCategoryTextActive]}>💼 Business</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.editCategoryBtn, editCategory === 'Personal' && styles.editCategoryActive]} onPress={() => setEditCategory('Personal')}>
                <Text style={[styles.editCategoryText, editCategory === 'Personal' && styles.editCategoryTextActive]}>👤 Personal</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>🎯 Purpose</Text>
            <TextInput style={styles.textInput} value={editPurpose} onChangeText={setEditPurpose} placeholder="Enter purpose" />
            <Text style={styles.inputLabel}>🏢 Place Name</Text>
            <TextInput style={styles.textInput} value={editPlaceName} onChangeText={setEditPlaceName} placeholder="e.g. Office, Client Site" />
            <Text style={styles.inputLabel}>📍 From</Text>
            <TextInput style={styles.textInput} value={editFrom} onChangeText={setEditFrom} placeholder="Starting location" />
            <Text style={styles.inputLabel}>🏁 To</Text>
            <TextInput style={styles.textInput} value={editTo} onChangeText={setEditTo} placeholder="Destination" />
            <Text style={styles.inputLabel}>📅 Date</Text>
            <TextInput style={styles.textInput} value={editDate} onChangeText={setEditDate} placeholder="e.g. 12/31/2024" />
            <Text style={styles.inputLabel}>⏰ Time</Text>
            <TextInput style={styles.textInput} value={editTime} onChangeText={setEditTime} placeholder="e.g. 09:00 AM - 10:30 AM" />
            <Text style={styles.inputLabel}>📏 Distance (km)</Text>
            <TextInput style={styles.textInput} keyboardType="numeric" value={editDistance} onChangeText={setEditDistance} placeholder="0.0" />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 }}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: '#6c757d', flex: 1, marginRight: 8 }]} onPress={() => setEditingTrip(null)}><Text style={styles.btnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: '#007AFF', flex: 1, marginLeft: 8 }]} onPress={handleSaveEdit}><Text style={styles.btnText}>💾 Save</Text></TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Year Picker Modal */}
      <Modal visible={showYearPicker} transparent animationType="fade" onRequestClose={() => setShowYearPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowYearPicker(false)}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.modalTitle}>Select Year</Text>
            <TouchableOpacity style={styles.pickerItem} onPress={() => { setSelectedYear('ALL'); setShowYearPicker(false); }}><Text style={styles.pickerItemText}>All Years</Text></TouchableOpacity>
            {availableYears.map(yr => <TouchableOpacity key={yr} style={styles.pickerItem} onPress={() => { setSelectedYear(yr); setShowYearPicker(false); }}><Text style={styles.pickerItemText}>{yr}</Text></TouchableOpacity>)}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Month Picker Modal */}
      <Modal visible={showMonthPicker} transparent animationType="fade" onRequestClose={() => setShowMonthPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMonthPicker(false)}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.modalTitle}>Select Month</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              <TouchableOpacity style={styles.pickerItem} onPress={() => { setSelectedMonthNum('ALL'); setShowMonthPicker(false); }}><Text style={styles.pickerItemText}>All Months</Text></TouchableOpacity>
              {MONTH_NAMES.map((m, idx) => <TouchableOpacity key={m} style={styles.pickerItem} onPress={() => { setSelectedMonthNum(String(idx + 1).padStart(2, '0')); setShowMonthPicker(false); }}><Text style={styles.pickerItemText}>{m}</Text></TouchableOpacity>)}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Payment Modal */}
      <PaymentModal
        visible={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setPendingTierUpgrade(null);
        }}
        tier={pendingTierUpgrade}
        userData={{
          userId: user?.id,
          teamId: teamId,
          email: userEmail,
          driverName: driverName
        }}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentError={handlePaymentError}
        onPaymentCancel={handlePaymentCancel}
      />
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8', paddingTop: 40 },
  content: { flex: 1, paddingHorizontal: 20, marginBottom: 10 },
  welcomeTitle: { fontSize: 28, fontWeight: 'bold', color: '#1a1a1a', marginTop: 30, textAlign: 'center' },
  welcomeSub: { fontSize: 15, color: '#666', marginTop: 8, marginBottom: 25, textAlign: 'center' },
  formGroup: { backgroundColor: '#fff', padding: 20, borderRadius: 12, elevation: 2 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 10 },
  textInput: { backgroundColor: '#f0f2f5', borderRadius: 8, padding: 12, fontSize: 16, color: '#333' },
  submitBtn: { backgroundColor: '#007AFF', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 25 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  switchAuthText: { marginTop: 15, color: '#007AFF', textAlign: 'center', fontSize: 14 },
  greeting: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  subGreeting: { fontSize: 13, color: '#666', marginBottom: 15 },
  tierBadge: { backgroundColor: '#e7f0ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#007AFF' },
  tierBadgeText: { color: '#007AFF', fontWeight: 'bold', fontSize: 11 },
  usageCard: { backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 15, elevation: 1 },
  usageTitle: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  usageCountText: { fontSize: 13, color: '#666', fontWeight: '600' },
  progressTrack: { height: 8, backgroundColor: '#e9ecef', borderRadius: 4, overflow: 'hidden', marginTop: 6 },
  progressBar: { height: '100%', backgroundColor: '#28a745' },
  usageWarningText: { fontSize: 12, color: '#dc3545', marginTop: 6, fontWeight: 'bold' },
  dropdownContainer: { marginBottom: 15 },
  filterLabel: { fontSize: 12, color: '#888', fontWeight: 'bold', marginBottom: 6 },
  dropdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dropdownBtn: { flex: 0.48, backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownBtnText: { fontSize: 13, color: '#333', fontWeight: '600' },
  dropdownArrow: { fontSize: 10, color: '#666', marginLeft: 4 },
  sectionHeaderTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginVertical: 8 },
  statsCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 18, justifyContent: 'space-between', alignItems: 'center', elevation: 2, marginBottom: 15 },
  statItem: { alignItems: 'center', flex: 1 },
  statVal: { fontSize: 20, fontWeight: 'bold', color: '#007AFF' },
  statLbl: { fontSize: 13, color: '#888', marginTop: 2 },
  statDivider: { width: 1, height: '80%', backgroundColor: '#eee' },
  groupDashboardSection: { marginTop: 10, marginBottom: 15 },
  inviteSmallBtn: { backgroundColor: '#28a745', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  inviteSmallBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  subSectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 8, marginTop: 5 },
  teamMemberRow: { backgroundColor: '#fff', padding: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, elevation: 1 },
  memberName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  memberRole: { fontSize: 12, color: '#666', fontWeight: 'normal' },
  memberStats: { fontSize: 12, color: '#777', marginTop: 2 },
  memberViewBtn: { fontSize: 13, color: '#007AFF', fontWeight: 'bold' },
  viewAllTripsBtn: { backgroundColor: '#007AFF', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  viewAllTripsBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  groupUpgradeBanner: { backgroundColor: '#fff3cd', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#ffeeba', marginBottom: 15 },
  groupUpgradeTitle: { fontSize: 15, fontWeight: 'bold', color: '#856404' },
  groupUpgradeSub: { fontSize: 12, color: '#856404', marginTop: 4 },
  exportBtn: { backgroundColor: '#007AFF', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  exportBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  startTripBtn: { backgroundColor: '#28a745', padding: 18, borderRadius: 12, alignItems: 'center', elevation: 3, marginVertical: 15 },
  startTripBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  bottomTabBar: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingVertical: 8, justifyContent: 'space-around', elevation: 8 },
  bottomTabItem: { alignItems: 'center', flex: 1 },
  bottomTabIcon: { fontSize: 20, color: '#888' },
  bottomTabIconActive: { color: '#007AFF' },
  bottomTabText: { fontSize: 11, color: '#888', marginTop: 2 },
  bottomTabTextActive: { color: '#007AFF', fontWeight: 'bold' },
  profileCard: { backgroundColor: '#fff', padding: 20, borderRadius: 12, alignItems: 'center', marginBottom: 15, elevation: 1 },
  avatarCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  profileName: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },
  profileEmail: { fontSize: 14, color: '#666', marginTop: 2 },
  profileVehicle: { fontSize: 13, color: '#888', marginTop: 4 },
  editProfileBtn: { backgroundColor: '#007AFF', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, marginTop: 12 },
  editProfileBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  segmentContainer: { flexDirection: 'row', backgroundColor: '#e9ecef', borderRadius: 8, padding: 4, marginBottom: 15 },
  segmentTab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 6 },
  segmentTabActive: { backgroundColor: '#007AFF' },
  segmentText: { fontSize: 15, fontWeight: '600', color: '#555' },
  segmentTextActive: { color: '#fff' },
  purposeCard: { backgroundColor: '#fff', padding: 16, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, elevation: 1 },
  purposeCardText: { fontSize: 16, fontWeight: '600', color: '#333' },
  purposeCardArrow: { fontSize: 14, color: '#007AFF', fontWeight: 'bold' },
  settingOptionRow: { backgroundColor: '#fff', padding: 18, borderRadius: 10, marginTop: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 1 },
  settingOptionTitle: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  settingOptionSub: { fontSize: 12, color: '#777', marginTop: 3 },
  settingOptionArrow: { fontSize: 14, color: '#888' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  screenHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backLink: { fontSize: 16, color: '#007AFF', marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  map: { height: 250, width: '100%', borderRadius: 10, marginBottom: 15 },
  btn: { padding: 15, borderRadius: 8, alignItems: 'center' },
  startBtn: { backgroundColor: '#28a745' },
  endBtn: { backgroundColor: '#28a745' },
  deleteBtn: { backgroundColor: '#dc3545' },
  trackingControls: { flexDirection: 'row', justifyContent: 'space-between' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  summaryCard: { backgroundColor: '#fff', padding: 18, borderRadius: 12, elevation: 3, marginBottom: 20, borderWidth: 1, borderColor: '#e0e0e0' },
  summaryTitle: { fontSize: 20, fontWeight: 'bold', color: '#28a745', marginBottom: 15, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: '#e0e0e0', paddingBottom: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  summaryLabel: { fontSize: 14, fontWeight: '600', color: '#555', flex: 0.35 },
  summaryValue: { fontSize: 14, color: '#333', flex: 0.65, textAlign: 'right' },
  categoryBadge: { fontWeight: 'bold', color: '#007AFF' },
  distanceHighlight: { fontWeight: 'bold', color: '#28a745', fontSize: 16 },
  summaryActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  summaryActionBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
  summaryEditBtn: { backgroundColor: '#007AFF' },
  summaryDeleteBtn: { backgroundColor: '#dc3545' },
  summaryActionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  historyCard: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 12, elevation: 1 },
  historyCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  historyDate: { fontWeight: 'bold', color: '#333' },
  historyDist: { fontWeight: 'bold', color: '#007AFF' },
  historyCategoryTag: { fontSize: 13, fontWeight: 'bold', color: '#007AFF', marginTop: 2 },
  historyPurposeTag: { fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 4 },
  historyPlaceName: { fontSize: 14, fontWeight: 'bold', color: '#28a745', marginVertical: 2 },
  historyText: { fontSize: 13, color: '#555', marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 40 },
  cardActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 8 },
  actionBtnEdit: { marginRight: 15 },
  actionBtnEditText: { color: '#007AFF', fontWeight: '600', fontSize: 13 },
  actionBtnDelText: { color: '#dc3545', fontWeight: '600', fontSize: 13 },
  settingBox: { backgroundColor: '#fff', padding: 15, borderRadius: 10 },
  planCard: { backgroundColor: '#fff', padding: 18, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#eee', elevation: 1 },
  planCardActive: { borderColor: '#007AFF', borderWidth: 2, backgroundColor: '#f0f7ff' },
  planTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' },
  planPrice: { fontSize: 15, fontWeight: 'bold', color: '#007AFF' },
  planLimit: { fontSize: 13, color: '#666', marginBottom: 8, fontWeight: '500' },
  planSelectBtn: { backgroundColor: '#007AFF', paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  planSelectBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  currentPlanLabel: { color: '#28a745', fontWeight: 'bold', fontSize: 14, textAlign: 'center', marginTop: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20, elevation: 5, maxHeight: '80%' },
  pickerModalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginHorizontal: 20, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  pickerItem: { paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  pickerItemText: { fontSize: 16, color: '#333', textAlign: 'center' },
  resetPurposesBtn: { backgroundColor: '#dc3545', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
  resetPurposesBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  addPurposeContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  addPurposeBtn: { backgroundColor: '#28a745', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, justifyContent: 'center' },
  addPurposeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  purposeItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8, elevation: 1 },
  purposeItemText: { fontSize: 15, color: '#333', flex: 1 },
  purposeItemActions: { flexDirection: 'row' },
  purposeActionBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  purposeActionEdit: { fontSize: 18 },
  purposeActionDelete: { fontSize: 18 },
  saveEditBtn: { backgroundColor: '#28a745', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, marginRight: 6 },
  saveEditBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  cancelEditBtn: { backgroundColor: '#6c757d', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4 },
  cancelEditBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  editCategoryContainer: { flexDirection: 'row', backgroundColor: '#e9ecef', borderRadius: 8, padding: 4, marginBottom: 10 },
  editCategoryBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  editCategoryActive: { backgroundColor: '#007AFF' },
  editCategoryText: { fontSize: 14, fontWeight: '600', color: '#555' },
  editCategoryTextActive: { color: '#fff' }
});

