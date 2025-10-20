import React, { useRef } from 'react'
import {
  Animated,
  TouchableOpacity as OriginalOpacity,
  TouchableOpacityProps,
  ViewStyle
} from 'react-native'
import { getDeviceType } from "../utils/navigationUtils"

interface TVTouchableOpacityProps extends TouchableOpacityProps {
  containerStyle?: ViewStyle | ViewStyle[];
}

const TouchableOpacity: React.FC<TVTouchableOpacityProps> = ({
  children,
  style,
  containerStyle = {},
  ...rest
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1.05, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const handleBlur = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const handlePress = () => {
    if (rest.onPress) rest.onPress();
    Animated.timing(opacityAnim, { toValue: 0, duration: 100, useNativeDriver: true }).start();
  };

  const isTV = getDeviceType().isTV;
  if (!isTV) {
    return <OriginalOpacity {...rest} style={style}>{children}</OriginalOpacity>;
  }

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, containerStyle]}>
      <OriginalOpacity
        {...rest}
        style={style}
        onPress={handlePress}
        focusable={true}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        {children}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: '#fff',
            opacity: opacityAnim,
          }}
        />
      </OriginalOpacity>
    </Animated.View>
  );
};

export default TouchableOpacity;
