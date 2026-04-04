import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import { Text } from './Themed';
import { Menu, Search, Bell, ArrowLeft } from 'lucide-react-native';
import { theme } from '../theme';
import { MobileMenu } from './MobileMenu';
import { BlurView } from 'expo-blur';

export const MobileHeader = ({ title, subtitle, showBack, onBack }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <View style={styles.container}>
        <BlurView intensity={40} tint="dark" style={styles.blurContainer}>
          <View style={styles.content}>
            <View style={styles.leftSection}>
              {showBack ? (
                <TouchableOpacity onPress={onBack} style={styles.iconButton}>
                  <ArrowLeft size={24} color={theme.colors.accentPrimary} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.iconButton}>
                  <Menu size={24} color={theme.colors.accentPrimary} />
                </TouchableOpacity>
              )}
              <View>
                <Text style={styles.title}>{title}</Text>
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
              </View>
            </View>
            
            <View style={styles.rightSection}>
                <TouchableOpacity style={styles.iconButtonSmall}>
                  <Search size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButtonSmallRelative}>
                  <Bell size={20} color={theme.colors.textSecondary} />
                <View style={styles.notificationDot} />
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </View>
      
      <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.bgSecondary,
    zIndex: 30,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
    shadowColor: theme.colors.glow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 26,
    elevation: 8,
  },
  blurContainer: {
    flexGrow: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 8,
    backgroundColor: theme.colors.overlay,
    borderRadius: theme.radii.sm,
  },
  title: {
    fontSize: theme.typography.heading3,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.heading,
  },
  subtitle: {
    fontSize: theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButtonSmall: {
    padding: 8,
    backgroundColor: theme.colors.overlay,
    borderRadius: theme.radii.sm,
  },
  iconButtonSmallRelative: {
    padding: 8,
    backgroundColor: theme.colors.overlay,
    borderRadius: theme.radii.sm,
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    backgroundColor: '#F97316',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.bgSecondary,
  }
});
