import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal, RefreshControl
} from 'react-native';
import { supabase } from '../supabaseClient';

const AdminPanel = ({ user, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTrips: 0,
    totalTeams: 0,
    activeSubscriptions: 0,
    personalFree: 0,
    personalBasic: 0,
    personalPro: 0,
    groupBasic: 0,
    groupPro: 0,
    tripsByMonth: [],
    databaseSize: '0 MB'
  });
  const [users, setUsers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserTeam, setSelectedUserTeam] = useState(null);
  const [showUserEdit, setShowUserEdit] = useState(false);
  const [editUserData, setEditUserData] = useState({
    full_name: '',
    email: '',
    role: '',
    subscription_tier: '',
    subscription_end_date: '',
    payment_status: ''
  });
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showTripEdit, setShowTripEdit] = useState(false);
  const [editTripData, setEditTripData] = useState({
    purpose: '',
    purpose_category: '',
    from_address: '',
    to_address: '',
    distance_km: '',
    trip_date: ''
  });
  
  // Trip filter state
  const [tripFilter, setTripFilter] = useState('ALL');
  const [filteredTrips, setFilteredTrips] = useState([]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*');
      
      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Get trips separately (no join to avoid column issues)
      const { data: tripsData, error: tripsError } = await supabase
        .from('trip_logs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (tripsError) throw tripsError;
      
      // Enrich trips with user info by looking up users
      const enrichedTrips = await Promise.all((tripsData || []).map(async (trip) => {
        let tier = 'Unknown';
        let userName = 'Unknown';
        let userEmail = 'Unknown';
        
        // Get user info
        if (trip.user_id) {
          const { data: userData } = await supabase
            .from('profiles')
            .select('full_name, email, team_id')
            .eq('id', trip.user_id)
            .single();
          
          if (userData) {
            userName = userData.full_name || 'Unknown';
            userEmail = userData.email || 'Unknown';
            
            // Get team tier
            if (userData.team_id) {
              const { data: teamData } = await supabase
                .from('teams')
                .select('subscription_tier')
                .eq('id', userData.team_id)
                .single();
              
              if (teamData) {
                const tierMap = {
                  'personal_free': 'Personal Free',
                  'personal_basic': 'Personal Basic',
                  'personal_pro': 'Personal Pro',
                  'team_basic': 'Group Basic',
                  'team_pro': 'Group Pro'
                };
                tier = tierMap[teamData.subscription_tier] || 'Unknown';
              }
            }
          }
        }
        
        return {
          ...trip,
          user_tier: tier,
          user_name: userName,
          user_email: userEmail
        };
      }));
      
      setTrips(enrichedTrips);
      setFilteredTrips(enrichedTrips);

      // Get teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*');
      
      if (teamsError) throw teamsError;
      setTeams(teamsData || []);

      // Calculate subscription tier counts
      let personalFree = 0, personalBasic = 0, personalPro = 0, groupBasic = 0, groupPro = 0;
      
      (teamsData || []).forEach(team => {
        const tier = team.subscription_tier;
        const status = team.payment_status;
        if (status === 'active' || status === 'free' || !status) {
          switch(tier) {
            case 'personal_free': personalFree++; break;
            case 'personal_basic': personalBasic++; break;
            case 'personal_pro': personalPro++; break;
            case 'team_basic': groupBasic++; break;
            case 'team_pro': groupPro++; break;
            default: personalFree++; break;
          }
        }
      });

      // Calculate trips by month
      const tripsByMonth = {};
      (tripsData || []).forEach(trip => {
        const date = new Date(trip.trip_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        if (!tripsByMonth[monthKey]) {
          tripsByMonth[monthKey] = { month: monthName, count: 0 };
        }
        tripsByMonth[monthKey].count++;
      });

      const sortedMonths = Object.keys(tripsByMonth).sort();
      const tripsByMonthArray = sortedMonths.map(key => tripsByMonth[key]);

      const activeSubs = (teamsData || []).filter(t => t.payment_status === 'active').length;

      setStats({
        totalUsers: usersData?.length || 0,
        totalTrips: tripsData?.length || 0,
        totalTeams: teamsData?.length || 0,
        activeSubscriptions: activeSubs,
        personalFree: personalFree,
        personalBasic: personalBasic,
        personalPro: personalPro,
        groupBasic: groupBasic,
        groupPro: groupPro,
        tripsByMonth: tripsByMonthArray.slice(-12),
        databaseSize: 'Calculating...'
      });

    } catch (error) {
      console.error('Error loading admin data:', error);
      Alert.alert('Error', 'Failed to load admin data: ' + (error.message || ''));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyTripFilter = (filter) => {
    setTripFilter(filter);
    if (filter === 'ALL') {
      setFilteredTrips(trips);
    } else {
      const filtered = trips.filter(trip => trip.user_tier === filter);
      setFilteredTrips(filtered);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  useEffect(() => {
    loadData();
  }, []);

  const getUserTeam = (userId) => {
    const user = users.find(u => u.id === userId);
    if (!user || !user.team_id) return null;
    return teams.find(t => t.id === user.team_id);
  };

  const handleDeleteUser = async (userId) => {
    Alert.alert(
      'Delete User',
      'Are you sure you want to delete this user? This will also delete all their trips and team data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete user's trips first
              await supabase
                .from('trip_logs')
                .delete()
                .eq('user_id', userId);
              
              // Delete user
              const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', userId);
              
              if (error) throw error;
              Alert.alert('Success', 'User deleted successfully');
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete user');
            }
          }
        }
      ]
    );
  };

  const handleDeleteTrip = async (tripId) => {
    Alert.alert(
      'Delete Trip',
      'Are you sure you want to delete this trip?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('trip_logs')
                .delete()
                .eq('id', tripId);
              
              if (error) throw error;
              Alert.alert('Success', 'Trip deleted successfully');
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete trip');
            }
          }
        }
      ]
    );
  };

  const handleUpdateUser = async () => {
    try {
      // Update user profile - only allow valid roles
      const validRoles = ['admin', 'member'];
      const roleToSave = validRoles.includes(editUserData.role) ? editUserData.role : 'member';
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: editUserData.full_name,
          email: editUserData.email,
          role: roleToSave
        })
        .eq('id', selectedUser.id);
      
      if (profileError) throw profileError;

      // Update user's team subscription
      const team = getUserTeam(selectedUser.id);
      if (team) {
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

        const updateData = {
          subscription_tier: tierMap[editUserData.subscription_tier] || 'personal_free',
          monthly_trip_limit: limitMap[editUserData.subscription_tier] || 30,
          max_members: maxMembersMap[editUserData.subscription_tier] || 1,
          payment_status: editUserData.payment_status || 'free'
        };

        // Handle subscription end date
        if (editUserData.subscription_end_date && editUserData.subscription_end_date.trim() !== '') {
          // Format date to ISO string
          try {
            const dateObj = new Date(editUserData.subscription_end_date);
            if (!isNaN(dateObj.getTime())) {
              updateData.subscription_end_date = dateObj.toISOString();
            } else {
              // Try parsing as YYYY-MM-DD
              const parts = editUserData.subscription_end_date.split('-');
              if (parts.length === 3) {
                const year = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1;
                const day = parseInt(parts[2]);
                const dateObj2 = new Date(year, month, day);
                if (!isNaN(dateObj2.getTime())) {
                  updateData.subscription_end_date = dateObj2.toISOString();
                }
              }
            }
          } catch (e) {
            console.log('Date parsing error:', e);
          }
        }

        console.log('Updating team with:', updateData);

        const { error: teamError } = await supabase
          .from('teams')
          .update(updateData)
          .eq('id', team.id);
        
        if (teamError) throw teamError;
      }

      Alert.alert('Success', 'User updated successfully');
      setShowUserEdit(false);
      loadData();
    } catch (error) {
      console.error('Update error:', error);
      Alert.alert('Error', 'Failed to update user: ' + (error.message || ''));
    }
  };

  const handleUpdateTrip = async () => {
    try {
      const { error } = await supabase
        .from('trip_logs')
        .update({
          purpose: editTripData.purpose,
          purpose_category: editTripData.purpose_category,
          from_address: editTripData.from_address,
          to_address: editTripData.to_address,
          distance_km: parseFloat(editTripData.distance_km) || 0,
          trip_date: editTripData.trip_date
        })
        .eq('id', selectedTrip.id);
      
      if (error) throw error;
      Alert.alert('Success', 'Trip updated successfully');
      setShowTripEdit(false);
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update trip');
    }
  };

  const openUserEdit = (user) => {
    const team = getUserTeam(user.id);
    const tierMap = {
      'personal_free': 'Personal Free',
      'personal_basic': 'Personal Basic',
      'personal_pro': 'Personal Pro',
      'team_basic': 'Group Basic',
      'team_pro': 'Group Pro'
    };
    
    // Format date for display
    let formattedDate = '';
    if (team?.subscription_end_date) {
      try {
        const dateObj = new Date(team.subscription_end_date);
        if (!isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toISOString().split('T')[0];
        }
      } catch (e) {
        formattedDate = team.subscription_end_date;
      }
    }
    
    setSelectedUser(user);
    setSelectedUserTeam(team);
    setEditUserData({
      full_name: user.full_name || '',
      email: user.email || '',
      role: user.role || 'member',
      subscription_tier: team ? tierMap[team.subscription_tier] || 'Personal Free' : 'Personal Free',
      subscription_end_date: formattedDate,
      payment_status: team?.payment_status || 'free'
    });
    setShowUserEdit(true);
  };

  const renderDashboard = () => (
    <View style={styles.dashboardGrid}>
      {/* Quick Stats */}
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>{stats.totalUsers}</Text>
        <Text style={styles.statLabel}>Total Users</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: '#e3f2fd' }]}>
        <Text style={styles.statNumber}>{stats.totalTrips}</Text>
        <Text style={styles.statLabel}>Total Trips</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: '#e8f5e9' }]}>
        <Text style={styles.statNumber}>{stats.totalTeams}</Text>
        <Text style={styles.statLabel}>Total Teams</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: '#f3e5f5' }]}>
        <Text style={styles.statNumber}>{stats.activeSubscriptions}</Text>
        <Text style={styles.statLabel}>Active Subscriptions</Text>
      </View>

      {/* Subscription Tier Breakdown */}
      <View style={styles.fullWidthCard}>
        <Text style={styles.cardTitle}>📊 Subscription Tiers</Text>
        <View style={styles.tierGrid}>
          <View style={styles.tierItem}>
            <Text style={styles.tierCount}>{stats.personalFree}</Text>
            <Text style={styles.tierLabel}>Personal Free</Text>
          </View>
          <View style={[styles.tierItem, { backgroundColor: '#e3f2fd' }]}>
            <Text style={[styles.tierCount, { color: '#1976d2' }]}>{stats.personalBasic}</Text>
            <Text style={styles.tierLabel}>Personal Basic</Text>
          </View>
          <View style={[styles.tierItem, { backgroundColor: '#e8f5e9' }]}>
            <Text style={[styles.tierCount, { color: '#2e7d32' }]}>{stats.personalPro}</Text>
            <Text style={styles.tierLabel}>Personal Pro</Text>
          </View>
          <View style={[styles.tierItem, { backgroundColor: '#fff3e0' }]}>
            <Text style={[styles.tierCount, { color: '#e65100' }]}>{stats.groupBasic}</Text>
            <Text style={styles.tierLabel}>Group Basic</Text>
          </View>
          <View style={[styles.tierItem, { backgroundColor: '#f3e5f5' }]}>
            <Text style={[styles.tierCount, { color: '#6a1b9a' }]}>{stats.groupPro}</Text>
            <Text style={styles.tierLabel}>Group Pro</Text>
          </View>
        </View>
      </View>

      {/* Monthly Trip Summary */}
      <View style={styles.fullWidthCard}>
        <Text style={styles.cardTitle}>📈 Monthly Trip Summary</Text>
        {stats.tripsByMonth.length === 0 ? (
          <Text style={styles.emptyText}>No trips recorded yet</Text>
        ) : (
          stats.tripsByMonth.map((item, index) => (
            <View key={index} style={styles.monthRow}>
              <Text style={styles.monthLabel}>{item.month}</Text>
              <View style={styles.monthBarContainer}>
                <View 
                  style={[
                    styles.monthBar, 
                    { width: `${Math.min((item.count / Math.max(...stats.tripsByMonth.map(m => m.count), 1)) * 100, 100)}%` }
                  ]} 
                />
              </View>
              <Text style={styles.monthCount}>{item.count}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );

  const renderUsers = () => (
    <View style={styles.listContainer}>
      {users.map((user) => {
        const team = getUserTeam(user.id);
        const tierMap = {
          'personal_free': 'Free',
          'personal_basic': 'Basic',
          'personal_pro': 'Pro',
          'team_basic': 'Group Basic',
          'team_pro': 'Group Pro'
        };
        const tier = team ? tierMap[team.subscription_tier] || 'Free' : 'Free';
        const status = team?.payment_status || 'free';
        
        // Format expiry date
        let expiryDisplay = 'Never';
        if (team?.subscription_end_date) {
          try {
            const dateObj = new Date(team.subscription_end_date);
            if (!isNaN(dateObj.getTime())) {
              expiryDisplay = dateObj.toLocaleDateString();
            }
          } catch (e) {
            expiryDisplay = 'Invalid date';
          }
        }
        
        return (
          <View key={user.id} style={styles.listItem}>
            <View style={styles.listItemContent}>
              <Text style={styles.listItemTitle}>{user.full_name || 'Unnamed'}</Text>
              <Text style={styles.listItemSub}>{user.email}</Text>
              <View style={styles.listItemRow}>
                <Text style={[styles.listItemBadge, user.role === 'admin' && styles.badgeAdmin]}>
                  {user.role || 'member'}
                </Text>
                <Text style={[styles.listItemBadge, 
                  status === 'active' ? styles.badgeActive : 
                  status === 'expired' ? styles.badgeExpired : styles.badgeInactive
                ]}>
                  {status === 'active' ? 'ACTIVE' : 
                   status === 'expired' ? 'EXPIRED' : 'INACTIVE'}
                </Text>
                <Text style={styles.listItemBadge}>{tier}</Text>
              </View>
              <Text style={styles.listItemSub}>
                Expires: {expiryDisplay}
              </Text>
            </View>
            <View style={styles.listItemActions}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.editBtn]}
                onPress={() => openUserEdit(user)}
              >
                <Text style={styles.actionBtnText}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.deleteBtn]}
                onPress={() => handleDeleteUser(user.id)}
              >
                <Text style={styles.actionBtnText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );

  const renderTrips = () => {
    const filterOptions = ['ALL', 'Personal Free', 'Personal Basic', 'Personal Pro', 'Group Basic', 'Group Pro'];
    
    return (
      <View style={styles.listContainer}>
        {/* Filter Bar */}
        <View style={styles.filterBar}>
          <Text style={styles.filterLabel}>Filter by Tier:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {filterOptions.map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[styles.filterBtn, tripFilter === filter && styles.filterBtnActive]}
                onPress={() => applyTripFilter(filter)}
              >
                <Text style={[styles.filterBtnText, tripFilter === filter && styles.filterBtnTextActive]}>
                  {filter === 'ALL' ? 'All' : filter}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Trip Count */}
        <Text style={styles.tripCountText}>
          Showing {filteredTrips.length} trip{filteredTrips.length !== 1 ? 's' : ''}
        </Text>

        {/* Trip List */}
        {filteredTrips.slice(0, 50).map((trip) => (
          <View key={trip.id} style={styles.listItem}>
            <View style={styles.listItemContent}>
              <Text style={styles.listItemTitle}>
                {trip.purpose || 'No purpose'} - {trip.distance_km || 0} km
              </Text>
              <View style={styles.listItemRow}>
                <Text style={styles.listItemSub}>📅 {trip.trip_date}</Text>
                <Text style={[styles.listItemBadge, 
                  trip.purpose_category === 'Business' ? styles.badgeBusiness : styles.badgePersonal
                ]}>
                  {trip.purpose_category || 'Uncategorized'}
                </Text>
              </View>
              <Text style={styles.listItemSub}>📍 {trip.from_address} → {trip.to_address}</Text>
              <View style={styles.listItemRow}>
                <Text style={styles.listItemSub}>👤 {trip.user_name}</Text>
                <Text style={[styles.listItemBadge, styles.badgeTier]}>
                  {trip.user_tier}
                </Text>
              </View>
            </View>
            <View style={styles.listItemActions}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.editBtn]}
                onPress={() => {
                  setSelectedTrip(trip);
                  setEditTripData({
                    purpose: trip.purpose || '',
                    purpose_category: trip.purpose_category || 'Business',
                    from_address: trip.from_address || '',
                    to_address: trip.to_address || '',
                    distance_km: trip.distance_km?.toString() || '',
                    trip_date: trip.trip_date || new Date().toISOString().split('T')[0]
                  });
                  setShowTripEdit(true);
                }}
              >
                <Text style={styles.actionBtnText}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.deleteBtn]}
                onPress={() => handleDeleteTrip(trip.id)}
              >
                <Text style={styles.actionBtnText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <Modal visible={true} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🔐 Admin Panel</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={[styles.tab, selectedTab === 'dashboard' && styles.tabActive]}
            onPress={() => setSelectedTab('dashboard')}
          >
            <Text style={[styles.tabText, selectedTab === 'dashboard' && styles.tabTextActive]}>📊 Stats</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, selectedTab === 'users' && styles.tabActive]}
            onPress={() => setSelectedTab('users')}
          >
            <Text style={[styles.tabText, selectedTab === 'users' && styles.tabTextActive]}>👥 Users</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, selectedTab === 'trips' && styles.tabActive]}
            onPress={() => setSelectedTab('trips')}
          >
            <Text style={[styles.tabText, selectedTab === 'trips' && styles.tabTextActive]}>📋 Trips</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading admin data...</Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.content}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {selectedTab === 'dashboard' && renderDashboard()}
            {selectedTab === 'users' && renderUsers()}
            {selectedTab === 'trips' && renderTrips()}
          </ScrollView>
        )}

        {/* User Edit Modal */}
        <Modal visible={showUserEdit} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>✏️ Edit User</Text>
              
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput 
                style={styles.textInput} 
                value={editUserData.full_name} 
                onChangeText={(text) => setEditUserData({...editUserData, full_name: text})}
              />
              
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput 
                style={styles.textInput} 
                value={editUserData.email} 
                onChangeText={(text) => setEditUserData({...editUserData, email: text})}
                keyboardType="email-address"
              />
              
              <Text style={styles.inputLabel}>Role</Text>
              <View style={styles.roleContainer}>
                {['member', 'admin'].map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[styles.roleBtn, editUserData.role === role && styles.roleBtnActive]}
                    onPress={() => setEditUserData({...editUserData, role})}
                  >
                    <Text style={[styles.roleBtnText, editUserData.role === role && styles.roleBtnTextActive]}>
                      {role.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { marginTop: 16 }]}>Subscription Plan</Text>
              <View style={styles.roleContainer}>
                {['Personal Free', 'Personal Basic', 'Personal Pro', 'Group Basic', 'Group Pro'].map((tier) => (
                  <TouchableOpacity
                    key={tier}
                    style={[styles.roleBtn, editUserData.subscription_tier === tier && styles.roleBtnActive]}
                    onPress={() => setEditUserData({...editUserData, subscription_tier: tier})}
                  >
                    <Text style={[styles.roleBtnText, editUserData.subscription_tier === tier && styles.roleBtnTextActive]}>
                      {tier.replace(' ', '\n')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { marginTop: 16 }]}>Subscription End Date</Text>
              <TextInput 
                style={styles.textInput} 
                value={editUserData.subscription_end_date} 
                onChangeText={(text) => setEditUserData({...editUserData, subscription_end_date: text})}
                placeholder="YYYY-MM-DD"
              />

              <Text style={[styles.inputLabel, { marginTop: 16, color: '#dc3545', fontWeight: 'bold' }]}>💰 Payment Status</Text>
              <View style={styles.roleContainer}>
                {['free', 'active', 'expired'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.roleBtn, editUserData.payment_status === status && styles.roleBtnActive]}
                    onPress={() => setEditUserData({...editUserData, payment_status: status})}
                  >
                    <Text style={[
                      styles.roleBtnText, 
                      editUserData.payment_status === status && styles.roleBtnTextActive,
                      status === 'active' && { color: '#28a745' },
                      status === 'expired' && { color: '#dc3545' }
                    ]}>
                      {status.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setShowUserEdit(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleUpdateUser}>
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* Trip Edit Modal */}
        <Modal visible={showTripEdit} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>✏️ Edit Trip</Text>
              
              <Text style={styles.inputLabel}>Purpose</Text>
              <TextInput style={styles.textInput} value={editTripData.purpose} onChangeText={(text) => setEditTripData({...editTripData, purpose: text})} />
              
              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.roleContainer}>
                {['Business', 'Personal'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.roleBtn, editTripData.purpose_category === cat && styles.roleBtnActive]}
                    onPress={() => setEditTripData({...editTripData, purpose_category: cat})}
                  >
                    <Text style={[styles.roleBtnText, editTripData.purpose_category === cat && styles.roleBtnTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={styles.inputLabel}>From</Text>
              <TextInput style={styles.textInput} value={editTripData.from_address} onChangeText={(text) => setEditTripData({...editTripData, from_address: text})} />
              
              <Text style={styles.inputLabel}>To</Text>
              <TextInput style={styles.textInput} value={editTripData.to_address} onChangeText={(text) => setEditTripData({...editTripData, to_address: text})} />
              
              <Text style={styles.inputLabel}>Distance (km)</Text>
              <TextInput style={styles.textInput} keyboardType="numeric" value={editTripData.distance_km} onChangeText={(text) => setEditTripData({...editTripData, distance_km: text})} />
              
              <Text style={styles.inputLabel}>Date</Text>
              <TextInput style={styles.textInput} value={editTripData.trip_date} onChangeText={(text) => setEditTripData({...editTripData, trip_date: text})} placeholder="YYYY-MM-DD" />
              
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setShowTripEdit(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleUpdateTrip}>
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  tab: { paddingVertical: 12, paddingHorizontal: 20, marginRight: 8 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#007AFF' },
  tabText: { fontSize: 14, color: '#666' },
  tabTextActive: { color: '#007AFF', fontWeight: 'bold' },
  content: { flex: 1, padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  dashboardGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: { width: '48%', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2, alignItems: 'center' },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: '#007AFF' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4, textAlign: 'center' },
  fullWidthCard: { width: '100%', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  tierGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tierItem: { width: '48%', padding: 12, borderRadius: 8, backgroundColor: '#f5f5f5', alignItems: 'center', marginBottom: 8 },
  tierCount: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  tierLabel: { fontSize: 11, color: '#666', marginTop: 2, textAlign: 'center' },
  monthRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  monthLabel: { width: 80, fontSize: 12, color: '#333', fontWeight: '500' },
  monthBarContainer: { flex: 1, height: 20, backgroundColor: '#f0f0f0', borderRadius: 10, marginHorizontal: 10, overflow: 'hidden' },
  monthBar: { height: '100%', backgroundColor: '#007AFF', borderRadius: 10 },
  monthCount: { width: 30, fontSize: 12, color: '#666', textAlign: 'right' },
  emptyText: { textAlign: 'center', color: '#999', padding: 20 },
  listContainer: { marginTop: 8 },
  listItem: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, elevation: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listItemContent: { flex: 1 },
  listItemTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  listItemSub: { fontSize: 12, color: '#666', marginTop: 2 },
  listItemRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap' },
  listItemBadge: { fontSize: 10, fontWeight: 'bold', color: '#fff', backgroundColor: '#6c757d', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginRight: 4, marginBottom: 2 },
  badgeAdmin: { backgroundColor: '#dc3545' },
  badgeActive: { backgroundColor: '#28a745' },
  badgeExpired: { backgroundColor: '#dc3545' },
  badgeInactive: { backgroundColor: '#6c757d' },
  badgeBusiness: { backgroundColor: '#007AFF' },
  badgePersonal: { backgroundColor: '#28a745' },
  badgeTier: { backgroundColor: '#6f42c1' },
  listItemActions: { flexDirection: 'row' },
  actionBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginLeft: 6 },
  editBtn: { backgroundColor: '#e3f2fd' },
  deleteBtn: { backgroundColor: '#fce4ec' },
  actionBtnText: { fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 4, marginTop: 12 },
  textInput: { backgroundColor: '#f0f2f5', borderRadius: 8, padding: 12, fontSize: 16, color: '#333' },
  roleContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginVertical: 8 },
  roleBtn: { flex: 1, minWidth: '30%', paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center', backgroundColor: '#f0f2f5', borderRadius: 6, marginHorizontal: 3, marginBottom: 4 },
  roleBtnActive: { backgroundColor: '#007AFF' },
  roleBtnText: { fontSize: 10, fontWeight: '600', color: '#666', textAlign: 'center' },
  roleBtnTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 6 },
  cancelBtn: { backgroundColor: '#f0f2f5' },
  saveBtn: { backgroundColor: '#007AFF' },
  cancelBtnText: { color: '#666', fontWeight: 'bold' },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
  filterBar: { backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 12, elevation: 1 },
  filterLabel: { fontSize: 12, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  filterScroll: { flexDirection: 'row' },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, backgroundColor: '#f0f2f5', marginRight: 8 },
  filterBtnActive: { backgroundColor: '#007AFF' },
  filterBtnText: { fontSize: 12, color: '#666' },
  filterBtnTextActive: { color: '#fff' },
  tripCountText: { fontSize: 12, color: '#666', marginBottom: 8 }
});

export default AdminPanel;
