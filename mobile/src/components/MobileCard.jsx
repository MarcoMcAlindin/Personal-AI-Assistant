import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { theme } from '../theme';

/**
 * MobileCard - A "glassmorphism" card component matching the SuperCyan design system.
 * Uses semi-transparent background and blur on iOS/Android (via expo-blur).
 */
export const MobileCard = ({ children, style, onClick }) => {
  const Container = onClick ? TouchableOpacity : View;

  return (
    <Container
      onPress={onClick}
      activeOpacity={onClick ? 0.9 : 1}
      style={[styles.root, style]}
    >
      <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
      {children}
    </Container>
  );
};

const styles = StyleSheet.create({
  root: {
    borderRadius: theme.radii.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.bgCard,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    padding: theme.spacing.md,
    shadowColor: theme.colors.glow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
  },
});
