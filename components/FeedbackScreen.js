import React, { useState } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, Modal,
  ScrollView, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import FeedbackService from '../services/FeedbackService';

const CATEGORIES = [
  { key: 'bug',      label: '🐞 Bug Report' },
  { key: 'feature',  label: '💡 Feature Request' },
  { key: 'general',  label: '💬 General Feedback' },
  { key: 'other',    label: '📝 Other' },
];

const FeedbackScreen = ({ user, onClose }) => {
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert('Required', 'Please enter your feedback.');
      return;
    }

    setSubmitting(true);
    const result = await FeedbackService.submitFeedback({
      userId: user?.id,
      email: user?.email,
      category,
      message,
    });
    setSubmitting(false);

    if (result.success) {
      setSubmitted(true);
    } else {
      Alert.alert('Error', result.error || 'Failed to submit feedback');
    }
  };

  const handleClose = () => {
    setCategory('general');
    setMessage('');
    setSubmitted(false);
    onClose();
  };

  return (
    <Modal visible={true} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>💬 Feedback</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {submitted ? (
          <View style={styles.thankYouContainer}>
            <Text style={styles.thankYouIcon}>🎉</Text>
            <Text style={styles.thankYouTitle}>Thank you!</Text>
            <Text style={styles.thankYouSub}>
              Your feedback has been received. We appreciate you taking the time to help us improve.
            </Text>
            <TouchableOpacity style={styles.doneBtn} onPress={handleClose}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
            <Text style={styles.sectionLabel}>Category</Text>
            <View style={styles.categories}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.categoryBtn, category === c.key && styles.categoryBtnActive]}
                  onPress={() => setCategory(c.key)}
                >
                  <Text
                    style={[styles.categoryText, category === c.key && styles.categoryTextActive]}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Your feedback</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Tell us what you think, what's broken, or what you'd like to see..."
              placeholderTextColor="#999"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              maxLength={2000}
            />
            <Text style={styles.charCount}>{message.length} / 2000</Text>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Send Feedback</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.footerNote}>
              We read every message. Thank you for helping us improve!
            </Text>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },
  closeBtn: { padding: 8 },
  closeBtnText: { fontSize: 24, color: '#333' },
  content: { flex: 1 },
  contentContainer: { padding: 20 },
  sectionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#e9ecef',
    marginRight: 8,
    marginBottom: 8,
  },
  categoryBtnActive: { backgroundColor: '#007AFF' },
  categoryText: { fontSize: 13, fontWeight: '600', color: '#555' },
  categoryTextActive: { color: '#fff' },
  textArea: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#333',
    minHeight: 160,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  charCount: { fontSize: 11, color: '#999', textAlign: 'right', marginTop: 4 },
  submitBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  footerNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
  },
  thankYouContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  thankYouIcon: { fontSize: 64, marginBottom: 16 },
  thankYouTitle: { fontSize: 24, fontWeight: 'bold', color: '#28a745', marginBottom: 8 },
  thankYouSub: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  doneBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default FeedbackScreen;
