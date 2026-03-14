import React, { useState, useRef } from 'react';
import { StyleSheet, TextInput, FlatList, ScrollView, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { View, Text, commonStyles, Card } from '../../src/components/Themed';
import { theme } from '../../src/theme';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function AIScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: inputText.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    // Mock AI Response
    setTimeout(() => {
      const aiMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: "I am the VibeOS AI. I am currently connected to your RAG memory. How can I help?" 
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsLoading(false);
    }, 1500);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageWrapper, isUser ? styles.userWrapper : styles.aiWrapper]}>
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={isUser ? styles.userText : styles.aiText}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <View style={commonStyles.container}>
        <Text style={commonStyles.title}>AI Box</Text>
        
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ paddingBottom: theme.spacing.md }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={theme.colors.accentPrimary} />
            <Text style={{ marginLeft: theme.spacing.sm, color: theme.colors.accentPrimary }}>AI is thinking...</Text>
          </View>
        )}

        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Talk to VibeOS..."
            placeholderTextColor={theme.colors.textMuted}
            multiline
          />
          <TouchableOpacity 
            onPress={handleSend} 
            disabled={!inputText.trim() || isLoading}
            style={[styles.sendButton, (!inputText.trim() || isLoading) && { opacity: 0.5 }]}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  messageWrapper: {
    marginVertical: theme.spacing.xs,
    flexDirection: 'row',
    backgroundColor: 'transparent',
  },
  userWrapper: {
    justifyContent: 'flex-end',
  },
  aiWrapper: {
    justifyContent: 'flex-start',
  },
  bubble: {
    padding: theme.spacing.md,
    borderRadius: 20,
    maxWidth: '85%',
  },
  userBubble: {
    backgroundColor: theme.colors.accentPrimary,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: theme.colors.bgCard,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  userText: {
    color: '#fff',
  },
  aiText: {
    color: theme.colors.textPrimary,
  },
  inputArea: {
    flexDirection: 'row',
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  input: {
    flex: 1,
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing.md,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: theme.colors.accentPrimary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: 20,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    backgroundColor: 'transparent',
  }
});
