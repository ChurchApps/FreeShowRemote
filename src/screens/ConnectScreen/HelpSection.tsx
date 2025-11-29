import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../../theme/FreeShowTheme';

interface HelpSectionProps {
  isConnected: boolean;
}

const HelpSection: React.FC<HelpSectionProps> = ({ isConnected }) => {
  const { t } = useTranslation();

  if (isConnected) {
    return null;
  }

  return (
    <View style={styles.helpCard}>
      <View style={styles.helpHeader}>
        <Ionicons name="help-circle-outline" size={20} color={FreeShowTheme.colors.secondary} />
        <Text style={styles.helpTitle}>{t('connectionHelp.title')}</Text>
      </View>
      <Text style={styles.helpText}>
        {'\u2022 ' + t('connectionHelp.sameNetwork') + '\n'}
        {'\u2022 ' + t('connectionHelp.useLocalIP')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  helpCard: {
    backgroundColor: FreeShowTheme.colors.primaryDarker + '80',
    borderRadius: FreeShowTheme.borderRadius.lg,
    padding: FreeShowTheme.spacing.lg,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter + '60',
  },
  helpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: FreeShowTheme.spacing.md,
  },
  helpTitle: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
    marginLeft: FreeShowTheme.spacing.sm,
  },
  helpText: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    lineHeight: 20,
  },
});

export default HelpSection;