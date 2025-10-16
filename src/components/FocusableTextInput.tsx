import React, { useState, useRef, useEffect, forwardRef } from 'react';
import {
  TextInput,
  TextInputProps,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputFocusEventData,
} from 'react-native';
import { FreeShowTheme } from '../theme/FreeShowTheme';

type FocusableTextInputProps = TextInputProps & {
  autoFocus?: boolean;
};

const FocusableTextInput = forwardRef<TextInput, FocusableTextInputProps>(
  ({ style, autoFocus, onFocus, onBlur, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<TextInput>(null);

    useEffect(() => {
      if (autoFocus && inputRef.current) {
        const timeout = setTimeout(() => {
          inputRef.current?.focus();
        }, 300);
        return () => clearTimeout(timeout);
      }
    }, [autoFocus]);

    const handleFocus = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    return (
    // @ts-ignore
      <TextInput
        ref={(node) => {
          inputRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as React.MutableRefObject<TextInput | null>).current = node;
        }}
        {...props}
        focusable={true}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={[
          styles.input,
          style,
          isFocused && styles.focusedInput,
        ]}
      />
    );
  }
);

const styles = StyleSheet.create({
  input: {
    height: 48,
    borderRadius: FreeShowTheme.borderRadius.md,
    backgroundColor: FreeShowTheme.colors.primary,
    borderWidth: 2,
    borderColor: FreeShowTheme.colors.primaryLighter,
    color: FreeShowTheme.colors.text,
    fontSize: FreeShowTheme.fontSize.md,
    paddingHorizontal: FreeShowTheme.spacing.md,
  },
  focusedInput: {
    borderColor: '#FFFFFF',
  },
});

export default FocusableTextInput;
