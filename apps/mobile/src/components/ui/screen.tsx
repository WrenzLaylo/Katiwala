import { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  type RefreshControlProps,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Brand } from '@/constants/brand';

export interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a ScrollView. Defaults to true. */
  scroll?: boolean;
  /** Center content vertically (for short auth-style screens). */
  centered?: boolean;
  /** Pull-to-refresh control, forwarded to the ScrollView. */
  refreshControl?: React.ReactElement<RefreshControlProps>;
  /** Max content width on large screens (tablet/web). Defaults to 480. */
  maxWidth?: number;
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * Standard screen scaffold: safe-area + keyboard avoidance + optional scroll,
 * plus responsive behavior so a single layout works across phones, tablets and
 * web — horizontal padding scales with width, and content is capped to
 * `maxWidth` and centered on large screens instead of stretching edge-to-edge.
 */
export function Screen({
  children,
  scroll = true,
  centered = false,
  refreshControl,
  maxWidth = 480,
  contentStyle,
}: ScreenProps) {
  const { width } = useWindowDimensions();
  // Tighter gutters on small phones, roomier on larger screens.
  const horizontalPadding = width < 360 ? 16 : width < 768 ? 24 : 32;

  const inner = (
    <View
      style={[
        styles.inner,
        { maxWidth, paddingHorizontal: horizontalPadding },
        contentStyle,
      ]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              centered && styles.centered,
            ]}
            keyboardShouldPersistTaps="handled"
            refreshControl={refreshControl}
            showsVerticalScrollIndicator={false}>
            {inner}
          </ScrollView>
        ) : (
          <View style={[styles.flex, styles.staticOuter, centered && styles.centered]}>
            {inner}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.white },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  staticOuter: { alignItems: 'center' },
  centered: { justifyContent: 'center' },
  inner: {
    width: '100%',
    alignSelf: 'center',
    paddingVertical: 16,
    paddingBottom: 28,
  },
});
