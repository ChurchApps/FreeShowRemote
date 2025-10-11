import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ShowOption } from '../types';

interface InterfaceCardProps {
  show: ShowOption;
  onPress: () => void;
  onLongPress: () => void;
  size?: 'default' | 'large' | 'xlarge';
}

/**
 * Individual interface card component
 */
const InterfaceCard: React.FC<InterfaceCardProps> = ({
  show,
  onPress,
  onLongPress,
  size = 'default',
}) => {
  const isDisabled = !show.port || show.port === 0;

  const isLarge = size === 'large';
  const isXL = size === 'xlarge';

  /**
   * Renders the card content (icon, title, description, port)
   */
  const CardContent = () => (
    <>
      <View style={styles.cardHeader}>
        <View style={[
          styles.cardIcon,
          isLarge && styles.cardIconLarge,
          isXL && styles.cardIconXL,
          {
            backgroundColor: isDisabled ? `${show.color}08` : `${show.color}15`
          }
        ]}>
          <Ionicons
            name={show.icon as any}
            size={isXL ? 32 : isLarge ? 28 : 24}
            color={isDisabled ? `${show.color}40` : show.color}
          />
        </View>
        {(show.port ?? 0) > 0 && (
          <View style={[styles.portBadge, isXL && styles.portBadgeXL]}>
            <Text style={[styles.portText, isLarge && styles.portTextLarge, isXL && styles.portTextXL, isDisabled && { color: '#666666' }]}>
              {show.port}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, isLarge && styles.cardTitleLarge, isXL && styles.cardTitleXL, isDisabled && { color: '#666666' }]}>
          {show.title || 'Untitled'}
        </Text>
        <Text style={[styles.cardDescription, isLarge && styles.cardDescriptionLarge, isXL && styles.cardDescriptionXL, isDisabled && { color: '#666666' }]}>
          {show.description || 'No description'}
        </Text>
      </View>
    </>
  );

  return (
    <Pressable
      style={({ pressed }) => [
        styles.interfaceCard,
        pressed && styles.interfaceCardPressed,
        isDisabled && styles.disabledCard
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
    >
      <LinearGradient
        colors={[
          `${show.color}10`,
          `${show.color}05`
        ]}
        style={styles.interfaceCardGradient}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={15} style={[styles.cardBlur, isLarge && styles.cardBlurLarge, isXL && styles.cardBlurXL]}>
            <CardContent />
          </BlurView>
        ) : (
          <View style={[styles.cardContent, isLarge && styles.cardContentLarge, isXL && styles.cardContentXL]}>
            <CardContent />
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  interfaceCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  interfaceCardPressed: {
    transform: [{ scale: 0.98 }],
  },
  disabledCard: {
    opacity: 0.6,
  },
  interfaceCardGradient: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardBlur: {
  flex: 1,
  padding: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardBlurLarge: {
  padding: 12,
  },
  cardBlurXL: {
  padding: 14,
  },
  cardContent: {
    flex: 1,
  padding: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardContentLarge: {
  padding: 12,
  },
  cardContentXL: {
  padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardIcon: {
  width: 36,
  height: 36,
  borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIconLarge: {
  width: 40,
  height: 40,
  },
  cardIconXL: {
  width: 48,
  height: 48,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
    letterSpacing: -0.1,
  },
  cardTitleLarge: {
    fontSize: 18,
  },
  cardTitleXL: {
    fontSize: 20,
  },
  cardDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 16,
  },
  cardDescriptionLarge: {
    fontSize: 14,
    lineHeight: 18,
  },
  cardDescriptionXL: {
    fontSize: 16,
    lineHeight: 20,
  },
  portBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  portBadgeXL: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  portText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  portTextLarge: {
    fontSize: 13,
  },
  portTextXL: {
    fontSize: 14,
  },
});

export default InterfaceCard;
