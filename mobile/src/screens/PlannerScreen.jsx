// VibeOS Mobile -- Daily Planner Screen
import React, { useState, useEffect } from 'react';
import {
  View, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../components/Themed';
import { palette, spacing } from '../theme';
import { fetchTasks, createTask, updateTask } from '../services/api';

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
  const [newTitle, setNewTitle] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const loadData = async () => {
    try {
      const data = await fetchTasks();
      setTasks(Array.isArray(data) ? data : data.tasks || []);
    } catch {
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
    setShowAdd(false);
    try {
      await createTask({ title });
      loadData();
    } catch {}
  };

  const toggleStatus = async (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await updateTask(task.id, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    } catch {}
  };

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const progress = tasks.length ? completedCount / tasks.length : 0;

  const renderItem = ({ item }) => {
    const done = item.status === 'completed';
    return (
      <TouchableOpacity onPress={() => toggleStatus(item)}>
        <View style={{
          flexDirection: 'row', alignItems: 'flex-start',
          paddingVertical: spacing.md, paddingHorizontal: spacing.md,
          borderBottomWidth: 1, borderBottomColor: palette.borderColor,
        }}>
          <View style={{
            width: 22, height: 22, borderRadius: 11,
            borderWidth: 2,
            borderColor: done ? palette.accentPrimary : palette.textMuted,
            backgroundColor: done ? palette.accentPrimary : 'transparent',
            marginRight: spacing.md, marginTop: 2,
            alignItems: 'center', justifyContent: 'center',
          }}>
            {done && <Text style={{ color: '#000', fontSize: 12, fontWeight: 'bold' }}>{'\u2713'}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 15, fontWeight: '500',
              textDecorationLine: done ? 'line-through' : 'none',
              color: done ? palette.textMuted : palette.textPrimary,
            }}>
              {item.title}
            </Text>
            {item.description && (
              <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 2 }}>{item.description}</Text>
            )}
            <View style={{ flexDirection: 'row', marginTop: 4 }}>
              {item.time && (
                <Text style={{ color: palette.textMuted, fontSize: 11 }}>
                  {'\u23F0'} {formatTime12h(item.time)}
                </Text>
              )}
              {item.duration && (
                <Text style={{ color: palette.textMuted, fontSize: 11, marginLeft: spacing.sm }}>
                  {item.duration >= 60 ? `${Math.floor(item.duration / 60)} hr` : `${item.duration} min`}
                </Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
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
      {/* Header */}
      <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={{
              width: 40, height: 40, borderRadius: 8,
              backgroundColor: palette.bgCard, alignItems: 'center', justifyContent: 'center',
              marginRight: spacing.md, borderWidth: 1, borderColor: palette.accentPrimary,
            }}>
              <Text style={{ fontSize: 18 }}>{'\uD83D\uDCC5'}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Daily Planner</Text>
              <Text style={{ color: palette.textMuted, fontSize: 11 }}>
                {formatDate()} {'\u2022'} Auto-archives at midnight
              </Text>
            </View>
            <View style={{ flexDirection: 'row', marginLeft: spacing.sm, marginRight: spacing.sm }}>
              <TouchableOpacity style={{ marginRight: spacing.xs }}>
                <Text style={{ color: palette.textMuted, fontSize: 16 }}>{'\u2630'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ marginRight: spacing.xs }}>
                <Text style={{ color: palette.textMuted, fontSize: 16 }}>{'\u2B1A'}</Text>
              </TouchableOpacity>
              <TouchableOpacity>
                <Text style={{ color: palette.textMuted, fontSize: 16 }}>{'\uD83D\uDDD1\uFE0F'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setShowAdd(!showAdd)}
            style={{
              backgroundColor: palette.accentPrimary, borderRadius: 8,
              paddingHorizontal: 14, paddingVertical: 8,
            }}
          >
            <Text style={{ color: '#000', fontWeight: '600', fontSize: 13 }}>+ Add Task</Text>
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View style={{ marginTop: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
            <Text style={{ color: palette.textMuted, fontSize: 12 }}>Progress</Text>
            <Text style={{ color: palette.textMuted, fontSize: 12 }}>{completedCount}/{tasks.length} complete</Text>
          </View>
          <View style={{ height: 6, backgroundColor: palette.bgCard, borderRadius: 3, overflow: 'hidden' }}>
            <View style={{
              height: '100%', width: `${progress * 100}%`,
              backgroundColor: palette.accentPrimary, borderRadius: 3,
            }} />
          </View>
        </View>
      </View>

      {/* Add task input */}
      {showAdd && (
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: palette.bgCard, borderRadius: 12,
          borderWidth: 1, borderColor: palette.accentPrimary,
          paddingHorizontal: spacing.md, marginHorizontal: spacing.md, marginBottom: spacing.sm,
        }}>
          <TextInput
            style={{ flex: 1, color: palette.textPrimary, fontSize: 14, paddingVertical: 12 }}
            placeholder="Task title..."
            placeholderTextColor={palette.textMuted}
            value={newTitle}
            onChangeText={setNewTitle}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
            autoFocus
          />
          <TouchableOpacity onPress={handleAdd}>
            <Text style={{ color: palette.accentPrimary, fontWeight: 'bold', fontSize: 14 }}>Add</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Task list */}
      <FlatList
        data={tasks}
        renderItem={renderItem}
        keyExtractor={item => item.id?.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accentPrimary} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: spacing.xl }}>
            <Text style={{ color: palette.textMuted }}>No tasks for today</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
