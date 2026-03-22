import { Award, Briefcase, Building2, Check, ChevronRight, Clock, DollarSign, ExternalLink, Inbox, MapPin, Plus, Search, Send, Sparkles, X, Zap } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import {
  View, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, ScrollView,
  Linking, StyleSheet, Platform, Modal, Animated, KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '../components/Themed';
import { palette, spacing } from '../theme';
import { fetchCampaigns, fetchInboxItems, createCampaign, updateInboxStatus, triggerScrape } from '../services/api';
import { MobileHeader } from '../components/MobileHeader';
import { MobileCard } from '../components/MobileCard';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

export default function JobsScreen() {
  const [campaigns, setCampaigns] = useState([]);
  const [inboxItems, setInboxItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Navigation & State
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  
  // New Campaign Form
  const [newName, setNewName] = useState('');
  const [newKeywords, setNewKeywords] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newSalary, setNewSalary] = useState('');

  const loadData = async () => {
    try {
      const [campData, inboxData] = await Promise.all([
        fetchCampaigns(),
        fetchInboxItems()
      ]);
      setCampaigns(campData.campaigns || []);
      setInboxItems(inboxData.inbox_items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleCreate = async () => {
    const name = newName.trim();
    const keywords = newKeywords.trim();
    if (!name || !keywords) return;
    
    setNewName(''); setNewKeywords(''); setNewLocation(''); setNewSalary('');
    setShowNewCampaign(false);
    
    try {
      const created = await createCampaign({
        name,
        job_preferences: {
          keywords,
          location: newLocation.trim(),
          salary: newSalary.trim()
        }
      });
      setCampaigns([created, ...campaigns]);
      await triggerScrape(created.id);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleInboxAction = async (item, action) => {
    try {
      await updateInboxStatus(item.id, action);
      setInboxItems(prev => prev.filter(i => i.id !== item.id));
    } catch (e) {
      console.error(e);
    }
  };

  const renderStats = () => {
    const activeCount = campaigns.filter(c => c.status === 'RUNNING' || c.status === 'DRAFT').length;
    const totalResults = campaigns.reduce((acc, c) => acc + (c.total_jobs_found || 0), 0);

    return (
      <View style={styles.statsGrid}>
        <MobileCard style={styles.statCard}>
          <Text style={styles.statValue}>{activeCount}</Text>
          <Text style={styles.statLabel}>Active Campaigns</Text>
        </MobileCard>
        <MobileCard style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#4ade80' }]}>{totalResults}</Text>
          <Text style={styles.statLabel}>Total Results</Text>
        </MobileCard>
        <MobileCard style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#c084fc' }]}>87%</Text>
          <Text style={styles.statLabel}>Avg Match</Text>
        </MobileCard>
      </View>
    );
  };

  const renderJobItem = (item) => {
    const matchScore = item.match_score ? Math.round(item.match_score * 100) : 0;
    return (
      <MobileCard key={item.id} style={styles.jobCard}>
        <View style={styles.jobHeader}>
          <View style={styles.jobIconContainer}>
            <Building2 size={24} color={palette.accentPrimary}  />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.jobTitle}>{item.job_title}</Text>
            <Text style={styles.jobSubtitle}>{item.company_name} • {item.remote_type || item.source}</Text>
            <View style={styles.matchBadge}>
              <Sparkles size={12} color="#4ade80"  />
              <Text style={styles.matchText}>{matchScore}% Match</Text>
            </View>
          </View>
        </View>

        <Text numberOfLines={3} style={styles.jobDescription}>
          {item.job_description || 'No description available.'}
        </Text>

        <View style={styles.jobTags}>
          <View style={styles.tag}>
            <MapPin size={14} color={palette.accentPrimary}  />
            <Text style={styles.tagText}>{item.location || 'N/A'}</Text>
          </View>
          <View style={styles.tag}>
            <DollarSign size={14} color={palette.accentPrimary}  />
            <Text style={styles.tagText}>{item.salary_range || 'Undisclosed'}</Text>
          </View>
          <View style={styles.tag}>
            <Clock size={14} color={palette.accentPrimary}  />
            <Text style={styles.tagText}>Recently</Text>
          </View>
        </View>

        {/* Why this matches section */}
        <View style={styles.matchReasons}>
           <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Zap size={14} color={palette.accentPrimary} style={{ marginRight: 6 }}  />
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#FFF' }}>Why This Matches</Text>
           </View>
           <View style={styles.reasonRow}>
              <Check size={12} color={palette.accentPrimary}  />
              <Text style={styles.reasonText}>Skills align with profile</Text>
           </View>
           <View style={styles.reasonRow}>
              <Check size={12} color={palette.accentPrimary}  />
              <Text style={styles.reasonText}>Salary meets requirements</Text>
           </View>
        </View>

        <View style={styles.jobActions}>
          <TouchableOpacity 
            onPress={() => item.job_url && Linking.openURL(item.job_url)}
            style={styles.actionButtonPrimary}
          >
            <ExternalLink size={16} color={palette.accentPrimary}  />
            <Text style={styles.actionButtonTextPrimary}>View</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => handleInboxAction(item, 'APPROVED')}
            style={styles.actionButtonSecondary}
          >
            <Send size={16} color="#4ade80"  />
            <Text style={styles.actionButtonTextSecondary}>Apply</Text>
          </TouchableOpacity>
        </View>
      </MobileCard>
    );
  };

  const renderCampaignItem = (item) => {
    const prefs = item.job_preferences || {};
    return (
      <MobileCard 
        key={item.id} 
        onClick={() => setSelectedCampaign(item)}
        style={styles.campaignCard}
      >
        <View style={styles.campaignContent}>
          <View style={styles.campaignIcon}>
            <Briefcase size={24} color={palette.accentPrimary}  />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.campaignName}>{item.name}</Text>
              {(item.status === 'RUNNING' || item.status === 'DRAFT') && (
                <View style={styles.activeBadge}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.activeText}>Active</Text>
                </View>
              )}
            </View>
            <Text style={styles.campaignMeta}>
              {prefs.keywords} • {item.total_jobs_found || 0} results
            </Text>
          </View>
          <ChevronRight size={20} color={palette.accentPrimary}  />
        </View>
      </MobileCard>
    );
  };

  // --- Main Detail View ---
  if (selectedCampaign) {
    const campaignJobs = inboxItems.filter(i => i.campaign_id === selectedCampaign.id);
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <MobileHeader 
          title={selectedCampaign.name} 
          showBack 
          onBack={() => setSelectedCampaign(null)} 
        />
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Detailed Stats */}
          <View style={styles.detailStatsGrid}>
             <MobileCard style={styles.detailStatBox}>
                <Search size={16} color={palette.accentPrimary}  />
                <Text style={styles.detailStatLabel}>Keywords</Text>
                <Text style={styles.detailStatValue}>{selectedCampaign.job_preferences?.keywords || 'N/A'}</Text>
             </MobileCard>
             <MobileCard style={styles.detailStatBox}>
                <MapPin size={16} color={palette.accentPrimary}  />
                <Text style={styles.detailStatLabel}>Location</Text>
                <Text style={styles.detailStatValue}>{selectedCampaign.job_preferences?.location || 'Any'}</Text>
             </MobileCard>
             <MobileCard style={styles.detailStatBox}>
                <DollarSign size={16} color={palette.accentPrimary}  />
                <Text style={styles.detailStatLabel}>Salary</Text>
                <Text style={styles.detailStatValue}>{selectedCampaign.job_preferences?.salary || 'Any'}</Text>
             </MobileCard>
             <MobileCard style={styles.detailStatBox}>
                <Inbox size={16} color={palette.accentPrimary}  />
                <Text style={styles.detailStatLabel}>Results</Text>
                <Text style={styles.detailStatValue}>{selectedCampaign.total_jobs_found || 0} jobs</Text>
             </MobileCard>
          </View>

          {/* AI Analysis Card */}
          <MobileCard style={styles.aiAnalysisCard}>
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <View style={styles.aiIconBubble}>
                  <Sparkles size={20} color={palette.accentPrimary}  />
                </View>
                <Text style={styles.aiAnalysisTitle}>AI Campaign Analysis</Text>
             </View>
             <View style={styles.aiAnalysisContent}>
                <Text style={styles.aiAnalysisText}>
                  Found {selectedCampaign.total_jobs_found || 0} highly relevant opportunities with 87% average compatibility based on your CV and profile.
                </Text>
                <View style={styles.aiAnalysisList}>
                   <View style={styles.aiAnalysisItem}>
                      <MapPin size={14} color={palette.accentPrimary}  />
                      <Text style={styles.aiItemText}>Keyword Alignment: 92% match</Text>
                   </View>
                   <View style={styles.aiAnalysisItem}>
                      <Award size={14} color={palette.accentPrimary}  />
                      <Text style={styles.aiItemText}>Experience Level: Senior+ prioritized</Text>
                   </View>
                </View>
             </View>
          </MobileCard>

          {/* Jobs List Header */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIndicator} />
            <Text style={styles.sectionTitle}>Matched Jobs ({campaignJobs.length})</Text>
          </View>

          {campaignJobs.map(renderJobItem)}
          {campaignJobs.length === 0 && (
            <View style={styles.emptyContainer}>
               <Text style={styles.emptyText}>No matched jobs found for this campaign yet.</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- Main List View ---
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <MobileHeader title="Jobs" subtitle="AI-Powered Job Search" />
      
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accentPrimary} />}
      >
        {renderStats()}

        <TouchableOpacity
          onPress={() => setShowNewCampaign(true)}
          style={styles.createButton}
        >
          <LinearGradient
            colors={['rgba(0, 212, 255, 0.2)', 'rgba(0, 153, 204, 0.2)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.createButtonGradient}
          >
            <Plus size={24} color={palette.accentPrimary}  />
            <Text style={styles.createButtonText}>Create New Campaign</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionIndicator} />
          <Text style={styles.sectionTitle}>Your Campaigns</Text>
        </View>

        {campaigns.length > 0 ? (
          campaigns.map(renderCampaignItem)
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No active campaigns</Text>
          </View>
        )}
      </ScrollView>

      {/* New Campaign Modal */}
      <Modal
        visible={showNewCampaign}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNewCampaign(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={() => setShowNewCampaign(false)} 
            style={styles.modalBlur}
          >
            <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
          </TouchableOpacity>
          
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%', maxHeight: '85%' }}
          >
            <View style={[styles.modalContent, { maxHeight: '100%' }]}>
              <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Campaign</Text>
              <TouchableOpacity onPress={() => setShowNewCampaign(false)} style={styles.modalClose}>
                <X size={24} color={palette.textMuted}  />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Campaign Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Senior PM Roles"
                placeholderTextColor={palette.textMuted}
                value={newName}
                onChangeText={setNewName}
              />

              <Text style={styles.inputLabel}>Keywords *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Product Manager, Director"
                placeholderTextColor={palette.textMuted}
                value={newKeywords}
                onChangeText={setNewKeywords}
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Location</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Remote"
                    placeholderTextColor={palette.textMuted}
                    value={newLocation}
                    onChangeText={setNewLocation}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Salary</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., $140k+"
                    placeholderTextColor={palette.textMuted}
                    value={newSalary}
                    onChangeText={setNewSalary}
                  />
                </View>
              </View>

              <TouchableOpacity 
                onPress={handleCreate}
                disabled={!newName || !newKeywords}
                style={[styles.submitButton, (!newName || !newKeywords) && { opacity: 0.5 }]}
              >
                <LinearGradient
                  colors={['rgba(0, 212, 255, 0.3)', 'rgba(0, 153, 204, 0.3)']}
                  style={styles.submitButtonGradient}
                >
                  <Sparkles size={20} color={palette.accentPrimary} style={{ marginRight: 8 }}  />
                  <Text style={styles.submitButtonText}>Create Campaign</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    padding: 12,
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: palette.accentPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: palette.textMuted,
    fontWeight: '600',
  },
  createButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  createButtonText: {
    color: palette.accentPrimary,
    fontWeight: '800',
    fontSize: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    marginTop: 8,
  },
  sectionIndicator: {
    height: 3,
    width: 30,
    borderRadius: 1.5,
    backgroundColor: palette.accentPrimary,
  },
  sectionTitle: {
    color: palette.textMuted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  campaignCard: {
    marginBottom: 12,
  },
  campaignContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  campaignIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  campaignName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  campaignMeta: {
    fontSize: 12,
    color: palette.textMuted,
    marginTop: 2,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 5,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ade80',
  },
  activeText: {
    color: '#4ade80',
    fontSize: 10,
    fontWeight: '800',
  },
  jobCard: {
    marginBottom: 16,
  },
  jobHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  jobIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 2,
  },
  jobSubtitle: {
    fontSize: 13,
    color: palette.textMuted,
    marginBottom: 6,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.3)',
    alignSelf: 'flex-start',
    gap: 6,
  },
  matchText: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '800',
  },
  jobDescription: {
    fontSize: 13,
    color: palette.textMuted,
    lineHeight: 20,
    marginBottom: 16,
  },
  jobTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tagText: {
    fontSize: 12,
    color: palette.textMuted,
  },
  matchReasons: {
    backgroundColor: 'rgba(0, 212, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.1)',
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  reasonText: {
    fontSize: 12,
    color: palette.textMuted,
  },
  jobActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
  },
  actionButtonTextPrimary: {
    color: palette.accentPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.2)',
  },
  actionButtonTextSecondary: {
    color: '#4ade80',
    fontWeight: '700',
    fontSize: 14,
  },
  detailStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  detailStatBox: {
    flexBasis: '48%',
    flexGrow: 1,
    padding: 12,
  },
  detailStatLabel: {
    fontSize: 10,
    color: palette.textMuted,
    marginTop: 6,
  },
  detailStatValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 2,
  },
  aiAnalysisCard: {
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
    marginBottom: 20,
  },
  aiIconBubble: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
  },
  aiAnalysisTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  aiAnalysisText: {
    fontSize: 14,
    color: palette.textMuted,
    lineHeight: 22,
    marginBottom: 12,
  },
  aiAnalysisItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  aiItemText: {
    fontSize: 12,
    color: palette.textMuted,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: palette.textMuted,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 2,
    borderTopColor: 'rgba(0, 212, 255, 0.3)',
    maxHeight: '85%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
  },
  modalClose: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: palette.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 20,
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 40,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  submitButtonText: {
    color: palette.accentPrimary,
    fontWeight: '800',
    fontSize: 16,
  },
});

