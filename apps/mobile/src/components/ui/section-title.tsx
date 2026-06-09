import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Brand } from '@/constants/brand';

export interface SectionTitleProps {
  children: string;
  /** Optional small uppercase eyebrow above the title. */
  eyebrow?: string;
  style?: StyleProp<ViewStyle>;
}

export function SectionTitle({ children, eyebrow, style }: SectionTitleProps) {
  return (
    <View style={[styles.wrap, style]}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 10, marginBottom: 12 },
  eyebrow: {
    color: Brand.red,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  title: { color: Brand.ink, fontSize: 18, fontWeight: '900' },
});
