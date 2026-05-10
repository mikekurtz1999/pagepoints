import { forwardRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { Colors } from '../../constants/colors';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string | null;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(
  ({ label, error, onFocus, onBlur, ...rest }, ref) => {
    const [focused, setFocused] = useState(false);
    return (
      <View style={styles.wrapper}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          ref={ref}
          {...rest}
          placeholderTextColor={Colors.textSubtle}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            focused && styles.inputFocused,
            !!error && styles.inputError,
          ]}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  }
);

TextField.displayName = 'TextField';

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: Colors.text,
    fontSize: 16,
  },
  inputFocused: { borderColor: Colors.primary },
  inputError: { borderColor: Colors.error },
  error: {
    color: Colors.error,
    fontSize: 13,
    marginTop: 6,
  },
});
