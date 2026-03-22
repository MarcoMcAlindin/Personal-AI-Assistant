import { Mail, Shield, X, Plus, Search } from 'lucide-react-native';
import React, { useState, useEffect, useRef } from 'react';
import {
  View, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl,
  StyleSheet, Platform, Modal, TextInput, Pressable, Text as RNText,
  KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../components/Themed';
import { palette, spacing } from '../theme';
import { fetchInbox, searchContacts, getWhitelist, addToWhitelist, removeFromWhitelist } from '../services/api';
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

  // Whitelist modal state
  const [showWhitelistModal, setShowWhitelistModal] = useState(false);
  const [whitelist, setWhitelist] = useState([]);
  const [whitelistLoading, setWhitelistLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [addEmail, setAddEmail] = useState('');
  const [addName, setAddName] = useState('');
  const [addingEntry, setAddingEntry] = useState(false);
  const [addError, setAddError] = useState(null);
  const debounceRef = useRef(null);

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

  const loadWhitelist = async () => {
    setWhitelistLoading(true);
    try {
      const entries = await getWhitelist();
      setWhitelist(entries);
    } catch {
      setWhitelist([]);
    } finally {
      setWhitelistLoading(false);
    }
  };

  const openWhitelistModal = () => {
    setShowWhitelistModal(true);
    loadWhitelist();
  };

  // Debounced contact search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchContacts(searchQuery);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  const handleSuggestionSelect = (contact) => {
    setAddEmail(contact.email);
    setAddName(contact.name);
    setSearchQuery(`${contact.name} <${contact.email}>`);
    setSuggestions([]);
  };

  const handleAddToWhitelist = async () => {
    if (!addEmail.trim()) return;
    setAddingEntry(true);
    setAddError(null);
    try {
      await addToWhitelist(addEmail.trim(), addName.trim());
      await loadWhitelist();
      setAddEmail('');
      setAddName('');
      setSearchQuery('');
      setSuggestions([]);
    } catch {
      setAddError('Failed to add entry. Please try again.');
    } finally {
      setAddingEntry(false);
    }
  };

  const handleRemoveFromWhitelist = async (id) => {
    try {
      await removeFromWhitelist(id);
      setWhitelist(prev => prev.filter(e => e.id !== id));
    } catch {
      // Silently fail -- user sees entry still present
    }
  };

  const unreadCount = emails.filter(e => !e.is_read).length;

  const renderItem = ({ item }) => {
    const isUnread = !item.is_read;
    const accentColor = isUnread ? palette.accentPrimary : palette.textMuted;

    return (
      <MobileCard
        key={item.id}
        style={[styles.emailCard, isUnread && styles.unreadCard]}
        onClick={() => {}}
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
      <View style={styles.headerRow2}>
        <MobileHeader
          title="Email"
          subtitle={unreadCount > 0 ? `${unreadCount} UNREAD MESSAGES` : "INBOX IS CLEAR"}
        />
        <TouchableOpacity onPress={openWhitelistModal} style={styles.whitelistBtn}>
          <Shield size={18} color={palette.accentPrimary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={emails}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accentPrimary} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Mail size={40} color="rgba(0, 255, 255, 0.2)" />
            </View>
            <Text style={styles.emptyTitle}>Secure Inbox Cleared</Text>
            <Text style={styles.emptyText}>All whitelisted communications synced.</Text>
          </View>
        }
      />

      {/* Whitelist bottom sheet modal */}
      <Modal
        visible={showWhitelistModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowWhitelistModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowWhitelistModal(false)}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalSheet}
        >
          {/* Handle bar */}
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleRow}>
              <Shield size={16} color={palette.accentPrimary} />
              <RNText style={styles.sheetTitle}>Whitelist</RNText>
            </View>
            <TouchableOpacity onPress={() => setShowWhitelistModal(false)}>
              <X size={18} color={palette.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Search input */}
          <View style={styles.searchRow}>
            <Search size={14} color={palette.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search contacts or type email..."
              placeholderTextColor={palette.textMuted}
              value={searchQuery}
              onChangeText={text => {
                setSearchQuery(text);
                setAddEmail(text);
                setAddName('');
              }}
            />
          </View>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <View style={styles.suggestionsBox}>
              {suggestions.map((contact, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.suggestionItem}
                  onPress={() => handleSuggestionSelect(contact)}
                >
                  <RNText style={styles.suggestionName}>{contact.name || contact.email}</RNText>
                  {contact.name ? <RNText style={styles.suggestionEmail}>{contact.email}</RNText> : null}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Add button */}
          <TouchableOpacity
            onPress={handleAddToWhitelist}
            disabled={!addEmail.trim() || addingEntry}
            style={[styles.addBtn, (!addEmail.trim() || addingEntry) && styles.addBtnDisabled]}
          >
            <LinearGradient
              colors={['#00FFFF', '#0099CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addBtnGradient}
            >
              <Plus size={16} color="#0A0A0A" />
              <RNText style={styles.addBtnText}>{addingEntry ? 'Adding...' : 'Add to whitelist'}</RNText>
            </LinearGradient>
          </TouchableOpacity>

          {addError ? <RNText style={styles.errorText}>{addError}</RNText> : null}

          {/* Whitelist entries */}
          <RNText style={styles.sectionLabel}>APPROVED SENDERS</RNText>

          {whitelistLoading ? (
            <ActivityIndicator color={palette.accentPrimary} style={{ marginTop: 16 }} />
          ) : (
            <ScrollView style={styles.whitelistScroll} keyboardShouldPersistTaps="handled">
              {whitelist.length === 0 ? (
                <RNText style={styles.emptyListText}>No entries yet</RNText>
              ) : (
                whitelist.map(entry => (
                  <View key={entry.id} style={styles.whitelistChip}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      {entry.contact_name ? (
                        <RNText style={styles.chipName} numberOfLines={1}>{entry.contact_name}</RNText>
                      ) : null}
                      <RNText style={styles.chipEmail} numberOfLines={1}>{entry.email_address}</RNText>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveFromWhitelist(entry.id)} style={styles.removeBtn}>
                      <X size={14} color={palette.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bgPrimary,
  },
  headerRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: spacing.md,
  },
  whitelistBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
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
  // Modal / bottom sheet
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    backgroundColor: '#0D0D12',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '75%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetTitle: {
    color: '#DAE2FD',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#DAE2FD',
    fontSize: 14,
    paddingVertical: 10,
  },
  suggestionsBox: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
    borderRadius: 10,
    marginBottom: 8,
    maxHeight: 140,
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 255, 0.08)',
  },
  suggestionName: {
    color: '#DAE2FD',
    fontSize: 13,
    fontWeight: '700',
  },
  suggestionEmail: {
    color: palette.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  addBtn: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
  },
  addBtnDisabled: {
    opacity: 0.4,
  },
  addBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  addBtnText: {
    color: '#0A0A0A',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  errorText: {
    color: '#f87171',
    fontSize: 12,
    marginBottom: 8,
  },
  sectionLabel: {
    color: palette.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 10,
    marginTop: 4,
  },
  whitelistScroll: {
    flex: 1,
  },
  emptyListText: {
    color: palette.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingTop: 16,
  },
  whitelistChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  chipName: {
    color: '#DAE2FD',
    fontSize: 12,
    fontWeight: '700',
  },
  chipEmail: {
    color: palette.textMuted,
    fontSize: 11,
  },
  removeBtn: {
    padding: 4,
    marginLeft: 8,
  },
});
