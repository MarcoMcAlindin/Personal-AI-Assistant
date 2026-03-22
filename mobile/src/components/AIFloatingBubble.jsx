import { Send, Sparkles, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  ScrollView,
  Dimensions,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { BlurView } from 'expo-blur';

import { palette, spacing } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Themed';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const AIFloatingBubble = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [message, setMessage] = useState('');

  return (
    <>
      {/* Floating Bubble */}
      {!isExpanded && (
        <TouchableOpacity
          onPress={() => setIsExpanded(true)}
          style={styles.bubbleContainer}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#00FFFF', '#0099CC']}
            style={styles.bubbleGradient}
          >
            <Sparkles size={28} color="#0A0A0A"  />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Expanded Chat Overlay */}
      <Modal
        visible={isExpanded}
        transparent
        animationType="slide"
        onRequestClose={() => setIsExpanded(false)}
      >
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={() => setIsExpanded(false)}
        >
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        </TouchableOpacity>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.chatPanel}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerInfo}>
                <LinearGradient
                  colors={['#00FFFF', '#0099CC']}
                  style={styles.headerIconContainer}
                >
                  <Sparkles size={20} color="#0A0A0A"  />
                </LinearGradient>
                <View>
                  <Text style={styles.headerTitle}>AI Assistant</Text>
                  <Text style={styles.headerSubtitle}>Always here to help</Text>
                </View>
              </View>
              <TouchableOpacity 
                onPress={() => setIsExpanded(false)}
                style={styles.closeButton}
              >
                <X size={24} color={palette.textSecondary}  />
              </TouchableOpacity>
            </View>

            {/* Messages Area */}
            <ScrollView style={styles.messagesContainer} contentContainerStyle={styles.messagesContent}>
              <View style={styles.messageRow}>
                <LinearGradient
                  colors={['#00FFFF', '#0099CC']}
                  style={styles.messageAvatar}
                >
                  <Sparkles size={14} color="#0A0A0A"  />
                </LinearGradient>
                <View style={styles.aiBubble}>
                  <Text style={styles.aiText}>
                    Hi! I'm your AI assistant. How can I help you today?
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Input Area */}
            <View style={styles.inputArea}>
              <View style={styles.inputWrapper}>
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Ask me anything..."
                  placeholderTextColor={palette.textMuted}
                  style={styles.input}
                />
                <TouchableOpacity 
                  onPress={() => setMessage('')}
                  style={styles.sendButton}
                >
                  <LinearGradient
                    colors={['rgba(0, 255, 255, 0.2)', 'rgba(0, 153, 204, 0.2)']}
                    style={styles.sendButtonGradient}
                  >
                    <Send size={18} color={palette.accentPrimary}  />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  bubbleContainer: {
    position: 'absolute',
    bottom: 100, // Above tab bar
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    zIndex: 1000,
    // Glow effect
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  bubbleGradient: {
    flex: 1,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  chatPanel: {
    height: '85%',
    backgroundColor: '#1A1A1A', // bgSecondary
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 2,
    borderColor: 'rgba(0, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 255, 0.1)',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 12,
    color: palette.textSecondary,
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  aiBubble: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    borderBottomLeftRadius: 0,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.15)',
  },
  aiText: {
    fontSize: 15,
    color: '#DAE2FD',
    lineHeight: 22,
  },
  inputArea: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 255, 255, 0.1)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
    paddingRight: 8,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  sendButton: {
    padding: 4,
  },
  sendButtonGradient: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
});
