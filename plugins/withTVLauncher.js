const { withAndroidManifest } = require('@expo/config-plugins');

const withTVLauncher = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;

    if (!androidManifest.manifest['uses-feature']) {
      androidManifest.manifest['uses-feature'] = [];
    }

    const usesFeatures = androidManifest.manifest['uses-feature'];

    // Touchscreen not required for TV support
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

    // Leanback not required to indicate TV support
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

    // Camera not required to support devices without cameras
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

    // Camera autofocus not required
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

    // Microphone not required to support devices without microphones
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

    const mainActivity = application.activity.find(
      (activity) =>
        activity['$'] &&
        (activity['$']['android:name'] === '.MainActivity' ||
         activity['$']['android:name'] === 'MainActivity')
    );

    if (!mainActivity || !mainActivity['intent-filter']) {
      return config;
    }

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
      const hasLeanbackLauncher = launcherIntentFilter.category?.some(
        (category) => category['$']?.['android:name'] === 'android.intent.category.LEANBACK_LAUNCHER'
      );

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
