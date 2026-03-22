import { Mail } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import {
  View, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../components/Themed';
import { palette, spacing } from '../theme';
import { fetchInbox } from '../services/api';
import { MobileHeader } from '../components/MobileHeader';
import { MobileCard } from '../components/MobileCard';

function formatTime(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
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

  const unreadCount = emails.filter(e => !e.is_read).length;

  const renderItem = ({ item }) => {
    const isUnread = !item.is_read;
    const accentColor = isUnread ? palette.accentPrimary : palette.textMuted;

    return (
      <MobileCard 
        key={item.id} 
        style={[styles.emailCard, isUnread && styles.unreadCard]}
        onClick={() => {}} // Handle email view
      >
        <View style={styles.emailContent}>
          <View style={[styles.iconWrapper, isUnread ? styles.iconUnread : styles.iconRead]}>
            {isUnread ? (
              <Mail size={20} color={palette.accentPrimary} />
            ) : (
              <Mail size={20} color={palette.textMuted} />
            )}
          </View>
          
          <View style={{ flex: 1, marginLeft: 16 }}>
            <View style={styles.headerRow}>
              <Text style={[styles.sender, isUnread && styles.textWhite]} numberOfLines={1}>
                {item.from || 'Unknown Sender'}
              </Text>
              <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
            </View>
            
            <Text style={[styles.subject, isUnread && styles.textWhite]} numberOfLines={1}>
              {item.subject || '(No Subject)'}
            </Text>
            
            <Text style={styles.preview} numberOfLines={1}>
              {item.body || 'No content preview available...'}
            </Text>
          </View>

          {isUnread && (
            <View style={styles.unreadIndicator}>
              <LinearGradient
                colors={['#00FFFF', '#0099CC']}
                style={styles.indicatorPulse}
              />
            </View>
          )}
        </View>
      </MobileCard>
    );
  };

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={palette.accentPrimary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <MobileHeader 
        title="Email" 
        subtitle={unreadCount > 0 ? `${unreadCount} UNREAD MESSAGES` : "INBOX IS CLEAR"} 
      />
      
      <FlatList
        data={emails}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accentPrimary} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
               <Mail size={40} color="rgba(0, 255, 255, 0.2)"  />
            </View>
            <Text style={styles.emptyTitle}>Secure Inbox Cleared</Text>
            <Text style={styles.emptyText}>All whitelisted communications synced.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bgPrimary,
  },
  listContainer: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  emailCard: {
    marginBottom: 16,
    borderRadius: 24,
  },
  unreadCard: {
    borderColor: 'rgba(0, 255, 255, 0.3)',
    borderWidth: 1,
  },
  emailContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 2,
  },
  iconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconUnread: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderColor: 'rgba(0, 255, 255, 0.2)',
  },
  iconRead: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sender: {
    fontSize: 13,
    fontWeight: '900',
    color: palette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 11,
    color: palette.textMuted,
    fontWeight: '600',
  },
  subject: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.textSecondary,
    marginBottom: 4,
  },
  preview: {
    fontSize: 13,
    color: palette.textMuted,
    fontWeight: '500',
  },
  textWhite: {
    color: '#FFF',
  },
  unreadIndicator: {
    marginLeft: 12,
  },
  indicatorPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 120,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.05)',
    marginBottom: 24,
  },
  emptyTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  emptyText: {
    color: palette.textMuted,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
});
