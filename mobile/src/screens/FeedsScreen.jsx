import { Calendar, ChevronRight, MapPin } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '../components/Themed';
import { palette, spacing } from '../theme';
import { fetchTechFeeds, fetchConcerts } from '../services/api';
import { MobileHeader } from '../components/MobileHeader';
import { MobileCard } from '../components/MobileCard';

export default function FeedsScreen() {
  const [tab, setTab] = useState('tech'); // 'tech' or 'concerts'
  const [techArticles, setTechArticles] = useState([]);
  const [concerts, setConcerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [techData, concertData] = await Promise.all([
        fetchTechFeeds().catch(() => ({ articles: [] })),
        fetchConcerts().catch(() => ({ concerts: [] })),
      ]);
      setTechArticles(Array.isArray(techData?.articles) ? techData.articles : []);
      setConcerts(Array.isArray(concertData?.concerts) ? concertData.concerts : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const renderTechItem = (item, idx) => (
    <MobileCard 
      key={item.id || `tech-${idx}`} 
      onClick={() => item.url && Linking.openURL(item.url)} 
      style={styles.feedCard}
    >
      <View style={styles.metaRow}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{(item.category || 'TECH').toUpperCase()}</Text>
        </View>
        <Text style={styles.feedTime}>{item.time || item.published_at || 'Recently'}</Text>
      </View>
      <Text style={styles.feedTitle} numberOfLines={2}>{item.title}</Text>
      <View style={styles.cardFooter}>
        <View style={styles.sourceInfo}>
          <View style={styles.sourceDot} />
          <Text style={styles.sourceText}>{item.source}</Text>
        </View>
        <TouchableOpacity style={styles.readMore}>
          <ChevronRight size={16} color={palette.accentPrimary}  />
        </TouchableOpacity>
      </View>
    </MobileCard>
  );

  const renderConcertItem = (item, idx) => (
    <MobileCard key={item.id || `concert-${idx}`} style={styles.feedCard}>
      <View style={styles.concertHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.artistName}>{item.artist}</Text>
          <View style={styles.locationRow}>
            <MapPin size={12} color={palette.textMuted}  />
            <Text style={styles.locationText}>{item.venue}, {item.city}</Text>
          </View>
        </View>
        <View style={styles.genreBadge}>
          <Text style={styles.genreText}>{item.genre || 'METAL'}</Text>
        </View>
      </View>
      
      <View style={styles.concertFooter}>
        <View style={styles.dateInfo}>
          <Calendar size={14} color={palette.accentPrimary}  />
          <Text style={styles.dateText}>{item.date}</Text>
        </View>
        {item.ticket_url && (
          <TouchableOpacity 
            onPress={() => Linking.openURL(item.ticket_url)}
            style={styles.ticketButton}
          >
            <Text style={styles.ticketText}>Tickets</Text>
          </TouchableOpacity>
        )}
      </View>
    </MobileCard>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <MobileHeader 
        title="Feeds" 
        subtitle={tab === 'tech' ? "Curated Tech Updates" : "Scottish Metal & Rock"} 
      />
      
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accentPrimary} />}
      >
        {/* Tab Selector */}
        <View style={styles.tabBar}>
          <TouchableOpacity 
            onPress={() => setTab('tech')}
            style={[styles.tab, tab === 'tech' && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === 'tech' && styles.tabTextActive]}>Tech Center</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setTab('concerts')}
            style={[styles.tab, tab === 'concerts' && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === 'concerts' && styles.tabTextActive]}>Concerts</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionIndicator} />
          <Text style={styles.sectionTitle}>
            {tab === 'tech' ? 'Trending Articles' : 'Upcoming Shows'}
          </Text>
        </View>

        <View style={styles.feedsGrid}>
          {tab === 'tech' ? (
            techArticles.length > 0 ? (
              techArticles.map((item, idx) => renderTechItem(item, idx))
            ) : (
              <View style={styles.emptyFeed}>
                <Text style={styles.emptyText}>Updating tech feed...</Text>
              </View>
            )
          ) : (
            concerts.length > 0 ? (
              concerts.map((item, idx) => renderConcertItem(item, idx))
            ) : (
              <View style={styles.emptyFeed}>
                <Text style={styles.emptyText}>No upcoming shows found</Text>
              </View>
            )
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bgPrimary,
  },
  scrollContainer: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: 16,
    padding: 6,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.1)',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: 'rgba(0, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.textSecondary,
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: palette.accentPrimary,
    fontWeight: '900',
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
    color: palette.textSecondary,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  feedsGrid: {
    gap: 16,
  },
  feedCard: {
    marginBottom: 0,
    borderRadius: 24,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  categoryBadge: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
  },
  categoryText: {
    color: palette.accentPrimary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  feedTime: {
    color: palette.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  feedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    lineHeight: 26,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.accentPrimary,
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  sourceText: {
    color: palette.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  readMore: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
  },
  concertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  artistName: {
    fontSize: 19,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 14,
    color: palette.textSecondary,
    fontWeight: '600',
  },
  genreBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  genreText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  concertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 255, 255, 0.1)',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  ticketButton: {
    backgroundColor: 'rgba(0, 255, 255, 0.15)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  ticketText: {
    color: palette.accentPrimary,
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  emptyFeed: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: palette.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
});

