import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Session-scoped animation flags (reset on cold app start)
let sessionInterfaceIntroAnimated = false;

/** Tracks app launch state and manages animation preferences. */
export const useAppLaunch = () => {
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const hasLaunched = await AsyncStorage.getItem('hasLaunchedBefore');
        if (hasLaunched === null) {
          // First launch ever
          setIsFirstLaunch(true);
          await AsyncStorage.setItem('hasLaunchedBefore', 'true');
        } else {
          // Not first launch
          setIsFirstLaunch(false);
        }
      } catch {
        // If AsyncStorage fails, assume it's not first launch for safety
        setIsFirstLaunch(false);
      }
    };

    checkFirstLaunch();
  }, []);

  const markAnimationComplete = () => {
    setHasAnimated(true);
  };

  const shouldInterfaceIntroAnimate = () => sessionInterfaceIntroAnimated === false;

  const markInterfaceIntroComplete = () => {
    sessionInterfaceIntroAnimated = true;
    setHasAnimated(true);
  };

  const shouldAnimate = () => {
    return isFirstLaunch === true && !hasAnimated;
  };

  const getAnimationDuration = () => {
    if (shouldInterfaceIntroAnimate()) return 700;
    return shouldAnimate() ? 800 : 0;
  };

  const getSlideDuration = () => {
    if (shouldInterfaceIntroAnimate()) return 500;
    return shouldAnimate() ? 600 : 0;
  };

  const isLoading = () => {
    return isFirstLaunch === null;
  };

  return {
    isFirstLaunch,
    hasAnimated,
    shouldAnimate,
    getAnimationDuration,
    getSlideDuration,
    markAnimationComplete,
    isLoading,
    shouldInterfaceIntroAnimate,
    markInterfaceIntroComplete,
  };
};
