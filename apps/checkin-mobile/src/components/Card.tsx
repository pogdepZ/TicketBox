import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, BORDER_RADIUS, SPACING } from '../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'raised' | 'outlined';
}

export function Card({ children, style, variant = 'default' }: CardProps) {
  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'raised':
        return {
          backgroundColor: COLORS.surfaceRaised,
          borderColor: COLORS.borderLight,
          borderWidth: 1,
        };
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          borderColor: COLORS.border,
          borderWidth: 1,
        };
      default:
        return {
          backgroundColor: COLORS.surface,
          borderColor: COLORS.border,
          borderWidth: 1,
        };
    }
  };

  return <View style={[styles.container, getVariantStyle(), style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BORDER_RADIUS.lg, // Shape lock: cards are always lg
    padding: SPACING.lg,
    overflow: 'hidden',
  },
});
