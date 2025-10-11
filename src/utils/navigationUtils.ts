import { Dimensions } from 'react-native';

export interface NavigationLayoutInfo {
  isFloatingNav: boolean;
  isMobileSidebar: boolean;
  isTablet: boolean;
  shouldSkipSafeArea: boolean;
}

export const getNavigationLayoutInfo = (navigationLayout?: 'bottomBar' | 'sidebar' | 'floating'): NavigationLayoutInfo => {
  const screenWidth = Dimensions.get('window').width;
  const isTablet = screenWidth >= 768;
  const isFloatingNav = navigationLayout === 'floating';
  const isMobileSidebar = navigationLayout === 'sidebar' && !isTablet;
  const shouldSkipSafeArea = isFloatingNav || isMobileSidebar;

  return {
    isFloatingNav,
    isMobileSidebar,
    isTablet,
    shouldSkipSafeArea,
  };
};

export const getBottomPadding = (isFloatingNav: boolean): number => {
  return isFloatingNav ? 120 : 40;
};
