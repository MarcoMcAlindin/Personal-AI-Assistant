import React, { useState, useEffect } from 'react';
import {
  View, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Themed';
import { palette, spacing } from '../theme';
import { fetchInbox } from '../services/api';

function formatTime(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
}

export default function EmailScreen() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const data = await fetchInbox();
      setEmails(data.emails || []);
    } catch {
      setEmails([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const whitelistCount = emails.filter(e => e.status === 'whitelisted').length;

  const renderItem = ({ item }) => {
    const isImportant = !item.is_read;
    return (
      <View style={{
        paddingVertical: spacing.md, paddingHorizontal: spacing.md,
        borderBottomWidth: 1, borderBottomColor: palette.borderColor,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <Ionicons 
            name={isImportant ? "star" : "star-outline"} 
            size={18} 
            color={isImportant ? "#FFD700" : palette.textMuted} 
            style={{ marginRight: spacing.md, marginTop: 2 }}
          />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <Text style={{ fontSize: 15, fontWeight: '600' }}>{item.from}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="time-outline" size={12} color={palette.textMuted} style={{ marginRight: 4 }} />
                <Text style={{ color: palette.textMuted, fontSize: 11 }}>{formatTime(item.timestamp)}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 2 }} numberOfLines={1}>
              {item.subject}
            </Text>
            <Text style={{ color: palette.textMuted, fontSize: 13 }} numberOfLines={1}>
              {item.body}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.bgPrimary, justifyContent: 'center', alignItems: 'center' }} edges={['top']}>
        <ActivityIndicator size="large" color={palette.accentPrimary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bgPrimary }} edges={['top']}>
      <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: palette.bgCard, alignItems: 'center', justifyContent: 'center',
              marginRight: spacing.md, borderWidth: 1, borderColor: palette.accentPrimary,
            }}>
              <Ionicons name="mail" size={20} color={palette.accentPrimary} />
            </View>
            <View>
              <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Inbox</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <Ionicons name="shield-checkmark-outline" size={12} color={palette.accentPrimary} style={{ marginRight: 4 }} />
                <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                  Whitelist active {'\u2022'} {whitelistCount} approved senders
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={{
              backgroundColor: palette.accentPrimary, borderRadius: 8,
              paddingHorizontal: 16, paddingVertical: 8,
            }}
            onPress={() => Alert.alert('Coming Soon', 'Compose email feature is under development.')}
          >
            <Text style={{ color: '#000', fontWeight: '600', fontSize: 13 }}>Compose</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={emails}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accentPrimary} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: spacing.xl }}>
            <Text style={{ color: palette.textMuted }}>No emails</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
