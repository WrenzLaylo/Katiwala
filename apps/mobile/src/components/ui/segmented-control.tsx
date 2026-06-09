import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Brand, Radius } from '@/constants/brand';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** `light` = white active pill on grey; `primary` = solid blue active. */
  variant?: 'light' | 'primary';
  style?: StyleProp<ViewStyle>;
}

/** Two-or-more-option pill toggle (Login/Sign Up, Customer/Service Provider). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  variant = 'light',
  style,
}: SegmentedControlProps<T>) {
  return (
    <View style={[styles.track, style]}>
      {options.map((option) => {
        const active = option.value === value;
        const activeStyle =
          variant === 'primary' ? styles.activePrimary : styles.activeLight;
        const activeText =
          variant === 'primary' ? styles.activeTextPrimary : styles.activeTextLight;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && activeStyle]}>
            <Text style={[styles.label, active ? activeText : styles.inactiveText]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: Brand.muted,
    borderRadius: Radius.pill,
    padding: 4,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: Radius.pill,
  },
  activeLight: {
    backgroundColor: Brand.white,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  activePrimary: { backgroundColor: Brand.blue },
  label: { fontSize: 14, fontWeight: '800' },
  inactiveText: { color: Brand.slate },
  activeTextLight: { color: Brand.blue },
  activeTextPrimary: { color: Brand.white },
});
