import React, { useRef } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SPACING } from '../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  size = 'lg',
}: ButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled || loading) return;
    Animated.spring(scaleAnim, {
      toValue: 0.96, // Tactile feedback (design-taste-frontend principle)
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const getContainerStyle = (): ViewStyle => {
    let baseStyle: ViewStyle = { ...styles.container };
    
    // Size variants
    if (size === 'sm') {
      baseStyle.paddingVertical = SPACING.sm;
      baseStyle.paddingHorizontal = SPACING.md;
    } else if (size === 'md') {
      baseStyle.paddingVertical = SPACING.md;
      baseStyle.paddingHorizontal = SPACING.lg;
    } else {
      baseStyle.paddingVertical = SPACING.lg;
      baseStyle.paddingHorizontal = SPACING.xl;
    }

    // Color variants
    if (variant === 'primary') {
      baseStyle.backgroundColor = COLORS.primary;
    } else if (variant === 'secondary') {
      baseStyle.backgroundColor = COLORS.surfaceLight;
      baseStyle.borderWidth = 1;
      baseStyle.borderColor = COLORS.borderLight;
    } else if (variant === 'danger') {
      baseStyle.backgroundColor = COLORS.error;
    } else if (variant === 'ghost') {
      baseStyle.backgroundColor = 'transparent';
    }

    // Disabled state
    if (disabled) {
      baseStyle.opacity = 0.5;
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    let baseText: TextStyle = { ...styles.text };

    if (size === 'sm') baseText.fontSize = FONT_SIZES.sm;
    else if (size === 'md') baseText.fontSize = FONT_SIZES.md;
    else baseText.fontSize = FONT_SIZES.lg;

    if (variant === 'primary' || variant === 'danger') {
      baseText.color = COLORS.background; // High contrast text on solid button
    } else if (variant === 'secondary') {
      baseText.color = COLORS.text;
    } else if (variant === 'ghost') {
      baseText.color = COLORS.textSecondary;
    }

    return baseText;
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[getContainerStyle(), style]}
      >
        {loading ? (
          <ActivityIndicator
            color={variant === 'primary' || variant === 'danger' ? COLORS.background : COLORS.primary}
          />
        ) : (
          <Text style={[getTextStyle(), textStyle]} numberOfLines={1}>
            {title}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BORDER_RADIUS.md, // Unified corner radius
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
