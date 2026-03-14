import { Text as DefaultText, View as DefaultView, StyleSheet } from 'react-native';
import { theme } from '../theme';

export type TextProps = DefaultText['props'];
export type ViewProps = DefaultView['props'];

export function Text(props: TextProps) {
  const { style, ...otherProps } = props;
  return <DefaultText style={[{ color: theme.colors.textPrimary, fontFamily: 'System' }, style]} {...otherProps} />;
}

export function View(props: ViewProps) {
  const { style, ...otherProps } = props;
  return <DefaultView style={[{ backgroundColor: theme.colors.bgPrimary }, style]} {...otherProps} />;
}

export function Card(props: ViewProps) {
  const { style, ...otherProps } = props;
  return (
    <DefaultView 
      style={[
        { 
          backgroundColor: theme.colors.bgCard, 
          borderRadius: 12, 
          padding: theme.spacing.md,
          borderWidth: 1,
          borderColor: theme.colors.borderColor
        }, 
        style
      ]} 
      {...otherProps} 
    />
  );
}

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgPrimary,
    padding: theme.spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: theme.spacing.md,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  accentText: {
    color: theme.colors.accentPrimary,
  }
});
