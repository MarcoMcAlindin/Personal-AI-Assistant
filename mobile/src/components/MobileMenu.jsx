import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Dimensions, ScrollView, Modal, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { 
  X, 
  Home, 
  Briefcase, 
  DollarSign, 
  Newspaper, 
  Heart, 
  Mail, 
  Calendar, 
  CheckSquare, 
  Cpu, 
  Zap,
  Plug,
  Settings,
  User
} from 'lucide-react-native';
import { Text } from './Themed';
import { palette, spacing } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const MENU_ITEMS = [
  { icon: Home, label: "Dashboard", path: "Home" },
  { icon: Briefcase, label: "Jobs", path: "Jobs" },
  { icon: DollarSign, label: "Money Hub", path: "Money" },
  { icon: Newspaper, label: "News", path: "Feeds" },
  { icon: Heart, label: "Health", path: "Health" },
  { icon: Mail, label: "Email", path: "Mail" },
  { icon: Calendar, label: "Calendar", path: "Plan" },
  { icon: CheckSquare, label: "Todo List", path: "Plan" },
  { icon: Cpu, label: "AI Tools", path: "AI" },
  { icon: Zap, label: "Internet Speed", path: "Home" },
  { icon: Plug, label: "Integrations", path: "Home" },
];

export function MobileMenu({ isOpen, onClose }) {
  const slideAnim = useRef(new Animated.Value(-width)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation();
  const currentRouteName = useNavigationState(state => {
    if (!state) return 'Home';
    const route = state.routes[state.index];
    return route.name;
  });

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 12,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -width,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [isOpen]);

  const handleNavigate = (path) => {
    onClose();
    if (path) {
      navigation.navigate(path);
    }
  };

  if (!isOpen && slideAnim._value === -width) return null;

  return (
    <Modal visible={isOpen} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[styles.menuPanel, { transform: [{ translateX: slideAnim }] }]}>
          <BlurView intensity={40} tint="dark" style={styles.blurView}>
            
            <View style={styles.header}>
              <View style={styles.headerTop}>
                <View style={styles.brandRow}>
                  <LinearGradient
                    colors={['#00FFFF', '#0099CC']}
                    style={styles.logoBox}
                  >
                    <Cpu size={24} color="#0A0A0A" />
                  </LinearGradient>
                  <View>
                    <Text style={styles.brandTitle}>Super Cyan</Text>
                    <Text style={styles.brandSubtitle}>AI Platform</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <X size={24} color={palette.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.profileCard}>
                <LinearGradient
                  colors={['#00FFFF', '#0099CC']}
                  style={styles.avatarBox}
                >
                  <User size={20} color="#0A0A0A" />
                </LinearGradient>
                <View>
                  <Text style={styles.profileName}>Executive User</Text>
                  <Text style={styles.profileType}>Premium Account</Text>
                </View>
              </View>
            </View>

            <ScrollView 
              style={styles.scrollArea} 
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {MENU_ITEMS.map((item, index) => {
                const Icon = item.icon;
                const isActive = currentRouteName === item.path;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.menuItem, isActive && styles.menuItemActive]}
                    onPress={() => handleNavigate(item.path)}
                  >
                    <Icon size={20} color={isActive ? palette.accentPrimary : palette.textSecondary} />
                    <Text style={[styles.menuItemText, isActive && styles.menuItemTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.menuItem}>
                <Settings size={20} color={palette.textSecondary} />
                <Text style={styles.menuItemText}>Settings</Text>
              </TouchableOpacity>
            </View>

          </BlurView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  menuPanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '85%',
    maxWidth: 320,
    backgroundColor: 'rgba(26,26,26,0.98)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(0, 255, 255, 0.2)',
    shadowColor: '#00FFFF',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  blurView: {
    flex: 1,
  },
  header: {
    padding: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 255, 0.2)',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  brandSubtitle: {
    fontSize: 12,
    color: palette.textSecondary,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: 'rgba(10,10,10,0.5)',
    borderRadius: 12,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: 'rgba(10,10,10,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
    borderRadius: 16,
  },
  avatarBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  profileType: {
    fontSize: 12,
    color: palette.textSecondary,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  menuItemActive: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.textSecondary,
  },
  menuItemTextActive: {
    color: palette.accentPrimary,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 255, 255, 0.2)',
    backgroundColor: 'rgba(26,26,26,0.95)',
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.md,
  },
});
