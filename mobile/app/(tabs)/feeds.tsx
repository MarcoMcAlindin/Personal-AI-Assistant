import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Linking, 
  ActivityIndicator,
  SafeAreaView 
} from 'react-native';
import { palette, spacing } from '../../src/theme';
import { feedService } from '../../src/services/feedService';
import { TechArticle, Concert } from '../../src/types/feeds';
import { Ionicons } from '@expo/vector-icons';

const FeedsScreen = () => {
  const [activeTab, setActiveTab] = useState<'tech' | 'concerts'>('tech');
  const [techArticles, setTechArticles] = useState<TechArticle[]>([]);
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'tech') {
        const data = await feedService.getTechFeeds();
        setTechArticles(data);
      } else {
        const data = await feedService.getConcertFeeds();
        setConcerts(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderTechItem = ({ item }: { item: TechArticle }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => Linking.openURL(item.url)}
    >
      <View style={styles.accentLine} />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.sourceTag}>{item.source}</Text>
          <Text style={styles.timeText}>{item.time || item.published_at}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
    </TouchableOpacity>
  );

  const renderConcertItem = ({ item }: { item: Concert }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => Linking.openURL(item.ticket_url)}
    >
      <View style={[styles.accentLine, { backgroundColor: palette.accentSecondary }]} />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.artist}</Text>
        <Text style={styles.venueText}>{item.venue}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.cityText}>{item.city}</Text>
          <Text style={styles.dateText}>{item.date}</Text>
        </View>
        {item.genre && (
          <View style={styles.genreBadge}>
            <Text style={styles.genreText}>{item.genre}</Text>
          </View>
        )}
      </View>
      <Ionicons name="ticket-outline" size={20} color={palette.accentSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Vibe Feeds</Text>
        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'tech' && styles.activeTab]} 
            onPress={() => setActiveTab('tech')}
          >
            <Text style={[styles.tabText, activeTab === 'tech' && styles.activeTabText]}>Tech & AI</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'concerts' && styles.activeTab]} 
            onPress={() => setActiveTab('concerts')}
          >
            <Text style={[styles.tabText, activeTab === 'concerts' && styles.activeTabText]}>Concerts</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={palette.accentPrimary} size="large" />
          <Text style={styles.loadingText}>Syncing signals...</Text>
        </View>
      ) : (
        <FlatList
          data={activeTab === 'tech' ? techArticles : concerts}
          renderItem={activeTab === 'tech' ? renderTechItem : renderConcertItem}
          keyExtractor={(item, index) => (item.id || index).toString()}
          contentContainerStyle={styles.listPadding}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bgPrimary,
  },
  header: {
    padding: spacing.md,
    backgroundColor: palette.bgPrimary,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: palette.accentPrimary,
    marginBottom: spacing.md,
    textShadowColor: 'rgba(0, 212, 255, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: palette.bgSecondary,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: palette.borderColor,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: palette.accentPrimary,
  },
  tabText: {
    color: palette.textMuted,
    fontWeight: '600',
    fontSize: 14,
  },
  activeTabText: {
    color: '#000000',
  },
  listPadding: {
    padding: spacing.md,
    paddingTop: 0,
  },
  card: {
    backgroundColor: palette.bgCard,
    borderRadius: 12,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.borderColor,
  },
  accentLine: {
    width: 4,
    height: '100%',
    backgroundColor: palette.accentPrimary,
  },
  cardContent: {
    flex: 1,
    padding: spacing.md,
  },
  cardTitle: {
    color: palette.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sourceTag: {
    color: palette.accentPrimary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  timeText: {
    color: palette.textMuted,
    fontSize: 12,
  },
  venueText: {
    color: palette.textPrimary,
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 4,
  },
  cityText: {
    color: palette.accentPrimary,
    fontSize: 12,
  },
  dateText: {
    color: palette.textMuted,
    fontSize: 12,
  },
  genreBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(123, 94, 167, 0.15)',
    borderWidth: 1,
    borderColor: palette.accentSecondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 8,
  },
  genreText: {
    color: palette.accentSecondary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: palette.textMuted,
    fontSize: 14,
  }
});

export default FeedsScreen;
