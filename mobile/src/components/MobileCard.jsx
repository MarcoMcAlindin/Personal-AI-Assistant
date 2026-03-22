import React from 'react';
import { StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { palette } from '../theme';

/**
 * MobileCard - A "glassmorphism" card component matching the SuperCyan design system.
 * Uses semi-transparent background and blur on iOS/Android (via expo-blur).
 */
export const MobileCard = ({ children, style, onClick, className }) => {
  const Container = onClick ? TouchableOpacity : View;
  
  return (
    <Container 
      onPress={onClick} 
      activeOpacity={onClick ? 0.9 : 1}
      style={[styles.root, style]}
    >
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      {children}
    </Container>
  );
};

const styles = StyleSheet.create({
  root: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
    padding: 16,
    // Premium cyan glow
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 6,
  },
});
