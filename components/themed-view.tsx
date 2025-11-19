import { View, type ViewProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, pointerEvents, ...otherProps }: ThemedViewProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  // Mover pointerEvents al style para evitar el warning en react-native-web
  const viewStyle = pointerEvents 
    ? [{ backgroundColor }, style, { pointerEvents }]
    : [{ backgroundColor }, style];

  return <View style={viewStyle} {...otherProps} />;
}
