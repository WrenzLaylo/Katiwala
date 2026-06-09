import { type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Brand, Radius } from '@/constants/brand';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Plain label text. For rich labels (links) pass `children` instead. */
  label?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Checkbox({ checked, onChange, label, children, style }: CheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      hitSlop={6}
      onPress={() => onChange(!checked)}
      style={[styles.row, style]}>
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked ? <Text style={styles.tick}>✓</Text> : null}
      </View>
      {children ?? (label ? <Text style={styles.label}>{label}</Text> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  box: {
    width: 20,
    height: 20,
    borderRadius: Radius.sm - 3,
    borderWidth: 1.5,
    borderColor: Brand.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.white,
  },
  boxChecked: { backgroundColor: Brand.blue, borderColor: Brand.blue },
  tick: { color: Brand.white, fontSize: 13, fontWeight: '900', lineHeight: 16 },
  label: { color: Brand.slate, fontSize: 13, fontWeight: '600', flexShrink: 1 },
});
