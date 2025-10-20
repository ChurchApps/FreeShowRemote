const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Add LEANBACK_LAUNCHER category to the main activity intent filter
 * and add TV/touchscreen/camera/microphone feature declarations as optional
 * This is required for the app to appear on Android TV and Fire TV devices
 * and to be available on devices without cameras/microphones
 */
const withTVLauncher = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;

    // Add uses-feature declarations
    if (!androidManifest.manifest['uses-feature']) {
      androidManifest.manifest['uses-feature'] = [];
    }

    const usesFeatures = androidManifest.manifest['uses-feature'];

    // Add touchscreen feature (not required) for TV support
    const hasTouchscreen = usesFeatures.some(
      (feature) => feature['$']?.['android:name'] === 'android.hardware.touchscreen'
    );
    if (!hasTouchscreen) {
      usesFeatures.push({
        $: {
          'android:name': 'android.hardware.touchscreen',
          'android:required': 'false'
        }
      });
    }

    // Add leanback feature (not required) to indicate TV support
    const hasLeanback = usesFeatures.some(
      (feature) => feature['$']?.['android:name'] === 'android.software.leanback'
    );
    if (!hasLeanback) {
      usesFeatures.push({
        $: {
          'android:name': 'android.software.leanback',
          'android:required': 'false'
        }
      });
    }

    // Add camera feature (not required) to support devices without cameras
    const hasCamera = usesFeatures.some(
      (feature) => feature['$']?.['android:name'] === 'android.hardware.camera'
    );
    if (!hasCamera) {
      usesFeatures.push({
        $: {
          'android:name': 'android.hardware.camera',
          'android:required': 'false'
        }
      });
    }

    // Add camera autofocus feature (not required)
    const hasCameraAutofocus = usesFeatures.some(
      (feature) => feature['$']?.['android:name'] === 'android.hardware.camera.autofocus'
    );
    if (!hasCameraAutofocus) {
      usesFeatures.push({
        $: {
          'android:name': 'android.hardware.camera.autofocus',
          'android:required': 'false'
        }
      });
    }

    // Add microphone feature (not required) to support devices without microphones
    const hasMicrophone = usesFeatures.some(
      (feature) => feature['$']?.['android:name'] === 'android.hardware.microphone'
    );
    if (!hasMicrophone) {
      usesFeatures.push({
        $: {
          'android:name': 'android.hardware.microphone',
          'android:required': 'false'
        }
      });
    }

    const application = androidManifest.manifest.application[0];

    if (!application.activity) {
      return config;
    }

    // Find the main activity
    const mainActivity = application.activity.find(
      (activity) =>
        activity['$'] &&
        (activity['$']['android:name'] === '.MainActivity' ||
         activity['$']['android:name'] === 'MainActivity')
    );

    if (!mainActivity || !mainActivity['intent-filter']) {
      return config;
    }

    // Find the LAUNCHER intent filter
    const launcherIntentFilter = mainActivity['intent-filter'].find(
      (filter) => {
        const hasMainAction = filter.action?.some(
          (action) => action['$']?.['android:name'] === 'android.intent.action.MAIN'
        );
        const hasLauncherCategory = filter.category?.some(
          (category) => category['$']?.['android:name'] === 'android.intent.category.LAUNCHER'
        );
        return hasMainAction && hasLauncherCategory;
      }
    );

    if (launcherIntentFilter) {
      // Check if LEANBACK_LAUNCHER is already present
      const hasLeanbackLauncher = launcherIntentFilter.category?.some(
        (category) => category['$']?.['android:name'] === 'android.intent.category.LEANBACK_LAUNCHER'
      );

      // Add LEANBACK_LAUNCHER category if not present
      if (!hasLeanbackLauncher) {
        if (!launcherIntentFilter.category) {
          launcherIntentFilter.category = [];
        }
        launcherIntentFilter.category.push({
          $: { 'android:name': 'android.intent.category.LEANBACK_LAUNCHER' }
        });
      }
    }

    return config;
  });
};

module.exports = withTVLauncher;
