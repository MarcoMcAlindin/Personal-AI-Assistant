import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { palette, spacing } from '../theme';
import { MobileHeader } from '../components/MobileHeader';
import { MobileCard } from '../components/MobileCard';
import { Text } from '../components/Themed';
import { 
  Briefcase, 
  DollarSign, 
  Newspaper, 
  Heart, 
  Mail, 
  Calendar, 
  CheckSquare, 
  Cpu, 
  Zap,
  TrendingUp,
  Activity,
  ChevronRight
} from 'lucide-react-native';

const QUICK_STATS = [
  { label: "Active Jobs", value: "12", trend: "+3", Icon: Briefcase, color: "#00FFFF" },
  { label: "Balance", value: "$5,432", trend: "+$210", Icon: DollarSign, color: "#00FF88" },
  { label: "Unread", value: "8", trend: "-2", Icon: Mail, color: "#FF6B6B" },
  { label: "Tasks", value: "15", trend: "+5", Icon: CheckSquare, color: "#A855F7" },
];

const MAIN_FEATURES = [
  { 
    title: "Jobs", 
    Icon: Briefcase, 
    description: "AI-powered job search",
    count: "12 active campaigns",
    path: "Jobs",
    gradient: ['rgba(0, 255, 255, 0.2)', 'rgba(0, 153, 204, 0.2)'],
    iconColor: "#00FFFF"
  },
  { 
    title: "Money Hub", 
    Icon: DollarSign, 
    description: "Track finances & spending",
    count: "$5,432 balance",
    path: "Money",
    gradient: ['rgba(16, 185, 129, 0.2)', 'rgba(34, 197, 94, 0.2)'],
    iconColor: "#10B981"
  },
  { 
    title: "News Feed", 
    Icon: Newspaper, 
    description: "Curated tech updates",
    count: "24 new articles",
    path: "Feeds",
    gradient: ['rgba(59, 130, 246, 0.2)', 'rgba(99, 102, 241, 0.2)'],
    iconColor: "#3B82F6"
  },
  { 
    title: "Health", 
    Icon: Heart, 
    description: "Wellness tracking",
    count: "8,432 steps today",
    path: "Health",
    gradient: ['rgba(239, 68, 68, 0.2)', 'rgba(236, 72, 153, 0.2)'],
    iconColor: "#EF4444"
  },
  { 
    title: "Email", 
    Icon: Mail, 
    description: "Inbox management",
    count: "8 unread messages",
    path: "Mail",
    gradient: ['rgba(168, 85, 247, 0.2)', 'rgba(139, 92, 246, 0.2)'],
    iconColor: "#A855F7"
  },
  { 
    title: "Calendar", 
    Icon: Calendar, 
    description: "Schedule & events",
    count: "3 meetings today",
    path: "Plan",
    gradient: ['rgba(249, 115, 22, 0.2)', 'rgba(245, 158, 11, 0.2)'],
    iconColor: "#F97316"
  },
  { 
    title: "Todo List", 
    Icon: CheckSquare, 
    description: "Task management",
    count: "15 pending tasks",
    path: "Plan",
    gradient: ['rgba(6, 182, 212, 0.2)', 'rgba(20, 184, 166, 0.2)'],
    iconColor: "#06B6D4"
  },
  { 
    title: "AI Tools", 
    Icon: Cpu, 
    description: "AI orchestration hub",
    count: "8 AI functions",
    path: "AI",
    gradient: ['rgba(0, 255, 255, 0.2)', 'rgba(0, 153, 204, 0.2)'],
    iconColor: "#00FFFF"
  },
  { 
    title: "Internet Speed", 
    Icon: Zap, 
    description: "Network monitoring",
    count: "125 Mbps",
    path: "Home", // placeholder
    gradient: ['rgba(234, 179, 8, 0.2)', 'rgba(249, 115, 22, 0.2)'],
    iconColor: "#EAB308"
  },
];

export default function DashboardScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <MobileHeader title="Super Cyan" subtitle="AI Orchestration Platform" />
      
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          {QUICK_STATS.map((stat, idx) => {
            const IconComponent = stat.Icon;
            return (
              <View key={idx} style={styles.statCardWrapper}>
                <MobileCard style={styles.statCard}>
                  <View style={styles.statHeader}>
                    <View style={[styles.statIconContainer, { backgroundColor: `${stat.color}20`, borderColor: `${stat.color}40` }]}>
                      <IconComponent size={20} color={stat.color} />
                    </View>
                    <View style={styles.trendBadge}>
                      <TrendingUp size={12} color="#4ADE80" />
                      <Text style={styles.trendText}>{stat.trend}</Text>
                    </View>
                  </View>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </MobileCard>
              </View>
            );
          })}
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <LinearGradient
            colors={['#00FFFF', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.sectionIndicator}
          />
          <Text style={styles.sectionTitle}>QUICK ACCESS</Text>
        </View>

        {/* Main Features Grid */}
        <View style={styles.featuresGrid}>
          {MAIN_FEATURES.map((feature, idx) => {
            const IconComponent = feature.Icon;
            return (
              <MobileCard
                key={idx}
                style={styles.featureCard}
                onClick={() => {
                  if (feature.path && feature.path !== "Home") {
                    navigation.navigate(feature.path);
                  }
                }}
              >
                <View style={styles.featureContent}>
                  <LinearGradient
                    colors={feature.gradient}
                    style={[styles.featureIconContainer, { borderColor: `${feature.iconColor}40` }]}
                  >
                    <IconComponent size={28} color={feature.iconColor} />
                  </LinearGradient>
                  <View style={styles.featureTextContainer}>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    <Text style={styles.featureDesc}>{feature.description}</Text>
                    <View style={styles.featureCountRow}>
                      <Activity size={12} color="#00FFFF" />
                      <Text style={styles.featureCount}>{feature.count}</Text>
                    </View>
                  </View>
                  <View style={styles.featureChevron}>
                    <ChevronRight size={16} color="#00FFFF" />
                  </View>
                </View>
              </MobileCard>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');
const STAT_CARD_WIDTH = (width - spacing.md * 2 - spacing.sm) / 2;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bgPrimary,
  },
  scrollContainer: {
    padding: spacing.md,
    paddingBottom: 100, // Bottom padding for TabBar
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCardWrapper: {
    width: STAT_CARD_WIDTH,
  },
  statCard: {
    padding: spacing.md,
    marginVertical: 0,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.3)',
    gap: 4,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4ADE80',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: palette.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: palette.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  sectionIndicator: {
    height: 4,
    width: 32,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.textSecondary,
    letterSpacing: 2,
  },
  featuresGrid: {
    gap: spacing.sm,
  },
  featureCard: {
    padding: 0,
    marginVertical: 0,
  },
  featureContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: palette.textPrimary,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    color: palette.textSecondary,
    marginBottom: 4,
  },
  featureCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featureCount: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.accentPrimary,
  },
  featureChevron: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});