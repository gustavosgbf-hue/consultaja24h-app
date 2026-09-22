const { withPlugins, withProjectBuildGradle, withAppBuildGradle, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const googleServicesClassPath = 'com.google.gms:google-services';
const googleServicesPlugin = 'com.google.gms.google-services';
const googleServicesVersion = '4.5.0';

function withBuildscriptDependency(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy' && !config.modResults.contents.includes(googleServicesClassPath)) {
      config.modResults.contents = config.modResults.contents.replace(
        /dependencies\s?{/,
        `dependencies {
        classpath '${googleServicesClassPath}:${googleServicesVersion}'`
      );
    }
    return config;
  });
}

function withApplyGoogleServicesPlugin(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      const pattern = new RegExp(`apply\\s+plugin:\\s+['"]${googleServicesPlugin}['"]`);
      if (!config.modResults.contents.match(pattern)) {
        config.modResults.contents += `
apply plugin: '${googleServicesPlugin}'`;
      }
    }
    return config;
  });
}

function withCopyAndroidGoogleServices(config) {
  return withDangerousMod(config, ['android', async (config) => {
    if (!config.android?.googleServicesFile) {
      throw new Error('expo.android.googleServicesFile is required for Android Firebase.');
    }
    const src = path.resolve(config.modRequest.projectRoot, config.android.googleServicesFile);
    const dest = path.resolve(config.modRequest.platformProjectRoot, 'app/google-services.json');
    await fs.promises.copyFile(src, dest);
    return config;
  }]);
}

module.exports = function withRnFirebaseAndroid(config) {
  return withPlugins(config, [
    withBuildscriptDependency,
    withApplyGoogleServicesPlugin,
    withCopyAndroidGoogleServices,
  ]);
};
