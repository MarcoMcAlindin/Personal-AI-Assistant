import { ArrowUp, ChevronRight, MessageSquare, Sparkles, Cpu, Activity, Search, FileText, Code, Image, Mic, Video } from 'lucide-react-native';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, ScrollView, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Markdown from 'react-native-markdown-display';
import { spacing, theme } from '../theme';
import { sendChat, fetchVllmStatus, triggerVllmWarmup } from '../services/api';
import { MobileHeader } from '../components/MobileHeader';
import { MobileCard } from '../components/MobileCard';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Text } from '../components/Themed';

const AI_TOOLS = [
  { id: 'chat', name: "AI Chat", Icon: MessageSquare, description: "Conversational AI assistant", color: "#00FFFF" },
  { id: 'analysis', name: "Analysis", Icon: Activity, description: "Data analysis & insights", color: "#A855F7" },
  { id: 'search', name: "Search", Icon: Search, description: "Intelligent search", color: "#3B82F6" },
  { id: 'doc', name: "Document", Icon: FileText, description: "Document processing", color: "#10B981" },
  { id: 'code', name: "Code", Icon: Code, description: "Code generation", color: "#F59E0B" },
  { id: 'image', name: "Image", Icon: Image, description: "Image generation", color: "#EC4899" },
  { id: 'voice', name: "Voice", Icon: Mic, description: "Voice synthesis", color: "#8B5CF6" },
  { id: 'video', name: "Video", Icon: Video, description: "Video processing", color: "#EF4444" },
];

const markdownStyles = {
  body: { color: theme.colors.textPrimary, fontSize: 15, lineHeight: 24 },
  paragraph: { marginTop: 0, marginBottom: 10 },
  heading1: { color: theme.colors.textPrimary, fontSize: 22, marginBottom: 10 },
  heading2: { color: theme.colors.textPrimary, fontSize: 20, marginBottom: 8 },
  heading3: { color: theme.colors.textPrimary, fontSize: 18, marginBottom: 6 },
  bullet_list: { marginBottom: 8 },
  code_inline: { backgroundColor: 'rgba(0, 212, 255, 0.1)', color: theme.colors.accentPrimary, borderRadius: 4, paddingHorizontal: 4 },
  code_block: { backgroundColor: '#000', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 12, padding: 12, marginVertical: 8 },
  fence: { backgroundColor: '#000', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 12, padding: 12, marginVertical: 8 },
  link: { color: theme.colors.accentPrimary, textDecorationLine: 'underline' },
};

export default function ChatScreen() {
  const [view, setView] = useState('hub'); // 'hub' or 'chat'
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [vllmStatus, setVllmStatus] = useState('offline');
  const [vllmWarming, setVllmWarming] = useState(false);
  const flatListRef = useRef(null);

  const pollVllmStatus = useCallback(async () => {
    try {
      const { status } = await fetchVllmStatus();
      setVllmStatus(status);
    } catch {
      setVllmStatus('offline');
    }
  }, []);

  useEffect(() => { pollVllmStatus(); }, [pollVllmStatus]);

  useEffect(() => {
    let interval = null;
    if (vllmStatus === 'warming') {
      interval = setInterval(pollVllmStatus, 5000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [pollVllmStatus, vllmStatus]);

  const handleWarmup = async () => {
    setVllmWarming(true);
    try {
      await triggerVllmWarmup();
      setVllmStatus('warming');
    } catch {} finally {
      setVllmWarming(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { id: Date.now().toString(), role: 'user', content: text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const data = await sendChat(text);
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'No response received.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.messageUser : styles.messageAI]}>
        {!isUser && (
          <LinearGradient
            colors={['#00FFFF', '#0099CC']}
            style={styles.aiAvatar}
          >
            <Sparkles size={12} color="#0A0A0A"  />
          </LinearGradient>
        )}
        <View style={[
          styles.bubble, 
          isUser ? styles.bubbleUser : styles.bubbleAI
        ]}>
          {isUser ? (
            <Text style={styles.bubbleTextUser}>{item.content}</Text>
          ) : (
            <Markdown style={markdownStyles}>{item.content}</Markdown>
          )}
          <Text style={[styles.messageTime, isUser && { color: 'rgba(0,0,0,0.5)' }]}>
            {item.time}
          </Text>
        </View>
      </View>
    );
  };

  if (view === 'chat') {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <MobileHeader title="AI Chat" subtitle="Qwen3-Coder-30B" showBack onBack={() => setView('hub')} />
        
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.chatScroll}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                 <MessageSquare size={48} color="rgba(255, 255, 255, 0.05)"  />
                 <Text style={styles.emptyText}>Start a conversation with Qwen</Text>
              </View>
            }
          />

          {loading && (
            <View style={styles.typingContainer}>
              <ActivityIndicator size="small" color={theme.colors.accentPrimary} />
              <Text style={styles.typingText}>AI is thinking...</Text>
            </View>
          )}

          <BlurView intensity={30} tint="dark" style={styles.inputWrapper}>
             <TextInput
               style={styles.input}
               placeholder="Message Qwen..."
               placeholderTextColor={theme.colors.textMuted}
               value={input}
               onChangeText={setInput}
               multiline
             />
             <TouchableOpacity 
               onPress={handleSend}
               disabled={!input.trim() || loading}
               style={[styles.sendButton, !input.trim() && { opacity: 0.5 }]}
             >
                <LinearGradient
                  colors={['rgba(0, 212, 255, 0.4)', 'rgba(0, 153, 204, 0.4)']}
                  style={styles.sendButtonGradient}
                >
                  <ArrowUp size={20} color={theme.colors.accentPrimary}  />
                </LinearGradient>
             </TouchableOpacity>
          </BlurView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <MobileHeader title="AI Tools" subtitle="AI Orchestration Hub" />
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <TouchableOpacity 
          onPress={() => setView('chat')}
          activeOpacity={0.9}
        >
          <MobileCard style={styles.cpuCard}>
             <LinearGradient
               colors={['rgba(0, 255, 255, 0.15)', 'rgba(0, 153, 204, 0.05)']}
               start={{ x: 0, y: 0 }}
               end={{ x: 1, y: 1 }}
               style={StyleSheet.absoluteFill}
             />
             <View style={styles.cpuHeader}>
                <LinearGradient
                  colors={vllmStatus === 'online' ? ['#00FFFF', '#0099CC'] : ['#333', '#222']}
                  style={styles.cpuIcon}
                >
                   {vllmWarming ? (
                     <ActivityIndicator size="small" color="#0A0A0A" />
                   ) : (
                                         <Cpu 
                                           size={28} 
                                           color={vllmStatus === 'online' ? '#0A0A0A' : '#71717A'} 
                                         />                   )}
                </LinearGradient>
                <View style={{ flex: 1, marginLeft: 16 }}>
                   <Text style={styles.cpuTitle}>AI Core System</Text>
                   <View style={styles.statusRow}>
                      <View style={[styles.statusDot, { backgroundColor: vllmStatus === 'online' ? '#00FFFF' : '#ff4444' }]} />
                      <Text style={[styles.statusText, { color: vllmStatus === 'online' ? '#00FFFF' : '#ff4444' }]}>
                         {vllmStatus.toUpperCase()}
                      </Text>
                   </View>
                </View>
                {vllmStatus === 'offline' && !vllmWarming && (
                  <TouchableOpacity onPress={handleWarmup} style={styles.warmupButton}>
                     <Text style={styles.warmupText}>ACTIVATE</Text>
                  </TouchableOpacity>
                )}
             </View>
          </MobileCard>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionIndicator} />
          <Text style={styles.sectionTitle}>Available Tools</Text>
        </View>

        <View style={styles.toolsGrid}>
           {AI_TOOLS.map((tool) => (
             <MobileCard 
               key={tool.id} 
               onClick={() => tool.id === 'chat' ? setView('chat') : null}
               style={styles.toolCard}
             >
                <View style={styles.toolContent}>
                   <View style={[styles.toolIcon, { backgroundColor: `${tool.color}20`, borderColor: `${tool.color}40` }]}>
                      <tool.Icon size={24} color={tool.color}  />
                   </View>
                   <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.toolName}>{tool.name}</Text>
                      <Text style={styles.toolDesc}>{tool.description}</Text>
                   </View>
                   <ChevronRight size={20} color={theme.colors.accentPrimary}  />
                </View>
             </MobileCard>
           ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.bgPrimary,
  },
  scrollContainer: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  cpuCard: {
    padding: 0,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
    marginBottom: spacing.lg,
    borderRadius: 24,
  },
  cpuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cpuIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  cpuTitle: {
    fontSize: theme.typography.heading2,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.heading,
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  warmupButton: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  warmupText: {
    color: theme.colors.accentPrimary,
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingLeft: 4,
  },
  sectionIndicator: {
    height: 1,
    width: 40,
    backgroundColor: 'rgba(0, 255, 255, 0.4)',
  },
  sectionTitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.caption,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  toolsGrid: {
    gap: 12,
  },
  toolCard: {
    marginBottom: 0,
    borderRadius: 20,
  },
  toolContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  toolIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolName: {
    fontSize: theme.typography.heading3,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.heading,
  },
  toolDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  // Chat Styles
  chatScroll: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  messageRow: {
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  messageUser: {
    justifyContent: 'flex-end',
  },
  messageAI: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bubble: {
    maxWidth: '85%',
    padding: 16,
    borderRadius: 22,
  },
  bubbleUser: {
    backgroundColor: theme.colors.accentPrimary,
    borderBottomRightRadius: 4,
  },
  bubbleAI: {
    backgroundColor: theme.colors.overlay,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  bubbleTextUser: {
    color: '#000',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },
  messageTime: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.3)',
    marginTop: 8,
    textAlign: 'right',
  },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    marginTop: 16,
    fontWeight: '600',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
    gap: 10,
  },
  typingText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 10, 10, 0.8)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    margin: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
  },
  input: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 15,
    maxHeight: 120,
    paddingTop: 0,
  },
  sendButton: {
    marginLeft: 12,
  },
  sendButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
});
