import { forwardRef, type ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { Brand, Radius } from '@/constants/brand';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  /** Element rendered inside the field on the right (e.g. a show/hide eye). */
  rightElement?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

/** Labeled text input with consistent Katiwala styling and an error state. */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, rightElement, containerStyle, multiline, style, ...rest },
  ref,
) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.field,
          multiline && styles.fieldMultiline,
          !!error && styles.fieldError,
        ]}>
        <TextInput
          ref={ref}
          multiline={multiline}
          placeholderTextColor={Brand.placeholder}
          style={[styles.input, style]}
          {...rest}
        />
        {rightElement ? <View style={styles.right}>{rightElement}</View> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: { color: Brand.ink, fontSize: 14, fontWeight: '700' },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    backgroundColor: Brand.white,
  },
  fieldMultiline: { minHeight: 94, alignItems: 'flex-start', paddingVertical: 4 },
  fieldError: { borderColor: Brand.danger },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, color: Brand.ink },
  right: { paddingLeft: 8 },
  error: { color: Brand.danger, fontSize: 12, fontWeight: '600' },
});
