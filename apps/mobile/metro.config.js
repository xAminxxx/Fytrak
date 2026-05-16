const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure fonts and images are included in the asset extensions
config.resolver.assetExtensions.push('ttf', 'otf', 'png', 'jpg', 'jpeg', 'svg');

module.exports = config;
