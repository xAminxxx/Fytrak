const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure we don't accidentally overwrite important defaults
const {
  resolver: { sourceExtensions, assetExtensions },
} = config;

config.resolver.sourceExtensions = [
  ...sourceExtensions,
  'ts', 'tsx', 'js', 'jsx', 'json',
];

config.resolver.assetExtensions = [
  ...assetExtensions,
  'ttf', 'otf', 'png', 'jpg', 'jpeg', 'svg'
];

module.exports = config;
