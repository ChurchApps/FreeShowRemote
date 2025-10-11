import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Animated, PanResponder } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { ShowOption } from '../types';

interface CompactPopupProps {
  visible: boolean;
  show: ShowOption | null;
  connectionHost: string | null;
  onClose: () => void;
  onCopyToClipboard: (show: ShowOption) => void;
  onOpenInBrowser: (show: ShowOption) => void;
  onOpenShow: (show: ShowOption) => void;
  onEnableInterface?: (show: ShowOption) => void;
  onDisableInterface?: (show: ShowOption) => void;
}

const CompactPopup: React.FC<CompactPopupProps> = ({
  visible,
  show,
  connectionHost,
  onClose,
  onCopyToClipboard,
  onOpenInBrowser,
  onOpenShow,
  onEnableInterface,
  onDisableInterface,
}) => {
  // Get safe area insets
  const insets = useSafeAreaInsets();
  
  // Animation values
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  // Check if interface is disabled
  const isDisabled = show && (!show.port || show.port === 0);

  // Handle modal visibility changes with animation
  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 8,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 8,
      }).start();
    }
  }, [visible, slideAnim]);

  // PanResponder for swipe-to-close functionality
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to vertical gestures
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 10;
      },
      onPanResponderGrant: () => {
        // Start tracking the gesture
      },
      onPanResponderMove: (evt, gestureState) => {
        // Only allow downward movement (positive dy values)
        if (gestureState.dy > 0) {
          // Calculate the new position based on swipe distance
          const newPosition = Math.max(0, 1 - gestureState.dy / 150);
          slideAnim.setValue(newPosition);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        // If swiped down more than 80px, close the popup (adjusted for new animation)
        if (gestureState.dy > 80) {
          onClose();
        } else {
          // Otherwise, animate back to original position
          Animated.spring(slideAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 65,
            friction: 8,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        // If gesture is terminated, animate back to original position
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 8,
        }).start();
      },
    })
  );
  
  const modalTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0], // Reduced from 600 to 400 to prevent cutting off
  });

  return (
    <Modal
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      transparent={true}
    >
      <SafeAreaView style={styles.compactBackdrop} edges={['bottom']}>
        <Animated.View
          style={[
            styles.compactBackdropTouchable,
            { opacity: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.compactPopupContainer,
            { 
              transform: [{ translateY: modalTranslateY }],
              marginBottom: 0 // Ensure no extra margin
            }
          ]}
          {...panResponder.current.panHandlers}
        >
          <LinearGradient
            colors={['#0a0a0f', '#0d0d15', '#0f0f18']}
            style={[styles.compactPopupGradient, { paddingBottom: Math.max(24, insets.bottom + 16) }]}
          >
            <View style={styles.compactHandle} />

            <View>
              {/* Enhanced Header with glassmorphism effect */}
              <View style={styles.compactHeader}>
                <BlurView intensity={20} style={styles.compactHeaderBlur}>
                  <View style={styles.compactHeaderContent}>
                    {isDisabled ? (
                      <View style={styles.compactIconWrapper}>
                        <LinearGradient
                          colors={[`${show?.color || '#8B5CF6'}20`, `${show?.color || '#8B5CF6'}10`]}
                          style={styles.compactIconContainer}
                        >
                          <Ionicons
                            name={(show?.icon as any) || 'apps'}
                            size={28}
                            color={show?.color || '#8B5CF6'}
                          />
                        </LinearGradient>
                        <View style={styles.disabledOverlay} />
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.compactIconWrapper}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel="Open interface"
                        onPress={() => {
                          if (show) {
                            onOpenShow(show);
                            onClose();
                          }
                        }}
                      >
                        <LinearGradient
                          colors={[`${show?.color || '#8B5CF6'}20`, `${show?.color || '#8B5CF6'}10`]}
                          style={styles.compactIconContainer}
                        >
                          <Ionicons
                            name={(show?.icon as any) || 'apps'}
                            size={28}
                            color={show?.color || '#8B5CF6'}
                          />
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                    {isDisabled ? (
                      <View style={styles.compactTitleContainer}>
                        <Text style={styles.compactTitle}>{show?.title || 'Interface'}</Text>
                        <Text style={styles.compactSubtitle}>{show?.description || 'No description'}</Text>
                        <Text style={styles.disabledText}>Interface disabled</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.compactTitleContainer}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel="Open interface"
                        onPress={() => {
                          if (show) {
                            onOpenShow(show);
                            onClose();
                          }
                        }}
                      >
                        <Text style={styles.compactTitle}>{show?.title || 'Interface'}</Text>
                        {!!(show?.port) && (
                          <Text
                            style={styles.compactUrlText}
                            numberOfLines={1}
                            ellipsizeMode="middle"
                          >
                            {connectionHost}:{show?.port}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                    {/* Header actions for enabled interfaces */}
                    {!isDisabled && !!(show?.port) && (
                      <View style={styles.compactHeaderActions}>
                        <TouchableOpacity
                          style={styles.compactIconButton}
                          onPress={() => show && onCopyToClipboard(show)}
                          accessibilityRole="button"
                          accessibilityLabel="Copy URL to clipboard"
                          activeOpacity={0.7}
                        >
                          <Ionicons name="copy-outline" size={18} color="#A855F7" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.compactIconButton}
                          onPress={() => show && onOpenInBrowser(show)}
                          accessibilityRole="button"
                          accessibilityLabel="Open in browser"
                          activeOpacity={0.7}
                        >
                          <Ionicons name="globe-outline" size={18} color="#A855F7" />
                        </TouchableOpacity>
                      </View>
                    )}
                    {isDisabled && (
                      <View style={styles.disabledStatusDot} />
                    )}
                  </View>
                </BlurView>
              </View>

              {/* Removed separate connection URL box - URL lives in header */}

              {/* Actions */}
              <View style={styles.compactActions}>
                {isDisabled ? (
                  <TouchableOpacity
                    style={styles.compactActionButton}
                    onPress={() => {
                      if (show && onEnableInterface) {
                        onClose();
                        onEnableInterface(show);
                      }
                    }}
                    accessibilityRole="button"
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#8B5CF6', '#A855F7']}
                      style={styles.compactEnableButton}
                    >
                      <View style={styles.compactButtonContent}>
                        <View style={styles.compactButtonIconContainer}>
                          <Ionicons name="add-circle" size={24} color="white" />
                        </View>
                        <View style={styles.compactButtonTextContainer}>
                          <Text style={styles.compactActionButtonText}>Enable Interface</Text>
                          <Text style={styles.compactActionButtonSubtext}>Start this interface</Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  onDisableInterface && (
                    <TouchableOpacity
                      style={styles.compactActionButton}
                      onPress={() => {
                        if (show && onDisableInterface) {
                          onClose();
                          onDisableInterface(show);
                        }
                      }}
                      accessibilityRole="button"
                      activeOpacity={0.7}
                    >
                      <View style={styles.compactSecondaryButton}>
                        <View style={styles.compactButtonContent}>
                          <View style={styles.compactButtonIconContainer}>
                            <Ionicons name="close-circle-outline" size={24} color="rgba(255,255,255,0.8)" />
                          </View>
                          <View style={styles.compactButtonTextContainer}>
                            <Text style={styles.compactSecondaryButtonText}>Disable Interface</Text>
                            <Text style={styles.compactSecondaryButtonSubtext}>Stop this interface</Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Enhanced Compact popup styles
  compactBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  compactBackdropTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  compactPopupContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 24,
    maxHeight: '70%',
    minHeight: 320,
  },
  compactPopupGradient: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 40, // Increased bottom padding
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  // removed scroll view
  compactHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignSelf: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  compactHeader: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  compactHeaderBlur: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  compactHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'transparent',
  },
  compactIconWrapper: {
    position: 'relative',
    marginRight: 16,
  },
  compactIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  disabledOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#00000040',
    borderRadius: 16,
  },
  compactTitleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  compactTitle: {
    fontSize: FreeShowTheme.fontSize.xl + 2,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: FreeShowTheme.fonts.system,
    marginBottom: 4,
    lineHeight: 28,
  },
  compactSubtitle: {
    fontSize: FreeShowTheme.fontSize.md,
    color: '#ffffffDD',
    fontFamily: FreeShowTheme.fonts.system,
    fontWeight: '500',
    lineHeight: 20,
  },
  compactUrlText: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text + 'DD',
    fontFamily: FreeShowTheme.fonts.system,
    fontWeight: '600',
    lineHeight: 20,
    marginTop: 2,
    flexShrink: 1,
  },
  compactHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  disabledText: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: '#ffffff',
    fontFamily: FreeShowTheme.fonts.system,
    fontWeight: '500',
    marginTop: 4,
  },
  simpleStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2ECC40',
    marginTop: FreeShowTheme.spacing.sm,
    alignSelf: 'center',
  },
  disabledStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F44336',
    marginTop: FreeShowTheme.spacing.sm,
    alignSelf: 'center',
  },
  compactIpContainer: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  compactIpBlur: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  compactIpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  compactStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: FreeShowTheme.spacing.lg,
    paddingVertical: FreeShowTheme.spacing.xs,
    paddingHorizontal: FreeShowTheme.spacing.sm,
    backgroundColor: '#2ECC4020',
    borderRadius: FreeShowTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: '#2ECC4040',
  },
  compactStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2ECC40',
    marginRight: FreeShowTheme.spacing.xs,
  },
  compactStatusText: {
    fontSize: FreeShowTheme.fontSize.xs,
    color: '#2ECC40',
    fontFamily: FreeShowTheme.fonts.system,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compactIpTextContainer: {
    flex: 1,
  },
  compactIpLabel: {
    fontSize: FreeShowTheme.fontSize.xs,
    color: FreeShowTheme.colors.text + '80',
    fontFamily: FreeShowTheme.fonts.system,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  compactIpText: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text + 'DD',
    fontFamily: FreeShowTheme.fonts.system,
    fontWeight: '600',
    lineHeight: 22,
    flexShrink: 1,
  },
  compactClipboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  compactIconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(168,85,247,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)',
  },
  compactClipboardText: {
    fontSize: 14,
    color: '#A855F7',
    fontWeight: '600',
    marginLeft: 6,
  },
  compactActions: {
    flexDirection: 'column',
    gap: 12,
  },
  compactActionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  compactButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  compactButtonIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  compactButtonTextContainer: {
    flex: 1,
  },
  compactPrimaryButton: {
    borderRadius: 16,
  },
  compactEnableButton: {
    borderRadius: 16,
  },
  compactSecondaryButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(20,20,30,0.6)',
  },
  compactActionButtonText: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '700',
    fontFamily: FreeShowTheme.fonts.system,
    color: 'white',
    marginBottom: 2,
  },
  compactActionButtonSubtext: {
    fontSize: FreeShowTheme.fontSize.sm,
    fontWeight: '500',
    fontFamily: FreeShowTheme.fonts.system,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  compactSecondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 2,
  },
  compactSecondaryButtonSubtext: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
  },
});

export default CompactPopup;