import { Text as DefaultText, View as DefaultView, StyleSheet } from 'react-native';
import { theme } from '../theme';

export type TextProps = DefaultText['props'];
export type ViewProps = DefaultView['props'];

export function Text(props: TextProps) {
  const { style, ...otherProps } = props;
  return (
    <DefaultText
      style={[
        {
          color: theme.colors.textPrimary,
          fontFamily: theme.fonts.body,
          fontSize: theme.typography.body,
          lineHeight: theme.typography.body * 1.4,
        },
        style,
      ]}
      {...otherProps}
    />
  );
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
          borderRadius: theme.radii.md,
          padding: theme.spacing.md,
          borderWidth: 1,
          borderColor: theme.colors.borderColor,
          shadowColor: theme.colors.glow,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.16,
          shadowRadius: 22,
          elevation: 7,
        },
        style,
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
    fontSize: theme.typography.heading2,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.heading,
    marginBottom: theme.spacing.md,
  },
  subtitle: {
    fontSize: theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  accentText: {
    color: theme.colors.accentPrimary,
    fontFamily: theme.fonts.heading,
  },
});
