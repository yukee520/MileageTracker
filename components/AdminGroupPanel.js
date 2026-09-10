import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native';
import { createClient } from '@supabase/supabase-js';
import GroupService from '../services/GroupService';
import PaymentModal from './PaymentModal';

const SUPABASE_URL = 'https://dkpjicqepexhgbrzzreo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7CXIRyhWhmsQfRfj9dDhWw_Z2efV6fx';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const AdminGroupPanel = ({ user, teamId, onClose, onUpdate }) => {
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [members, setMembers] = useState([]);
  const [teamData, setTeamData] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);

  useEffect(() => {
    loadData();
  }, [teamId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [requestsResult, membersResult, teamResult] = await Promise.all([
        GroupService.getPendingRequests(teamId),
        GroupService.getGroupMembers(teamId),
        GroupService.getGroupDetails(teamId)
      ]);

      if (requestsResult.success) setPendingRequests(requestsResult.data || []);
      if (membersResult.success) setMembers(membersResult.data || []);
      if (teamResult.success) setTeamData(teamResult.data);

    } catch (error) {
      console.error('Error loading admin data:', error);
      Alert.alert('Error', 'Failed to load group data');
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (requestId, userId, action) => {
    try {
      setProcessing(true);
      
      if (action === 'approved') {
        // 1. Get the request details
        const { data: request, error: requestError } = await supabase
          .from('group_join_requests')
          .select('team_id')
          .eq('id', requestId)
          .single();
        
        if (requestError) throw requestError;
        
        // 2. Add user to team
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ team_id: request.team_id })
          .eq('id', userId);
        
        if (profileError) throw profileError;
        
        // 3. DELETE the join request
        const { error: deleteError } = await supabase
          .from('group_join_requests')
          .delete()
          .eq('id', requestId);
        
        if (deleteError) throw deleteError;
        
        Alert.alert('Success', 'User approved and added to group');
        
      } else if (action === 'rejected') {
        // Delete rejected request
        const { error: deleteError } = await supabase
          .from('group_join_requests')
          .delete()
          .eq('id', requestId);
        
        if (deleteError) throw deleteError;
        
        Alert.alert('Success', 'Request rejected');
      }
      
      loadGroupData();
      if (onUpdate) onUpdate();
      
    } catch (error) {
      console.error('Error handling request:', error);
      Alert.alert('Error', 'Failed to process request: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const getMemberCount = () => members.length || 1;

  const getSubscriptionStatus = () => teamData?.subscription_tier || 'Personal Free';

  const getExpiryDate = () => {
    if (!teamData?.subscription_end_date) return null;
    return new Date(teamData.subscription_end_date).toLocaleDateString();
  };

  const isSubscriptionActive = () => {
    if (!teamData) return false;
    if (!teamData.subscription_end_date) return false;
    return new Date(teamData.subscription_end_date) > new Date();
  };

  const getDaysRemaining = () => {
    if (!teamData?.subscription_end_date) return 0;
    const now = new Date();
    const expiry = new Date(teamData.subscription_end_date);
    const diff = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 16 }}>Loading group data...</Text>
      </View>
    );
  }

  return (
    <Modal visible={true} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Group Management</Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView style={styles.content}>
          {/* Group Info */}
          <View style={styles.infoCard}>
            <Text style={styles.groupName}>{teamData?.name || 'Your Group'}</Text>
            <Text style={styles.groupInfoText}>👥 Members: {members.length}</Text>
            <Text style={styles.groupInfoText}>📊 Plan: {getSubscriptionStatus()}</Text>
            {isSubscriptionActive() ? (
              <>
                <Text style={[styles.groupInfoText, styles.activeText]}>✅ Active</Text>
                <Text style={styles.groupInfoText}>⏰ Expires in {getDaysRemaining()} days</Text>
                <Text style={styles.groupInfoText}>📅 Expiry: {getExpiryDate()}</Text>
              </>
            ) : (
              <Text style={[styles.groupInfoText, styles.inactiveText]}>❌ No active subscription</Text>
            )}
          </View>

          {/* Pay for Members - Only visible when there are members */}
          <View style={styles.paySection}>
            <Text style={styles.payTitle}>💳 Pay for Your Members</Text>
            <Text style={styles.paySubtitle}>
              You are paying for {getMemberCount()} member{getMemberCount() > 1 ? 's' : ''}
            </Text>
            <Text style={styles.paySubtitle}>
              Subscription will last for 1 month and apply to all members
            </Text>

            <View style={styles.planOptions}>
              <TouchableOpacity
                style={[styles.planCard, styles.planBasic]}
                onPress={() => {
                  setSelectedTier('Group Basic');
                  setShowPaymentModal(true);
                }}
              >
                <Text style={styles.planName}>Group Basic</Text>
                <Text style={styles.planPrice}>RM7/seat/month</Text>
                <Text style={styles.planFeatures}>
                  • 100 trips/month per member
                  • Up to 10 members
                  • Excel export
                </Text>
                <Text style={styles.planTotal}>
                  Total: RM{getMemberCount() * 7}/month
                </Text>
                <View style={styles.selectButton}>
                  <Text style={styles.selectButtonText}>Pay Now</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.planCard, styles.planPro]}
                onPress={() => {
                  setSelectedTier('Group Pro');
                  setShowPaymentModal(true);
                }}
              >
                <Text style={styles.planName}>Group Pro</Text>
                <Text style={styles.planPrice}>RM12/seat/month</Text>
                <Text style={styles.planFeatures}>
                  • Unlimited trips per member
                  • Up to 25 members
                  • Excel export
                  • Priority support
                </Text>
                <Text style={styles.planTotal}>
                  Total: RM{getMemberCount() * 12}/month
                </Text>
                <View style={styles.selectButton}>
                  <Text style={styles.selectButtonText}>Pay Now</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Pending Requests */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📨 Pending Requests ({pendingRequests.length})</Text>
            {pendingRequests.length === 0 ? (
              <Text style={styles.emptyText}>No pending requests</Text>
            ) : (
              pendingRequests.map((request) => (
                <View key={request.id} style={styles.requestCard}>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestName}>
                      {request.profiles?.full_name || 'Unknown User'}
                    </Text>
                    <Text style={styles.requestEmail}>{request.profiles?.email || ''}</Text>
                    {request.message && (
                      <Text style={styles.requestMessage}>"{request.message}"</Text>
                    )}
                    <Text style={styles.requestDate}>
                      {new Date(request.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.approveBtn]}
                      onPress={() => handleRequest(request.id, request.user_id, 'approved')}
                      disabled={processing}
                    >
                      <Text style={styles.actionBtnText}>✅ Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => handleRequest(request.id, request.user_id, 'rejected')}
                      disabled={processing}
                    >
                      <Text style={styles.actionBtnText}>❌ Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Members List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👥 Members ({members.length})</Text>
            {members.map((member) => (
              <View key={member.id} style={styles.memberCard}>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.full_name || 'Unknown'}</Text>
                  <Text style={[styles.memberRole, member.role === 'leader' && styles.adminRole]}>
                    {member.role === 'leader' ? '👑 ADMIN' : 'MEMBER'}
                  </Text>
                </View>
                <Text style={styles.memberEmail}>{member.email}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Payment Modal */}
        {showPaymentModal && (
          <PaymentModal
            visible={showPaymentModal}
            tier={selectedTier}
            userData={{
              userId: user.id,
              teamId: teamId,
              email: user.email,
              driverName: user.full_name || user.email,
              memberCount: getMemberCount(),
              teamMembers: members
            }}
            onClose={() => setShowPaymentModal(false)}
            onPaymentSuccess={async (tier) => {
              setShowPaymentModal(false);
              Alert.alert(
                '🎉 Success!',
                `Your ${tier} subscription has been activated for all ${getMemberCount()} members!`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      loadData();
                      if (onUpdate) onUpdate();
                    }
                  }
                ]
              );
            }}
            onPaymentError={(error) => {
              console.error('Payment error:', error);
              setShowPaymentModal(false);
            }}
            onPaymentCancel={() => {
              setShowPaymentModal(false);
            }}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  closeButton: { fontSize: 24, color: '#333', padding: 4 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  content: { flex: 1, padding: 16 },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2
  },
  groupName: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },
  groupInfoText: { fontSize: 14, color: '#666', marginTop: 4 },
  activeText: { color: '#28a745', fontWeight: 'bold' },
  inactiveText: { color: '#dc3545', fontWeight: 'bold' },
  paySection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2
  },
  payTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  paySubtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  planOptions: { marginTop: 16 },
  planCard: {
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#eee'
  },
  planBasic: { borderColor: '#FF6B35' },
  planPro: { borderColor: '#6F42C1' },
  planName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  planPrice: { fontSize: 16, fontWeight: 'bold', color: '#007AFF', marginTop: 2 },
  planFeatures: { fontSize: 13, color: '#666', marginTop: 8 },
  planTotal: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 8 },
  selectButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10
  },
  selectButtonText: { color: '#fff', fontWeight: 'bold' },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 1
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  emptyText: { color: '#999', textAlign: 'center', paddingVertical: 16 },
  requestCard: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 12
  },
  requestInfo: { flex: 1 },
  requestName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  requestEmail: { fontSize: 13, color: '#666' },
  requestMessage: { fontSize: 13, color: '#888', fontStyle: 'italic', marginTop: 2 },
  requestDate: { fontSize: 12, color: '#999', marginTop: 2 },
  requestActions: { flexDirection: 'row', marginTop: 8 },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, marginRight: 8 },
  approveBtn: { backgroundColor: '#28a745' },
  rejectBtn: { backgroundColor: '#dc3545' },
  actionBtnText: { color: '#fff', fontWeight: 'bold' },
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
  adminRole: { color: '#007AFF', fontWeight: 'bold' },
  memberEmail: { fontSize: 13, color: '#666' }
});

export default AdminGroupPanel;
