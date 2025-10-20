import React, { useRef, useState } from 'react';
import { Animated, Platform, Pressable, ViewStyle } from 'react-native';
import { getDeviceType } from "../utils/navigationUtils"

interface TVFocusableProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  onPress?: () => void;
  onLongPress?: () => void;
  hasTVPreferredFocus?: boolean;
  disabled?: boolean;
  containerStyle?: ViewStyle
}

const TVFocusable: React.FC<TVFocusableProps> = ({
  children,
  style,
  onPress,
  onLongPress,
  containerStyle = {},
  disabled = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1.02, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  };

  const handlePress = () => {
    // Animated.timing(opacityAnim, {
    //   toValue: 0,
    //   duration: 100,
    //   useNativeDriver: true,
    // }).start();

    if (onPress) onPress();
  };

  const handleBlur = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const isTV = getDeviceType().isTV;
  if (isTV === false) {
    return children as React.ReactElement;
  } 

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        containerStyle && {...containerStyle},
        {margin: 3}
      ]}
    >
      <Pressable
        style={style}
        onPress={handlePress}
        onLongPress={onLongPress}
        focusable={isTV}
        onFocus={isTV ? handleFocus : undefined}
        onBlur={isTV ? handleBlur : undefined}
        disabled={disabled}
      >
        <>
          {children}
          {isTV && (
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#fff',
                opacity: opacityAnim,
                shadowColor: '#fff',
                shadowOpacity: 0.8,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 0 },
              }}
            />
          )}
        </>
      </Pressable>
    </Animated.View>
  );
};

export default TVFocusable;
