import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native';
import { createClient } from '@supabase/supabase-js';
import GroupService from '../services/GroupService';

const SUPABASE_URL = 'https://dkpjicqepexhgbrzzreo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7CXIRyhWhmsQfRfj9dDhWw_Z2efV6fx';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CreateGroupScreen = ({ user, onClose, onGroupCreated }) => {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Required', 'Please enter a group name.');
      return;
    }

    if (groupName.trim().length < 3) {
      Alert.alert('Error', 'Group name must be at least 3 characters.');
      return;
    }

    try {
      setLoading(true);
      
      // Check if user already has a group
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('team_id, subscription_tier, subscription_expiry')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      if (profile.team_id) {
        Alert.alert('Already in a Group', 'You are already in a group. Please leave your current group first.');
        setLoading(false);
        return;
      }

      // Create the group
      const result = await GroupService.createGroup(
        user.id,
        groupName.trim(),
        description.trim()
      );

      if (result.success) {
        // IMPORTANT: Preserve the user's personal subscription
        // The user's subscription_tier and subscription_expiry should remain unchanged
        // Only team_id should be updated
        
        // Update the team to show it's a free group (not personal)
        const teamId = result.data.id;
        await supabase
          .from('teams')
          .update({
            subscription_tier: 'personal_free', // Group shows as Free
            monthly_trip_limit: 30,
            max_members: 10
          })
          .eq('id', teamId);

        // Update user's profile to join the group BUT KEEP personal subscription
        await supabase
          .from('profiles')
          .update({
            team_id: teamId,
            role: 'leader',
            // DO NOT change subscription_tier or subscription_expiry
          })
          .eq('id', user.id);

        Alert.alert(
          '🎉 Group Created!',
          `"${groupName.trim()}" has been created.\n\nYour personal subscription remains active until ${profile.subscription_expiry ? new Date(profile.subscription_expiry).toLocaleDateString() : 'expired'}.\n\nYou are now the group leader.`,
          [
            {
              text: 'OK',
              onPress: () => {
                if (onGroupCreated) onGroupCreated(result.data);
                onClose();
              }
            }
          ]
        );
      } else {
        if (result.error && result.error.includes('already taken')) {
          Alert.alert(
            'Group Name Already Taken',
            result.error,
            [{ text: 'OK', onPress: () => setGroupName('') }]
          );
        } else {
          Alert.alert('Error', result.error || 'Failed to create group');
        }
      }
    } catch (error) {
      console.error('Create group error:', error);
      Alert.alert('Error', 'Failed to create group: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={true} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Create a Group</Text>
          <View style={{ width: 30 }} />
        </View>

        <View style={styles.content}>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>👑 You'll be the Group Leader</Text>
            <Text style={styles.infoText}>
              As the leader, you can approve members and manage group subscription.
              {'\n\n'}Your personal subscription will remain active.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Group Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Acme Corp"
              value={groupName}
              onChangeText={setGroupName}
              maxLength={50}
              autoFocus={true}
            />

            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your group..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={200}
            />

            <TouchableOpacity
              style={[styles.createButton, loading && styles.disabledButton]}
              onPress={handleCreateGroup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.createButtonText}>🚀 Create Group</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20
  },
  infoTitle: { fontSize: 16, fontWeight: 'bold', color: '#1976d2' },
  infoText: { fontSize: 14, color: '#555', marginTop: 4 },
  form: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  createButton: {
    backgroundColor: '#28a745',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10
  },
  disabledButton: { opacity: 0.6 },
  createButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10
  },
  cancelButtonText: { color: '#666', fontSize: 16 }
});

export default CreateGroupScreen;
