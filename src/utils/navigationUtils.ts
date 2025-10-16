import { Dimensions, Platform } from 'react-native';

export interface NavigationLayoutInfo {
  isFloatingNav: boolean;
  isMobileSidebar: boolean;
  isTablet: boolean;
  shouldSkipSafeArea: boolean;
  isTV: boolean;
}

export const getNavigationLayoutInfo = (navigationLayout?: 'bottomBar' | 'sidebar' | 'floating'): NavigationLayoutInfo => {
  const screenWidth = Dimensions.get('window').width;
  const isTV = Platform.isTV;
  const isTablet = screenWidth >= 768 && !isTV;
  const isFloatingNav = navigationLayout === 'floating';
  const isMobileSidebar = navigationLayout === 'sidebar' && !isTablet;
  const shouldSkipSafeArea = isFloatingNav || isMobileSidebar;

  return {
    isFloatingNav,
    isMobileSidebar,
    isTablet,
    isTV,
    shouldSkipSafeArea,
  };
};

export const getBottomPadding = (isFloatingNav: boolean): number => {
  return isFloatingNav ? 120 : 40;
};
