import { Dimensions, Platform } from 'react-native';

export interface DeviceType {
  isTV: boolean;
  isTablet: boolean;
  isPhone: boolean;
}

export const getDeviceType = (): DeviceType => {
  const screenWidth = Dimensions.get('window').width;
  const isTV = Platform.isTV;
  const isTablet = screenWidth >= 768 && !isTV;
  const isPhone = !isTV && !isTablet;

  return {
    isTV,
    isTablet,
    isPhone,
  };
};

export const getBottomPadding = (): number => {
  const isTV = getDeviceType().isTV;
  return isTV ? 40 : 120;
};
