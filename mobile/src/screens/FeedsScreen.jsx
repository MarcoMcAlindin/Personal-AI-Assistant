// VibeOS Mobile -- Feeds Screen
import React, { useState, useEffect } from 'react';
import {
  View, FlatList, TouchableOpacity, Linking, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../components/Themed';
import { palette, spacing } from '../theme';
import { fetchTechFeeds, fetchConcerts } from '../services/api';

export default function FeedsScreen() {
  const [tab, setTab] = useState('tech');
  const [techArticles, setTechArticles] = useState([]);
  const [concerts, setConcerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [techData, concertData] = await Promise.all([
        fetchTechFeeds().catch(() => []),
        fetchConcerts().catch(() => []),
      ]);
      setTechArticles(Array.isArray(techData) ? techData : []);
      setConcerts(Array.isArray(concertData) ? concertData : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const renderTechItem = ({ item }) => (
    <TouchableOpacity onPress={() => item.url && Linking.openURL(item.url)}>
      <View style={{
        paddingVertical: spacing.md, paddingHorizontal: spacing.md,
        borderBottomWidth: 1, borderBottomColor: palette.borderColor,
      }}>
        <Text style={{ fontSize: 15, fontWeight: '600', marginBottom: 4 }}>{item.title}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: palette.accentPrimary, fontSize: 12 }}>{item.source}</Text>
          <Text style={{ color: palette.textMuted, fontSize: 12 }}>{item.time || item.published_at || ''}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderConcertItem = ({ item }) => (
    <View style={{
      paddingVertical: spacing.md, paddingHorizontal: spacing.md,
      borderBottomWidth: 1, borderBottomColor: palette.borderColor,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: spacing.md }}>
          <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 4 }}>{item.artist}</Text>
          <Text style={{ color: palette.textMuted, fontSize: 13 }}>
            {'\uD83D\uDCCD'} {item.venue}, {item.city}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <Text style={{ color: palette.textMuted, fontSize: 12 }}>{'\uD83D\uDCC5'} {item.date}</Text>
            {item.genre && (
              <View style={{
                backgroundColor: palette.accentSecondary, borderRadius: 4,
                paddingHorizontal: 8, paddingVertical: 2, marginLeft: spacing.sm,
              }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>{item.genre}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {item.price && (
            <Text style={{ color: palette.accentPrimary, fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>
              {item.price}
            </Text>
          )}
          {item.ticket_url && (
            <TouchableOpacity
              onPress={() => Linking.openURL(item.ticket_url)}
              style={{
                backgroundColor: palette.accentSecondary, borderRadius: 6,
                paddingHorizontal: 12, paddingVertical: 6,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Tickets</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.bgPrimary, justifyContent: 'center', alignItems: 'center' }} edges={['top']}>
        <ActivityIndicator size="large" color={palette.accentPrimary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bgPrimary }} edges={['top']}>
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: spacing.md }}>Feeds</Text>

        <View style={{ flexDirection: 'row', marginBottom: spacing.sm }}>
          {['tech', 'concerts'].map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={{
                paddingVertical: spacing.sm, paddingHorizontal: spacing.lg,
                backgroundColor: tab === t ? palette.accentPrimary : 'transparent',
                borderRadius: 8, marginRight: spacing.sm,
                borderWidth: tab === t ? 0 : 1,
                borderColor: palette.borderColor,
              }}
            >
              <Text style={{
                color: tab === t ? '#000' : palette.textPrimary,
                fontWeight: '600', fontSize: 13, textTransform: 'capitalize',
              }}>
                {t === 'tech' ? 'Tech Feed' : 'Concerts'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'concerts' && concerts.length > 0 && (
          <Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: spacing.sm }}>
            Scotland Concerts {'\u2022'} Metal {'\u2022'} Rock {'\u2022'} Hard Rock
          </Text>
        )}
      </View>

      <FlatList
        data={tab === 'tech' ? techArticles : concerts}
        renderItem={tab === 'tech' ? renderTechItem : renderConcertItem}
        keyExtractor={(item, i) => item.id?.toString() || i.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accentPrimary} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: spacing.xl }}>
            <Text style={{ color: palette.textMuted }}>No {tab} feeds available</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
