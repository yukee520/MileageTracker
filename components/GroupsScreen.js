import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { createClient } from '@supabase/supabase-js';
import GroupService from '../services/GroupService';
import CreateGroupScreen from './CreateGroupScreen';
import GroupSearchScreen from './GroupSearchScreen';
import AdminGroupPanel from './AdminGroupPanel';

const SUPABASE_URL = 'https://dkpjicqepexhgbrzzreo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7CXIRyhWhmsQfRfj9dDhWw_Z2efV6fx';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const GroupsScreen = ({ user, onRefresh }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [groupInfo, setGroupInfo] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isGroupAdmin, setIsGroupAdmin] = useState(false);
  const [hasGroup, setHasGroup] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showSearchGroup, setShowSearchGroup] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    console.log('📱 GroupsScreen mounted');
    console.log('👤 User object:', user);
    loadGroupData();
  }, []);

  const loadGroupData = async () => {
    try {
      console.log('🔍 loadGroupData called');
      setError(null);
      setLoading(true);
      
      // Check if user exists
      if (!user) {
        console.error('❌ User is null or undefined');
        setError('User not found. Please log in again.');
        setLoading(false);
        return;
      }

      console.log('📡 Fetching profile for user ID:', user.id);
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('team_id, role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('❌ Profile fetch error:', profileError);
        setError('Failed to load profile: ' + profileError.message);
        setLoading(false);
        return;
      }

      console.log('✅ Profile fetched:', profile);
      console.log('📊 Profile data:', JSON.stringify(profile, null, 2));

      // Handle case where profile is null
      if (!profile) {
        console.warn('⚠️ No profile found for user');
        setHasGroup(false);
        setIsGroupAdmin(false);
        setGroupInfo(null);
        setGroupMembers([]);
        setPendingRequests([]);
        setLoading(false);
        return;
      }

      const hasValidTeam = profile.team_id !== null && profile.team_id !== undefined && profile.team_id !== '';
      console.log('🏷️ Has valid team:', hasValidTeam, 'Team ID:', profile.team_id);
      
      setHasGroup(hasValidTeam);
      setIsGroupAdmin(profile.role === 'leader' && hasValidTeam);

      if (hasValidTeam && profile.team_id) {
        console.log('📡 Fetching group details for team:', profile.team_id);
        
        // Try to get group details
        try {
          const teamResult = await GroupService.getGroupDetails(profile.team_id);
          if (teamResult.success) {
            console.log('✅ Group details fetched:', teamResult.data);
            setGroupInfo(teamResult.data);
          } else {
            console.warn('⚠️ Failed to fetch group details:', teamResult.error);
            setError('Failed to load group details: ' + (teamResult.error || 'Unknown error'));
          }
        } catch (teamError) {
          console.error('❌ Error fetching group details:', teamError);
          setError('Error loading group: ' + teamError.message);
        }

        // Get members
        try {
          const membersResult = await GroupService.getGroupMembers(profile.team_id);
          if (membersResult.success) {
            console.log('✅ Members fetched:', membersResult.data?.length || 0, 'members');
            setGroupMembers(membersResult.data || []);
          } else {
            console.warn('⚠️ Failed to fetch members:', membersResult.error);
          }
        } catch (membersError) {
          console.error('❌ Error fetching members:', membersError);
        }

        // Get pending requests (only for leader)
        if (profile.role === 'leader') {
          try {
            const requestsResult = await GroupService.getPendingRequests(profile.team_id);
            if (requestsResult.success) {
              console.log('✅ Pending requests fetched:', requestsResult.data?.length || 0);
              setPendingRequests(requestsResult.data || []);
            } else {
              console.warn('⚠️ Failed to fetch pending requests:', requestsResult.error);
            }
          } catch (requestsError) {
            console.error('❌ Error fetching pending requests:', requestsError);
          }
        }
      } else {
        console.log('ℹ️ User has no group');
        setGroupInfo(null);
        setGroupMembers([]);
        setPendingRequests([]);
      }

      if (onRefresh) onRefresh();
      setError(null);
    } catch (error) {
      console.error('❌ CRITICAL ERROR in loadGroupData:', error);
      console.error('❌ Error stack:', error.stack);
      setError('Failed to load group data: ' + error.message);
    } finally {
      console.log('✅ loadGroupData completed, setting loading to false');
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefreshPull = () => {
    console.log('🔄 Pull to refresh triggered');
    setRefreshing(true);
    setRetryCount(retryCount + 1);
    loadGroupData();
  };

  // ============================================================
  // LEAVE GROUP
  // ============================================================
  const handleLeaveGroup = () => {
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessing(true);
              const { error } = await supabase
                .from('profiles')
                .update({ team_id: null, role: 'member' })
                .eq('id', user.id);

              if (error) throw error;
              setHasGroup(false);
              setGroupInfo(null);
              setGroupMembers([]);
              setPendingRequests([]);
              setIsGroupAdmin(false);
              Alert.alert('Success', 'You have left the group.');
              loadGroupData();
            } catch (error) {
              console.error('Error leaving group:', error);
              Alert.alert('Error', 'Failed to leave group: ' + error.message);
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  };

  // ============================================================
  // DISMISS GROUP
  // ============================================================
  const handleDismissGroup = () => {
    Alert.alert(
      'Dismiss Group',
      '⚠️ Warning: This will permanently delete the group and remove all members.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Dismiss',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessing(true);
              const { data: members, error: membersError } = await supabase
                .from('profiles')
                .select('id')
                .eq('team_id', groupInfo?.id);

              if (membersError) throw membersError;

              for (const member of members || []) {
                await supabase
                  .from('profiles')
                  .update({ team_id: null, role: 'member' })
                  .eq('id', member.id);
              }

              const { error: deleteError } = await supabase
                .from('teams')
                .delete()
                .eq('id', groupInfo?.id);

              if (deleteError) throw deleteError;

              setHasGroup(false);
              setGroupInfo(null);
              setGroupMembers([]);
              setPendingRequests([]);
              setIsGroupAdmin(false);
              Alert.alert('Success', 'Group has been dismissed.');
              loadGroupData();
            } catch (error) {
              console.error('Error dismissing group:', error);
              Alert.alert('Error', 'Failed to dismiss group: ' + error.message);
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  };

  // ============================================================
  // HANDLE JOIN REQUEST
  // ============================================================
  const handleRequest = async (requestId, userId, action) => {
    try {
      setProcessing(true);
      const result = await GroupService.handleJoinRequest(
        requestId,
        groupInfo?.id,
        userId,
        action
      );
      
      if (result.success) {
        Alert.alert('Success', `${action === 'approved' ? 'Approved' : 'Rejected'} successfully`);
        loadGroupData();
      } else {
        Alert.alert('Error', result.error || 'Failed to process request');
      }
    } catch (error) {
      console.error('Error handling request:', error);
      Alert.alert('Error', 'Failed to process request');
    } finally {
      setProcessing(false);
    }
  };

  // ============================================================
  // TRANSFER LEADER
  // ============================================================
  const handleTransferLeader = (member) => {
    Alert.alert(
      'Transfer Leadership',
      `Are you sure you want to transfer group leadership to ${member.full_name || member.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer',
          onPress: async () => {
            try {
              setProcessing(true);
              await supabase
                .from('profiles')
                .update({ role: 'member' })
                .eq('id', user.id);
              await supabase
                .from('profiles')
                .update({ role: 'leader' })
                .eq('id', member.id);
              await supabase
                .from('teams')
                .update({ created_by: member.id })
                .eq('id', groupInfo?.id);
              setIsGroupAdmin(false);
              Alert.alert('Success', `Leadership transferred to ${member.full_name || member.email}`);
              loadGroupData();
            } catch (error) {
              console.error('Error transferring leadership:', error);
              Alert.alert('Error', 'Failed to transfer leadership');
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  };

  // ============================================================
  // REMOVE MEMBER
  // ============================================================
  const handleRemoveMember = (member) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.full_name || member.email} from the group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessing(true);
              await supabase
                .from('profiles')
                .update({ team_id: null, role: 'member' })
                .eq('id', member.id);
              Alert.alert('Success', `${member.full_name || member.email} has been removed.`);
              loadGroupData();
            } catch (error) {
              console.error('Error removing member:', error);
              Alert.alert('Error', 'Failed to remove member');
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  };

  const getMemberCount = () => groupMembers.length || 1;
  const getSubscriptionStatus = () => groupInfo?.subscription_tier || 'Personal Free';
  const isSubscriptionActive = () => {
    if (!groupInfo) return false;
    if (!groupInfo.subscription_end_date) return false;
    return new Date(groupInfo.subscription_end_date) > new Date();
  };
  const getDaysRemaining = () => {
    if (!groupInfo?.subscription_end_date) return 0;
    const now = new Date();
    const expiry = new Date(groupInfo.subscription_end_date);
    const diff = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  // Show error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>❌</Text>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.errorButton}
          onPress={() => {
            setError(null);
            setRetryCount(retryCount + 1);
            loadGroupData();
          }}
        >
          <Text style={styles.errorButtonText}>🔄 Try Again</Text>
        </TouchableOpacity>
        <Text style={styles.errorRetryText}>Attempt {retryCount + 1}</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading group data...</Text>
        <Text style={styles.loadingSubText}>Please wait</Text>
      </View>
    );
  }

  if (!hasGroup) {
    return (
      <ScrollView 
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefreshPull} />}
      >
        <View style={styles.noGroupContainer}>
          <Text style={styles.noGroupIcon}>👥</Text>
          <Text style={styles.noGroupTitle}>No Group Yet</Text>
          <Text style={styles.noGroupSubtitle}>
            Join an existing group or create your own to collaborate with team members.
          </Text>

          <TouchableOpacity 
            style={[styles.actionCard, styles.createCard]}
            onPress={() => setShowCreateGroup(true)}
          >
            <Text style={styles.actionIcon}>🚀</Text>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Create a Group</Text>
              <Text style={styles.actionSubtitle}>Start your own group and become a leader</Text>
            </View>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, styles.joinCard]}
            onPress={() => setShowSearchGroup(true)}
          >
            <Text style={styles.actionIcon}>🔍</Text>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Join a Group</Text>
              <Text style={styles.actionSubtitle}>Search and request to join an existing group</Text>
            </View>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {showCreateGroup && (
          <CreateGroupScreen
            user={user}
            onClose={() => { setShowCreateGroup(false); loadGroupData(); }}
            onGroupCreated={() => { setShowCreateGroup(false); loadGroupData(); }}
          />
        )}

        {showSearchGroup && (
          <GroupSearchScreen
            user={user}
            onClose={() => { setShowSearchGroup(false); loadGroupData(); }}
            onJoinGroup={() => { setShowSearchGroup(false); loadGroupData(); }}
          />
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefreshPull} />}
    >
      {/* Group Header */}
      <View style={styles.groupHeader}>
        <View style={styles.groupHeaderRow}>
          <Text style={styles.groupName}>{groupInfo?.name || 'Your Group'}</Text>
          {isGroupAdmin && (
            <View style={styles.leaderBadge}>
              <Text style={styles.leaderBadgeText}>👑 Leader</Text>
            </View>
          )}
        </View>
        <Text style={styles.groupMembersCount}>👥 {getMemberCount()} members</Text>
        <Text style={styles.groupPlan}>📊 Plan: {getSubscriptionStatus()}</Text>
        {isSubscriptionActive() && (
          <Text style={styles.groupExpiry}>⏰ Expires in {getDaysRemaining()} days</Text>
        )}
      </View>

      {/* Pending Requests */}
      {isGroupAdmin && pendingRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📨 Pending Requests ({pendingRequests.length})</Text>
          {pendingRequests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestInfo}>
                <Text style={styles.requestName}>
                  {request.profiles?.full_name || 'Unknown User'}
                </Text>
                <Text style={styles.requestEmail}>{request.profiles?.email || ''}</Text>
              </View>
              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.approveBtn]}
                  onPress={() => handleRequest(request.id, request.user_id, 'approved')}
                  disabled={processing}
                >
                  <Text style={styles.actionBtnText}>✅</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={() => handleRequest(request.id, request.user_id, 'rejected')}
                  disabled={processing}
                >
                  <Text style={styles.actionBtnText}>❌</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Members List */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>👥 Members ({groupMembers.length})</Text>
        </View>
        {groupMembers.map((member) => (
          <TouchableOpacity
            key={member.id}
            style={styles.memberCard}
            onPress={() => {
              if (isGroupAdmin && member.id !== user.id) {
                Alert.alert(
                  'Manage Member',
                  `What would you like to do with ${member.full_name || member.email}?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Transfer Leadership', onPress: () => handleTransferLeader(member) },
                    { text: 'Remove from Group', style: 'destructive', onPress: () => handleRemoveMember(member) }
                  ]
                );
              }
            }}
            disabled={!isGroupAdmin || member.id === user.id}
          >
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>
                {member.full_name || 'Unknown'}
                {member.id === user.id && ' (You)'}
              </Text>
              <Text style={[styles.memberRole, member.role === 'leader' && styles.leaderRoleText]}>
                {member.role === 'leader' ? '👑 Leader' : 'Member'}
              </Text>
            </View>
            <Text style={styles.memberEmail}>{member.email}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Subscription */}
      {isGroupAdmin && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💳 Subscription</Text>
          <TouchableOpacity
            style={[styles.planCard, styles.planBasic]}
            onPress={() => setShowAdminPanel(true)}
          >
            <View style={styles.planInfo}>
              <Text style={styles.planName}>Group Basic</Text>
              <Text style={styles.planPrice}>RM7/seat/month</Text>
              <Text style={styles.planTotal}>Total: RM{getMemberCount() * 7}/month</Text>
            </View>
            <View style={styles.planButton}>
              <Text style={styles.planButtonText}>Pay Now</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.planCard, styles.planPro]}
            onPress={() => setShowAdminPanel(true)}
          >
            <View style={styles.planInfo}>
              <Text style={styles.planName}>Group Pro</Text>
              <Text style={styles.planPrice}>RM12/seat/month</Text>
              <Text style={styles.planTotal}>Total: RM{getMemberCount() * 12}/month</Text>
            </View>
            <View style={styles.planButton}>
              <Text style={styles.planButtonText}>Pay Now</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {isGroupAdmin ? (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.transferButton]}
              onPress={() => {
                const otherMembers = groupMembers.filter(m => m.id !== user.id);
                if (otherMembers.length === 0) {
                  Alert.alert('No Members', 'There are no other members to transfer leadership to.');
                  return;
                }
                Alert.alert(
                  'Transfer Leadership',
                  'Select a member to transfer group leadership to:',
                  otherMembers.map(member => ({
                    text: member.full_name || member.email,
                    onPress: () => handleTransferLeader(member)
                  }))
                );
              }}
              disabled={processing}
            >
              <Text style={styles.actionButtonText}>🔄 Transfer Leadership</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.dismissButton]}
              onPress={handleDismissGroup}
              disabled={processing}
            >
              <Text style={styles.actionButtonText}>🗑️ Dismiss Group</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.leaveButton]}
            onPress={handleLeaveGroup}
            disabled={processing}
          >
            <Text style={styles.actionButtonText}>🚪 Leave Group</Text>
          </TouchableOpacity>
        )}
      </View>

      {showAdminPanel && (
        <AdminGroupPanel
          user={user}
          teamId={groupInfo?.id}
          onClose={() => { setShowAdminPanel(false); loadGroupData(); }}
          onUpdate={() => { loadGroupData(); }}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  loadingText: { marginTop: 12, color: '#666', fontSize: 16 },
  loadingSubText: { marginTop: 4, color: '#999', fontSize: 12 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f4f6f8' },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  errorText: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  errorButton: { backgroundColor: '#007AFF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  errorButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  errorRetryText: { fontSize: 12, color: '#999', marginTop: 8 },
  noGroupContainer: { padding: 20, alignItems: 'center' },
  noGroupIcon: { fontSize: 64, marginTop: 40, marginBottom: 16 },
  noGroupTitle: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' },
  noGroupSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 30 },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    width: '100%',
    elevation: 2
  },
  createCard: { borderLeftWidth: 4, borderLeftColor: '#28a745' },
  joinCard: { borderLeftWidth: 4, borderLeftColor: '#007AFF' },
  actionIcon: { fontSize: 28, marginRight: 14 },
  actionContent: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  actionSubtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  actionArrow: { fontSize: 18, color: '#007AFF' },
  groupHeader: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
    elevation: 2
  },
  groupHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  groupName: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' },
  leaderBadge: {
    backgroundColor: '#6f42c1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  leaderBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  groupMembersCount: { fontSize: 14, color: '#666', marginTop: 8 },
  groupPlan: { fontSize: 14, color: '#666', marginTop: 4 },
  groupExpiry: { fontSize: 13, color: '#856404', marginTop: 4 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 1
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  requestCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  requestInfo: { flex: 1 },
  requestName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  requestEmail: { fontSize: 13, color: '#666' },
  requestActions: { flexDirection: 'row' },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, marginLeft: 8 },
  approveBtn: { backgroundColor: '#28a745' },
  rejectBtn: { backgroundColor: '#dc3545' },
  actionBtnText: { fontSize: 16 },
  memberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  memberRole: { fontSize: 12, color: '#888' },
  leaderRoleText: { color: '#6f42c1', fontWeight: 'bold' },
  memberEmail: { fontSize: 13, color: '#666' },
  planCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#eee'
  },
  planBasic: { borderColor: '#FF6B35' },
  planPro: { borderColor: '#6F42C1' },
  planInfo: { flex: 1 },
  planName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  planPrice: { fontSize: 14, fontWeight: 'bold', color: '#007AFF' },
  planTotal: { fontSize: 14, fontWeight: 'bold', color: '#333', marginTop: 4 },
  planButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6
  },
  planButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  actionButtons: { paddingHorizontal: 16, marginBottom: 30 },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10
  },
  leaveButton: { backgroundColor: '#dc3545' },
  transferButton: { backgroundColor: '#6f42c1' },
  dismissButton: { backgroundColor: '#dc3545' },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

export default GroupsScreen;
