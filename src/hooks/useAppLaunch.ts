import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Session-scoped animation flags (reset on cold app start)
let sessionInterfaceIntroAnimated = false;

/**
 * Hook to track app launch state and manage animation preferences
 * Only animates on first-ever app launch, instant navigation thereafter
 */
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

  /**
   * Mark that animation has completed
   */
  const markAnimationComplete = () => {
    setHasAnimated(true);
  };

  // Session-only interface intro animation control
  const shouldInterfaceIntroAnimate = () => sessionInterfaceIntroAnimated === false;

  const markInterfaceIntroComplete = () => {
    sessionInterfaceIntroAnimated = true;
    setHasAnimated(true);
  };

  /**
   * Check if animation should be shown
   */
  const shouldAnimate = () => {
    return isFirstLaunch === true && !hasAnimated;
  };

  /**
   * Get animation duration based on launch state
   */
  const getAnimationDuration = () => {
    // Animate interface intro once per session even if not first-ever launch
    if (shouldInterfaceIntroAnimate()) return 700;
    return shouldAnimate() ? 800 : 0;
  };

  /**
   * Get slide animation duration
   */
  const getSlideDuration = () => {
    if (shouldInterfaceIntroAnimate()) return 500;
    return shouldAnimate() ? 600 : 0;
  };

  /**
   * Check if we're still determining launch status
   */
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
    // Session-scoped interface intro helpers
    shouldInterfaceIntroAnimate,
    markInterfaceIntroComplete,
  };
};
