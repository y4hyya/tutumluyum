// https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The self-contained pdf.js extractor page ships as a bundled asset.
config.resolver.assetExts.push('html');

module.exports = config;
