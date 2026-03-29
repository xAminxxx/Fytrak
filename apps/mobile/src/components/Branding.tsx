import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

interface BrandingProps {
  width?: number;
  height?: number;
  style?: StyleProp<ImageStyle>;
  variant?: 'light' | 'dark';
}

/**
 * AppLogo component using the high-resolution branding assets.
 * Default variant is 'light' as requested for splash/welcome.
 */
export const AppLogo = ({ 
  width = 180, 
  height = 80, 
  style,
  variant = 'light' 
}: BrandingProps) => {
  const source = variant === 'light' 
    ? require('../../assets/branding/raster/logo_full_light.png')
    : require('../../assets/branding/raster/logo_full_dark.png');

  return (
    <Image 
      source={source}
      style={[
        { width, height },
        style
      ]}
      resizeMode="contain"
    />
  );
};

export const CompanyIcon = ({ 
  size = 64,
  style 
}: { 
  size?: number, 
  style?: StyleProp<ImageStyle> 
}) => {
  return (
    <Image 
      source={require('../../assets/branding/raster/icon_white_symbol.png')}
      style={[
        { width: size, height: size },
        style
      ]}
      resizeMode="contain"
    />
  );
};
