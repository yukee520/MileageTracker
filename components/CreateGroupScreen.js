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
import GroupService from '../services/GroupService';

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
      const result = await GroupService.createGroup(
        user.id,
        groupName.trim(),
        description.trim()
      );

      if (result.success) {
        Alert.alert(
          '🎉 Group Created!',
          `"${groupName.trim()}" has been created. You are now the group admin.\n\nYou can now:\n• Approve join requests\n• Manage subscription\n• Invite others to join`,
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
        Alert.alert('Error', result.error || 'Failed to create group');
      }
    } catch (error) {
      console.error('Create group error:', error);
      Alert.alert('Error', 'Failed to create group');
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
