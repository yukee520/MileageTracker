import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native';
import GroupService from '../services/GroupService';

const GroupSearchScreen = ({ user, onClose, onJoinGroup }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [joining, setJoining] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      Alert.alert('Info', 'Please enter at least 2 characters to search');
      return;
    }

    try {
      setLoading(true);
      const result = await GroupService.searchGroups(searchQuery);
      if (result.success) {
        setSearchResults(result.data);
        if (result.data.length === 0) {
          Alert.alert('No Results', 'No groups found matching your search');
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to search groups');
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search groups');
    } finally {
      setLoading(false);
    }
  };

  const handleViewGroup = (group) => {
    setSelectedGroup(group);
    setShowGroupDetails(true);
  };

  const handleRequestToJoin = async () => {
    if (!selectedGroup) return;

    try {
      setJoining(true);
      const result = await GroupService.requestToJoin(
        selectedGroup.id,
        user.id,
        joinMessage
      );

      if (result.success) {
        Alert.alert(
          '✅ Request Sent!',
          `Your request to join "${selectedGroup.name}" has been sent. The admin will review and approve your request.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setShowGroupDetails(false);
                setSelectedGroup(null);
                setJoinMessage('');
                if (onJoinGroup) onJoinGroup();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to send join request');
      }
    } catch (error) {
      console.error('Join request error:', error);
      Alert.alert('Error', 'Failed to send join request');
    } finally {
      setJoining(false);
    }
  };

  const renderGroupDetails = () => {
    if (!selectedGroup) return null;

    const isAdmin = selectedGroup.created_by === user.id;

    return (
      <Modal visible={showGroupDetails} animationType="slide" transparent={false}>
        <View style={styles.detailsContainer}>
          <View style={styles.detailsHeader}>
            <TouchableOpacity onPress={() => setShowGroupDetails(false)}>
              <Text style={styles.backButton}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.detailsTitle}>Group Details</Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView style={styles.detailsContent}>
            <View style={styles.groupInfoCard}>
              <Text style={styles.groupName}>{selectedGroup.name}</Text>
              {selectedGroup.group_name && (
                <Text style={styles.groupHandle}>@{selectedGroup.group_name}</Text>
              )}
              {selectedGroup.description && (
                <Text style={styles.groupDescription}>{selectedGroup.description}</Text>
              )}
              <Text style={styles.groupPlan}>📊 Plan: {selectedGroup.subscription_tier || 'Free'}</Text>
              <Text style={styles.groupAdmin}>
                👤 Admin: {selectedGroup.profiles?.full_name || 'Unknown'}
              </Text>
            </View>

            <View style={styles.joinSection}>
              <Text style={styles.joinLabel}>Message to Admin (Optional)</Text>
              <TextInput
                style={styles.joinInput}
                placeholder="Hi! I'd like to join your group..."
                value={joinMessage}
                onChangeText={setJoinMessage}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[styles.joinButton, joining && styles.disabledButton]}
                onPress={handleRequestToJoin}
                disabled={joining}
              >
                {joining ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.joinButtonText}>Send Join Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <Modal visible={true} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Search Groups</Text>
          <View style={{ width: 30 }} />
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by group name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearch}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.searchButtonText}>Search</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.resultsContainer}>
          {searchResults.length > 0 ? (
            searchResults.map((group) => (
              <TouchableOpacity
                key={group.id}
                style={styles.resultCard}
                onPress={() => handleViewGroup(group)}
              >
                <View style={styles.resultContent}>
                  <Text style={styles.resultName}>{group.name}</Text>
                  <Text style={styles.resultPlan}>📊 {group.subscription_tier || 'Free'}</Text>
                  <Text style={styles.resultAdmin}>
                    👤 {group.profiles?.full_name || 'Unknown'}
                  </Text>
                </View>
                <Text style={styles.resultArrow}>→</Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>Find Your Team</Text>
              <Text style={styles.emptyText}>
                Search for your group by name and request to join
              </Text>
              <Text style={styles.emptySubText}>
                Or create your own group if you don't find one
              </Text>
            </View>
          )}
        </ScrollView>

        {renderGroupDetails()}
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
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 8
  },
  searchButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center'
  },
  searchButtonText: { color: '#fff', fontWeight: 'bold' },
  resultsContainer: { flex: 1, padding: 16 },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1
  },
  resultContent: { flex: 1 },
  resultName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  resultPlan: { fontSize: 13, color: '#666', marginTop: 2 },
  resultAdmin: { fontSize: 13, color: '#888', marginTop: 2 },
  resultArrow: { fontSize: 20, color: '#007AFF' },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  emptyText: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8 },
  emptySubText: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 4 },
  detailsContainer: { flex: 1, backgroundColor: '#f4f6f8' },
  detailsHeader: {
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
  backButton: { fontSize: 16, color: '#007AFF' },
  detailsTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  detailsContent: { flex: 1, padding: 16 },
  groupInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 2
  },
  groupName: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  groupHandle: { fontSize: 14, color: '#666', marginTop: 2 },
  groupDescription: { fontSize: 14, color: '#444', marginTop: 8 },
  groupPlan: { fontSize: 14, color: '#666', marginTop: 8 },
  groupAdmin: { fontSize: 14, color: '#666', marginTop: 4 },
  joinSection: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 16, elevation: 1 },
  joinLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  joinInput: {
    backgroundColor: '#f0f2f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top'
  },
  joinButton: {
    backgroundColor: '#28a745',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12
  },
  disabledButton: { opacity: 0.6 },
  joinButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

export default GroupSearchScreen;
