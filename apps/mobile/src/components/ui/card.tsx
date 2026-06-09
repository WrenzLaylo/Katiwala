import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

import { Brand, Radius, Space } from '@/constants/brand';

export interface CardProps extends ViewProps {
  /** `outlined` = white w/ border, `filled` = subtle grey surface. */
  variant?: 'outlined' | 'filled';
  style?: StyleProp<ViewStyle>;
}

/** Bordered container used to group form sections and list items. */
export function Card({ variant = 'outlined', style, children, ...rest }: CardProps) {
  return (
    <View
      style={[
        styles.base,
        variant === 'filled' ? styles.filled : styles.outlined,
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Radius.lg,
    padding: Space.lg,
    gap: Space.md,
  },
  outlined: { backgroundColor: Brand.white },
  filled: { backgroundColor: Brand.surface },
});
