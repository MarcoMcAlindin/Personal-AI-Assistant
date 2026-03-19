// VibeOS Mobile -- AI Chat Screen
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, TextInput, FlatList, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../components/Themed';
import { palette, spacing } from '../theme';
import { sendChat, fetchVllmStatus, triggerVllmWarmup } from '../services/api';

const VLLM_CHIP_COLORS = {
  offline: '#ef4444',
  warming: '#eab308',
  online: '#4ade80',
};

const VLLM_CHIP_LABELS = {
  offline: 'AI Offline',
  warming: 'AI Warming Up...',
  online: 'AI Online',
};

function VllmStatusChip({ status, onWarmup, warming }) {
  const color = VLLM_CHIP_COLORS[status] || '#ef4444';
  const label = VLLM_CHIP_LABELS[status] || 'AI Offline';
  const tappable = status === 'offline' && !warming;

  return (
    <TouchableOpacity
      onPress={tappable ? onWarmup : undefined}
      disabled={!tappable}
      activeOpacity={tappable ? 0.7 : 1}
      style={{
        flexDirection: 'row', alignItems: 'center',
        alignSelf: 'center',
        backgroundColor: `${color}18`,
        borderRadius: 20, borderWidth: 1,
        borderColor: `${color}55`,
        paddingHorizontal: spacing.md, paddingVertical: 5,
        marginBottom: spacing.sm,
      }}
    >
      {status === 'warming' ? (
        <ActivityIndicator size="small" color={color} style={{ marginRight: 6 }} />
      ) : (
        <View style={{
          width: 7, height: 7, borderRadius: 4,
          backgroundColor: color, marginRight: 6,
        }} />
      )}
      <Text style={{ color, fontSize: 12, fontWeight: '600' }}>{label}</Text>
      {tappable && (
        <Text style={{ color: `${color}99`, fontSize: 11, marginLeft: 6 }}>Tap to wake</Text>
      )}
    </TouchableOpacity>
  );
}

function ChatHeader() {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: spacing.md, paddingHorizontal: spacing.sm,
    }}>
      <View style={{
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: palette.accentSecondary, alignItems: 'center', justifyContent: 'center',
        marginRight: spacing.md,
      }}>
        <Text style={{ fontSize: 18 }}>{'\u2728'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Qwen2.5 Assistant</Text>
        <Text style={{ color: palette.textMuted, fontSize: 12 }}>10-day RAG context {'\u2022'} 3 pinned memories</Text>
      </View>
      <View style={{ flexDirection: 'row' }}>
        <TouchableOpacity style={{
          backgroundColor: palette.accentPrimary, borderRadius: 8,
          paddingHorizontal: 10, paddingVertical: 6, marginRight: spacing.xs,
        }}>
          <Text style={{ color: '#000', fontSize: 12, fontWeight: '600' }}>{'\uD83D\uDCBE'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{
          backgroundColor: palette.bgCard, borderRadius: 8,
          paddingHorizontal: 10, paddingVertical: 6,
          borderWidth: 1, borderColor: palette.borderColor,
        }}>
          <Text style={{ fontSize: 12 }}>{'\uD83D\uDD17'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Timestamp({ time }) {
  return (
    <Text style={{ color: palette.textMuted, fontSize: 10, textAlign: 'center', marginVertical: spacing.xs }}>
      {time}
    </Text>
  );
}

export default function ChatScreen() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef(null);
  const [vllmStatus, setVllmStatus] = useState('offline');
  const [vllmWarming, setVllmWarming] = useState(false);

  const pollVllmStatus = useCallback(async () => {
    try {
      const { status } = await fetchVllmStatus();
      setVllmStatus(status);
    } catch {
      setVllmStatus('offline');
    }
  }, []);

  useEffect(() => {
    pollVllmStatus();
  }, [pollVllmStatus]);

  useEffect(() => {
    let interval = null;
    if (vllmStatus === 'warming') {
      interval = setInterval(pollVllmStatus, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pollVllmStatus, vllmStatus]);

  const handleWarmup = async () => {
    setVllmWarming(true);
    try {
      await triggerVllmWarmup();
      setVllmStatus('warming');
    } catch {
      // poll will recover
    } finally {
      setVllmWarming(false);
    }
  };

  const getTimestamp = () => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const time = getTimestamp();
    const userMsg = { id: Date.now().toString(), role: 'user', content: text, time };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const data = await sendChat(text);
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'No response received.',
        time: getTimestamp(),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: `Error: ${err.message}`, time: getTimestamp() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View>
        <View style={{
          flexDirection: 'row',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          alignItems: 'flex-end',
          marginVertical: spacing.xs,
          paddingHorizontal: spacing.xs,
        }}>
          {!isUser && (
            <View style={{
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: palette.accentSecondary, alignItems: 'center', justifyContent: 'center',
              marginRight: spacing.sm,
            }}>
              <Text style={{ fontSize: 12 }}>{'\u2728'}</Text>
            </View>
          )}
          <View style={{
            backgroundColor: isUser ? palette.accentPrimary : palette.bgCard,
            borderRadius: 16,
            borderBottomRightRadius: isUser ? 4 : 16,
            borderBottomLeftRadius: isUser ? 16 : 4,
            padding: spacing.md,
            maxWidth: '75%',
            borderWidth: isUser ? 0 : 1,
            borderColor: palette.borderColor,
          }}>
            <Text style={{ color: isUser ? '#000' : palette.textPrimary, fontSize: 14, lineHeight: 21 }}>
              {item.content}
            </Text>
          </View>
          {isUser && (
            <View style={{
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: palette.accentPrimary, alignItems: 'center', justifyContent: 'center',
              marginLeft: spacing.sm,
            }}>
              <Text style={{ color: '#000', fontSize: 12, fontWeight: 'bold' }}>M</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: isUser ? 'flex-end' : 'flex-start', alignItems: 'center', paddingHorizontal: spacing.xs }}>
          <Timestamp time={item.time} />
          {!isUser && (
            <View style={{ flexDirection: 'row', marginLeft: spacing.sm }}>
              <TouchableOpacity style={{ marginRight: spacing.xs }}>
                <Text style={{ color: palette.textMuted, fontSize: 12 }}>{'\uD83D\uDCBE'}</Text>
              </TouchableOpacity>
              <TouchableOpacity>
                <Text style={{ color: palette.textMuted, fontSize: 12 }}>{'\uD83D\uDD12'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bgPrimary }} edges={['top']}>
      <ChatHeader />
      <VllmStatusChip status={vllmStatus} onWarmup={handleWarmup} warming={vllmWarming} />

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.md,
          flexGrow: 1,
          justifyContent: messages.length ? 'flex-end' : 'center',
        }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: palette.textMuted, fontSize: 16 }}>Ask Qwen anything...</Text>
          </View>
        }
      />

      {loading && (
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{
            width: 28, height: 28, borderRadius: 14,
            backgroundColor: palette.accentSecondary, alignItems: 'center', justifyContent: 'center',
            marginRight: spacing.sm,
          }}>
            <Text style={{ fontSize: 12 }}>{'\u2728'}</Text>
          </View>
          <ActivityIndicator color={palette.accentPrimary} size="small" />
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: palette.bgCard, borderRadius: 24,
          borderWidth: 1, borderColor: palette.borderColor,
          paddingHorizontal: spacing.md,
          marginHorizontal: spacing.md, marginBottom: Platform.OS === 'android' ? spacing.md : spacing.sm,
        }}>
          <TextInput
            style={{
              flex: 1, color: palette.textPrimary,
              fontSize: 14, paddingVertical: 14,
            }}
            placeholder="Ask Qwen anything..."
            placeholderTextColor={palette.textMuted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            editable={!loading}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={loading || !input.trim()}
            style={{
              width: 32, height: 32, borderRadius: 16,
              backgroundColor: input.trim() ? palette.accentPrimary : palette.bgSecondary,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ color: input.trim() ? '#000' : palette.textMuted, fontSize: 16 }}>{'\u2191'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
