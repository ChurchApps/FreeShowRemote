import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { ShowOption } from '../types';
import { configService } from '../config/AppConfig';

const getResponsiveDimensions = () => {
  const { width, height } = Dimensions.get('window');
  const isTablet = Math.min(width, height) > 600;
  const isLandscape = width > height;
  
  return {
    isTablet,
    isLandscape,
    screenWidth: width,
    screenHeight: height,
  };
};

interface ShowSwitcherProps {
  currentTitle: string;
  currentShowId: string;
  connectionHost: string;
  showPorts?: {
    remote: number;
    stage: number;
    control: number;
    output: number;
    api: number;
  };
  onShowSelect: (show: ShowOption) => void;
}

const ShowSwitcher: React.FC<ShowSwitcherProps> = ({
  currentTitle,
  currentShowId,
  showPorts,
  onShowSelect,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [dimensions, setDimensions] = useState(getResponsiveDimensions());

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      setDimensions(getResponsiveDimensions());
    });

    return () => subscription?.remove();
  }, []);

  const defaultPorts = useMemo(() => configService.getConfig().defaultShowPorts, []);

  const showOptions = useMemo((): ShowOption[] => {
    const actualPorts = showPorts || defaultPorts;

    const allOptions = [
      ...configService.getInterfaceConfigs().map(config => ({
        id: config.id,
        title: config.title,
        description: config.description,
        port: actualPorts[config.id as keyof typeof actualPorts] || 0,
        icon: config.icon,
        color: config.color,
      })),
    ];

    // Filter out disabled interfaces (those with port <= 0)
    return allOptions.filter(option => option.port && option.port > 0);
  }, [showPorts, defaultPorts]);

  const currentShow = useMemo(() => {
    return showOptions.find(show => show.id === currentShowId);
  }, [showOptions, currentShowId]);

  const handleShowSelect = useCallback((show: ShowOption) => {
    setModalVisible(false);
    onShowSelect(show);
  }, [onShowSelect]);

  const handleOpenModal = useCallback(() => {
    setModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  return (
    <>
      <TouchableOpacity
        style={[
          styles.titleContainer,
          {
            marginHorizontal: dimensions.isTablet ? FreeShowTheme.spacing.lg : FreeShowTheme.spacing.md,
            gap: dimensions.isTablet ? FreeShowTheme.spacing.sm : FreeShowTheme.spacing.xs,
          }
        ]}
        onPress={handleOpenModal}
        activeOpacity={1.0}
      >
        <Text style={[
          styles.title,
          { fontSize: dimensions.isTablet ? FreeShowTheme.fontSize.lg : FreeShowTheme.fontSize.md }
        ]}>
          {currentTitle}
        </Text>
        <Ionicons 
          name="chevron-down" 
          size={dimensions.isTablet ? 20 : 16} 
          color={FreeShowTheme.colors.text + '99'} 
        />
      </TouchableOpacity>

      <Modal
        animationType="none"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleCloseModal}
      >
        <View style={[
          styles.modalOverlay,
          { padding: dimensions.isTablet ? FreeShowTheme.spacing.xl : FreeShowTheme.spacing.lg }
        ]}>
          <TouchableOpacity
            style={styles.backgroundTouchable}
            activeOpacity={1.0}
            onPress={handleCloseModal}
          />
          <View style={[
            styles.modalContent,
            {
              maxWidth: dimensions.isTablet ? 500 : 400,
              minHeight: dimensions.isTablet ? 480 : 400,
              borderRadius: dimensions.isTablet ? FreeShowTheme.borderRadius.xl * 1.5 : FreeShowTheme.borderRadius.xl,
              overflow: 'hidden',
            }
          ]}>
            <View style={[
              styles.modalHeader,
              { padding: dimensions.isTablet ? FreeShowTheme.spacing.xl : FreeShowTheme.spacing.lg }
            ]}>
              <Text style={[
                styles.modalTitle,
                { fontSize: dimensions.isTablet ? FreeShowTheme.fontSize.xl : FreeShowTheme.fontSize.lg }
              ]}>
                Switch Interface
              </Text>
              <TouchableOpacity
                onPress={handleCloseModal}
                style={[
                  styles.closeButton,
                  { padding: dimensions.isTablet ? FreeShowTheme.spacing.sm : FreeShowTheme.spacing.xs }
                ]}
              >
                <Ionicons 
                  name="close" 
                  size={dimensions.isTablet ? 28 : 24} 
                  color={FreeShowTheme.colors.text} 
                />
              </TouchableOpacity>
            </View>

            {currentShow && (
              <View style={[
                styles.currentShowSection,
                {
                  padding: dimensions.isTablet ? FreeShowTheme.spacing.xl : FreeShowTheme.spacing.lg,
                  paddingBottom: dimensions.isTablet ? FreeShowTheme.spacing.lg : FreeShowTheme.spacing.md,
                }
              ]}>
                <Text style={[
                  styles.sectionTitle,
                  { fontSize: dimensions.isTablet ? FreeShowTheme.fontSize.md : FreeShowTheme.fontSize.sm }
                ]}>
                  Current
                </Text>
                <View style={[
                  styles.showCard,
                  {
                    marginBottom: dimensions.isTablet ? FreeShowTheme.spacing.md : FreeShowTheme.spacing.sm,
                  }
                ]}>
                  <LinearGradient
                    colors={[
                      `${currentShow.color}12`,
                      `${currentShow.color}08`
                    ]}
                    style={styles.showCardGradient}
                  >
                        {Platform.OS === 'ios' ? (
                          <BlurView intensity={15} style={[
                            styles.showCardBlur,
                            styles.compactCard,
                            { padding: FreeShowTheme.spacing.md }
                          ]}>
                            <View style={styles.compactCardContent}>
                              <View style={[
                                styles.showIconContainer,
                                styles.compactIcon,
                                { backgroundColor: currentShow.color + '20' }
                              ]}>
                                <Ionicons
                                  name={currentShow.icon as any}
                                  size={20}
                                  color={currentShow.color}
                                />
                              </View>
                              <View style={styles.compactInfo}>
                                <Text style={[styles.compactTitle, { color: currentShow.color }]}>
                                  {currentShow.title}
                                </Text>
                              </View>
                              <View style={styles.compactActions}>
                                {currentShow.port > 0 && (
                                  <View style={styles.compactPortBadge}>
                                    <Text style={styles.compactPortText}>{currentShow.port}</Text>
                                  </View>
                                )}
                                <Ionicons
                                  name="checkmark-circle"
                                  size={18}
                                  color={currentShow.color}
                                />
                              </View>
                            </View>
                          </BlurView>
                        ) : (
                          <View style={[
                            styles.showCardContent,
                            styles.compactCard,
                            { 
                              padding: FreeShowTheme.spacing.md,
                              backgroundColor: 'rgba(255,255,255,0.03)'
                            }
                          ]}>
                            <View style={styles.compactCardContent}>
                              <View style={[
                                styles.showIconContainer,
                                styles.compactIcon,
                                { backgroundColor: currentShow.color + '20' }
                              ]}>
                                <Ionicons
                                  name={currentShow.icon as any}
                                  size={20}
                                  color={currentShow.color}
                                />
                              </View>
                              <View style={styles.compactInfo}>
                                <Text style={[styles.compactTitle, { color: currentShow.color }]}>
                                  {currentShow.title}
                                </Text>
                              </View>
                              <View style={styles.compactActions}>
                                {currentShow.port > 0 && (
                                  <View style={styles.compactPortBadge}>
                                    <Text style={styles.compactPortText}>{currentShow.port}</Text>
                                  </View>
                                )}
                                <Ionicons
                                  name="checkmark-circle"
                                  size={18}
                                  color={currentShow.color}
                                />
                              </View>
                            </View>
                          </View>
                        )}
                  </LinearGradient>
                </View>
              </View>
            )}

            <View style={[
              styles.otherShowsSection,
              {
                padding: dimensions.isTablet ? FreeShowTheme.spacing.xl : FreeShowTheme.spacing.lg,
                paddingTop: 0,
              }
            ]}>
              <Text style={[
                styles.sectionTitle,
                { fontSize: dimensions.isTablet ? FreeShowTheme.fontSize.md : FreeShowTheme.fontSize.sm }
              ]}>
                Available Interfaces
              </Text>
              <View style={styles.showsList}>
                {showOptions.map((show) => {
                  // Skip current show
                  if (show.id === currentShowId) return null;
                  
                  return (
                    <Pressable
                      key={show.id}
                      onPress={() => handleShowSelect(show)}
                      style={({ pressed }) => [
                        styles.showCard,
                        {
                          marginBottom: dimensions.isTablet ? FreeShowTheme.spacing.md : FreeShowTheme.spacing.sm,
                          transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
                        }
                      ]}
                    >
                      <LinearGradient
                        colors={[
                          `${show.color}10`,
                          `${show.color}05`
                        ]}
                        style={styles.showCardGradient}
                      >
                        {Platform.OS === 'ios' ? (
                          <BlurView intensity={15} style={[
                            styles.showCardBlur,
                            styles.compactCard,
                            { padding: FreeShowTheme.spacing.md }
                          ]}>
                            <View style={styles.compactCardContent}>
                              <View style={[
                                styles.showIconContainer,
                                styles.compactIcon,
                                { backgroundColor: show.color + '15' }
                              ]}>
                                <Ionicons
                                  name={show.icon as any}
                                  size={20}
                                  color={show.color}
                                />
                              </View>
                              <View style={styles.compactInfo}>
                                <Text style={styles.compactTitle}>
                                  {show.title}
                                </Text>
                              </View>
                              <View style={styles.compactActions}>
                                {show.port > 0 && (
                                  <View style={styles.compactPortBadge}>
                                    <Text style={styles.compactPortText}>{show.port}</Text>
                                  </View>
                                )}
                                <Ionicons
                                  name="chevron-forward"
                                  size={16}
                                  color={FreeShowTheme.colors.text + '66'}
                                />
                              </View>
                            </View>
                          </BlurView>
                        ) : (
                          <View style={[
                            styles.showCardContent,
                            styles.compactCard,
                            { 
                              padding: FreeShowTheme.spacing.md,
                              backgroundColor: 'rgba(255,255,255,0.02)'
                            }
                          ]}>
                            <View style={styles.compactCardContent}>
                              <View style={[
                                styles.showIconContainer,
                                styles.compactIcon,
                                { backgroundColor: show.color + '15' }
                              ]}>
                                <Ionicons
                                  name={show.icon as any}
                                  size={20}
                                  color={show.color}
                                />
                              </View>
                              <View style={styles.compactInfo}>
                                <Text style={styles.compactTitle}>
                                  {show.title}
                                </Text>
                              </View>
                              <View style={styles.compactActions}>
                                {show.port > 0 && (
                                  <View style={styles.compactPortBadge}>
                                    <Text style={styles.compactPortText}>{show.port}</Text>
                                  </View>
                                )}
                                <Ionicons
                                  name="chevron-forward"
                                  size={16}
                                  color={FreeShowTheme.colors.text + '66'}
                                />
                              </View>
                            </View>
                          </View>
                        )}
                      </LinearGradient>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
    color: FreeShowTheme.colors.text,
    fontFamily: FreeShowTheme.fonts.system,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    width: '100%',
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: FreeShowTheme.colors.primaryLighter,
  },
  modalTitle: {
    fontWeight: 'bold',
    color: FreeShowTheme.colors.text,
    fontFamily: FreeShowTheme.fonts.system,
  },
  closeButton: {},
  currentShowSection: {},
  otherShowsSection: {},
  sectionTitle: {
    fontWeight: '600',
    color: FreeShowTheme.colors.text + 'CC',
    fontFamily: FreeShowTheme.fonts.system,
    marginBottom: FreeShowTheme.spacing.sm,
    textTransform: 'uppercase',
  },
  showsList: {},
  showCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  showCardGradient: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  showCardBlur: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  showCardContent: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  showCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  showCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  showIconContainer: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showInfo: {
    flex: 1,
  },
  showTitle: {
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
    letterSpacing: -0.1,
  },
  showDescription: {
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 16,
  },
  portBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  portText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  currentIndicator: {
    marginLeft: 8,
  },
  compactCard: {
    height: 60,
  },
  compactCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: '100%',
  },
  compactIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  compactInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  compactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    letterSpacing: -0.1,
  },
  compactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactPortBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  compactPortText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
});

export default ShowSwitcher;
