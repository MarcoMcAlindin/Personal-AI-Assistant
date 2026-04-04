import { Calendar, Check, ChevronRight, Clock, Plus, Video, X } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import {
  View, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, ScrollView,
  StyleSheet, Platform, Modal, KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '../components/Themed';
import { spacing, theme } from '../theme';
import { fetchTasks, createTask, updateTask } from '../services/api';
import { MobileHeader } from '../components/MobileHeader';
import { MobileCard } from '../components/MobileCard';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

function formatTime12h(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

function formatDate() {
  const d = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}

export default function PlannerScreen() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  
  // Tab State
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' or 'schedule'

  // New Task Form
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newPriority, setNewPriority] = useState('medium');

  const loadData = async () => {
    try {
      const data = await fetchTasks();
      setTasks(Array.isArray(data) ? data : data.tasks || []);
    } catch (e) {
      console.error(e);
      setTasks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleAdd = async () => {
    const title = newTitle.trim();
    if (!title) return;
    
    setNewTitle('');
    setNewTime('');
    setShowAddTask(false);
    
    try {
      await createTask({ 
        title, 
        time: newTime.trim(),
        priority: newPriority 
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleStatus = async (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await updateTask(task.id, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    } catch (e) {
      console.error(e);
    }
  };

  const renderTaskItem = (item) => {
    const done = item.status === 'completed';
    const priority = item.urgency || item.priority || 'medium';
    const priorityColor = priority === 'high' ? '#FF5555' : 
                         priority === 'medium' ? '#FFCC00' : '#00FFFF';

    return (
      <MobileCard 
        key={item.id} 
        onClick={() => toggleStatus(item)}
        style={[styles.taskCard, done && styles.taskCardDone]}
      >
        <View style={styles.taskContent}>
          <TouchableOpacity 
            onPress={() => toggleStatus(item)}
            style={[styles.checkbox, done && styles.checkboxDone]}
          >
            {done && <Check size={14} color="#0A0A0A"  />}
          </TouchableOpacity>
          
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={[styles.taskTitle, done && styles.taskTitleDone]}>
              {item.title}
            </Text>
            <View style={styles.taskMeta}>
              <View style={[styles.priorityBadge, { backgroundColor: `${priorityColor}15`, borderColor: `${priorityColor}30` }]}>
                <Text style={{ color: priorityColor, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {priority}
                </Text>
              </View>
              {item.time && (
                <View style={styles.timeInfo}>
                  <Clock size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.timeText}>{formatTime12h(item.time)}</Text>
                </View>
              )}
            </View>
          </View>
          <ChevronRight size={16} color="rgba(255,255,255,0.1)"  />
        </View>
      </MobileCard>
    );
  };

  const renderScheduleItem = (item) => {
    if (!item.time) return null;
    return (
      <MobileCard key={item.id} style={styles.scheduleCard}>
        <View style={styles.scheduleContent}>
          <View style={styles.scheduleIcon}>
            <Video size={20} color={theme.colors.accentPrimary} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.scheduleTitle}>{item.title}</Text>
              <View style={styles.scheduleMeta}>
                <Clock size={14} color={theme.colors.textMuted} />
                <Text style={styles.scheduleTime}>{formatTime12h(item.time)}</Text>
              <Text style={styles.scheduleDot}>•</Text>
              <Text style={styles.scheduleDuration}>{item.duration || '30m'}</Text>
            </View>
          </View>
        </View>
      </MobileCard>
    );
  };

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const pendingCount = tasks.length - completedCount;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <MobileHeader title="Planner" subtitle={formatDate()} />
      
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accentPrimary} />}
      >
        <View style={styles.statsGrid}>
          <MobileCard style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.colors.accentPrimary }]}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </MobileCard>
          <MobileCard style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#4ade80' }]}>{completedCount}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </MobileCard>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabBar}>
          <TouchableOpacity 
            onPress={() => setActiveTab('tasks')}
            style={[styles.tab, activeTab === 'tasks' && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === 'tasks' && styles.tabTextActive]}>Tasks</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setActiveTab('schedule')}
            style={[styles.tab, activeTab === 'schedule' && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === 'schedule' && styles.tabTextActive]}>Schedule</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => setShowAddTask(true)}
          style={styles.addButton}
        >
          <LinearGradient
            colors={['rgba(0, 212, 255, 0.2)', 'rgba(0, 153, 204, 0.2)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.addButtonGradient}
          >
            <Plus size={24} color={theme.colors.accentPrimary} />
            <Text style={styles.addButtonText}>Add New {activeTab === 'tasks' ? 'Task' : 'Event'}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionIndicator} />
          <Text style={styles.sectionTitle}>
            {activeTab === 'tasks' ? 'Today\'s Tasks' : 'Today\'s Schedule'}
          </Text>
        </View>

        {activeTab === 'tasks' ? (
          tasks.length > 0 ? (
            tasks.map(renderTaskItem)
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No tasks for today</Text>
            </View>
          )
        ) : (
          tasks.filter(t => t.time).length > 0 ? (
            tasks.filter(t => t.time).map(renderScheduleItem)
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No events scheduled</Text>
            </View>
          )
        )}
      </ScrollView>

      {/* New Task Modal */}
      <Modal
        visible={showAddTask}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddTask(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={() => setShowAddTask(false)} 
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
              <Text style={styles.modalTitle}>New Entry</Text>
              <TouchableOpacity onPress={() => setShowAddTask(false)} style={styles.modalClose}>
                <X size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="What needs to be done?"
                placeholderTextColor={theme.colors.textMuted}
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Time</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 14:00"
                    placeholderTextColor={theme.colors.textMuted}
                    value={newTime}
                    onChangeText={setNewTime}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Priority</Text>
                  <View style={styles.priorityGrid}>
                    {['low', 'medium', 'high'].map(p => (
                      <TouchableOpacity 
                        key={p}
                        onPress={() => setNewPriority(p)}
                        style={[
                          styles.priorityOption, 
                          newPriority === p && { borderColor: theme.colors.accentPrimary, backgroundColor: 'rgba(0, 212, 255, 0.1)' }
                        ]}
                      >
                        <Text style={[styles.priorityText, newPriority === p && { color: theme.colors.accentPrimary }]}>
                          {p.charAt(0).toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <TouchableOpacity 
                onPress={handleAdd}
                disabled={!newTitle}
                style={[styles.submitButton, !newTitle && { opacity: 0.5 }]}
              >
                <LinearGradient
                  colors={['rgba(0, 212, 255, 0.3)', 'rgba(0, 153, 204, 0.3)']}
                  style={styles.submitButtonGradient}
                >
                  <Calendar size={20} color={theme.colors.accentPrimary} style={{ marginRight: 8 }} />
                  <Text style={styles.submitButtonText}>Add to Planner</Text>
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
    backgroundColor: theme.colors.bgPrimary,
  },
  scrollContainer: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    alignItems: 'flex-start',
    borderRadius: 24,
  },
  statValue: {
    fontSize: theme.typography.heading2,
    fontWeight: '700',
    fontFamily: theme.fonts.heading,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.bgCard,
    borderRadius: theme.radii.md,
    padding: 6,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
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
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: theme.colors.accentPrimary,
    fontWeight: '900',
  },
  addButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
  },
  addButtonText: {
    color: theme.colors.accentPrimary,
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.5,
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
  taskCard: {
    marginBottom: 16,
    borderRadius: 24,
  },
  taskCardDone: {
    opacity: 0.6,
  },
  taskContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
  },
  checkboxDone: {
    backgroundColor: theme.colors.accentPrimary,
    borderColor: theme.colors.accentPrimary,
  },
  taskTitle: {
    fontSize: theme.typography.body,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.heading,
    letterSpacing: 0.3,
  },
  taskTitleDone: {
    color: theme.colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '700',
  },
  scheduleCard: {
    marginBottom: 16,
    borderRadius: 24,
  },
  scheduleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  scheduleIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleTitle: {
    fontSize: theme.typography.heading3,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.heading,
  },
  scheduleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  scheduleTime: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  scheduleDot: {
    color: 'rgba(255, 255, 255, 0.2)',
  },
  scheduleDuration: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: theme.colors.bgPrimary,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 255, 255, 0.3)',
    maxHeight: '85%',
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  modalTitle: {
    fontSize: theme.typography.heading2,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.heading,
    letterSpacing: 0.5,
  },
  modalClose: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputLabel: {
    fontSize: theme.typography.caption,
    fontWeight: '900',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 10,
    paddingLeft: 4,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: theme.radii.md,
    paddingHorizontal: 18,
    paddingVertical: 16,
    color: theme.colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 24,
    fontWeight: '600',
  },
  priorityGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '900',
    color: theme.colors.textSecondary,
  },
  submitButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.4)',
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
  },
  submitButtonText: {
    color: theme.colors.accentPrimary,
    fontWeight: '900',
    fontSize: 17,
    letterSpacing: 0.5,
  },
});
