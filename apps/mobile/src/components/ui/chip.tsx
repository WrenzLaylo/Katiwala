import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Brand, Radius } from '@/constants/brand';

export interface ChipProps {
  label: string;
  sublabel?: string;
  active?: boolean;
  onPress?: () => void;
  /** Accent color when active. Defaults to brand blue. */
  activeColor?: string;
  style?: StyleProp<ViewStyle>;
}

/** Selectable pill used for roles, services, addresses and filters. */
export function Chip({
  label,
  sublabel,
  active = false,
  onPress,
  activeColor = Brand.blue,
  style,
}: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.chip,
        active && { backgroundColor: activeColor, borderColor: activeColor },
        style,
      ]}>
      <Text style={[styles.label, active && styles.activeText]}>{label}</Text>
      {sublabel ? (
        <Text style={[styles.sublabel, active && styles.activeText]}>{sublabel}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Brand.white,
  },
  label: { color: Brand.ink, fontSize: 14, fontWeight: '800' },
  sublabel: { color: Brand.slate, fontSize: 12, fontWeight: '600', marginTop: 4 },
  activeText: { color: Brand.white },
});
