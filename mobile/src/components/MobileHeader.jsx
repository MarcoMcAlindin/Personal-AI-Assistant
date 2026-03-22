import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import { Text } from './Themed';
import { Menu, Search, Bell, ArrowLeft } from 'lucide-react-native';
import { palette } from '../theme';
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
                  <ArrowLeft size={24} color={palette.accentPrimary} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.iconButton}>
                  <Menu size={24} color={palette.accentPrimary} />
                </TouchableOpacity>
              )}
              <View>
                <Text style={styles.title}>{title}</Text>
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
              </View>
            </View>
            
            <View style={styles.rightSection}>
              <TouchableOpacity style={styles.iconButtonSmall}>
                <Search size={20} color={palette.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButtonSmallRelative}>
                <Bell size={20} color={palette.textSecondary} />
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
    backgroundColor: 'rgba(26,26,26,0.95)',
    zIndex: 30,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 255, 0.2)',
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
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
    backgroundColor: 'rgba(10,10,10,0.5)',
    borderRadius: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 12,
    color: palette.textSecondary,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButtonSmall: {
    padding: 8,
    backgroundColor: 'rgba(10,10,10,0.5)',
    borderRadius: 12,
  },
  iconButtonSmallRelative: {
    padding: 8,
    backgroundColor: 'rgba(10,10,10,0.5)',
    borderRadius: 12,
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    backgroundColor: '#EF4444',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  }
});