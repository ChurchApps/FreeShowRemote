import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { useSettings } from '../contexts';
import { configService } from '../config/AppConfig';

interface ShareQRModalProps {
  visible: boolean;
  onClose: () => void;
  host: string;
  port?: string; // optional fallback
}

// Responsive sizing utility
const getResponsiveDimensions = () => {
  const { width, height } = Dimensions.get('window');
  const isTablet = Math.min(width, height) > 600;
  const isLandscape = width > height;
  
  // Calculate QR size based on device type and orientation
  let qrSize: number;
  let modalMaxWidth: number;
  
  if (isTablet) {
    // Tablet sizing
    qrSize = isLandscape ? Math.min(300, height * 0.4) : Math.min(280, width * 0.4);
    modalMaxWidth = isLandscape ? Math.min(500, width * 0.5) : Math.min(450, width * 0.7);
  } else {
    // Phone sizing
    qrSize = isLandscape ? Math.min(200, height * 0.5) : Math.min(250, width * 0.65);
    modalMaxWidth = isLandscape ? Math.min(400, width * 0.6) : Math.min(350, width * 0.85);
  }
  
  return {
    qrSize,
    modalMaxWidth,
    isTablet,
    isLandscape,
    screenWidth: width,
    screenHeight: height,
  };
};

const ShareQRModal: React.FC<ShareQRModalProps> = ({ visible, onClose, host, port }) => {
  const { history } = useSettings();
  
  // Don't render the modal content if no valid host
  if (!host || host.trim() === '') {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { padding: 40 }]}>
            <Text style={styles.title}>No connection available</Text>
            <TouchableOpacity style={styles.doneButton} onPress={onClose}>
              <Text style={styles.doneButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }
  
  // Memoize default ports
  const defaultPorts = useMemo(() => configService.getDefaultShowPorts(), []);
  
  // Memoize connection lookup
  const connection = useMemo(() => 
    history.find(h => h.host === host),
    [history, host]
  );

  // Memoize payload to prevent recreating on every render
  const payload = useMemo(() => ({
    type: 'freeshow-remote-connection',
    version: 1,
    host,
    nickname: connection?.nickname,
    ports: {
      remote: connection?.showPorts?.remote ?? defaultPorts.remote,
      stage: connection?.showPorts?.stage ?? defaultPorts.stage,
      control: connection?.showPorts?.control ?? defaultPorts.control,
      output: connection?.showPorts?.output ?? defaultPorts.output,
      api: connection?.showPorts?.api ?? Number(port ?? defaultPorts.api),
    },
  }), [host, port, connection?.nickname, connection?.showPorts, defaultPorts]);
  
  const [dimensions, setDimensions] = useState(getResponsiveDimensions());

  // Update dimensions when orientation changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      setDimensions(getResponsiveDimensions());
    });

    return () => subscription?.remove();
  }, []);

  // Recalculate dimensions when modal becomes visible
  useEffect(() => {
    if (visible) {
      setDimensions(getResponsiveDimensions());
    }
  }, [visible]);

  const { qrSize, modalMaxWidth, isTablet } = dimensions;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[
          styles.modalContainer,
          {
            maxWidth: modalMaxWidth,
            paddingHorizontal: isTablet ? FreeShowTheme.spacing.xxl : FreeShowTheme.spacing.xl,
            paddingVertical: isTablet ? FreeShowTheme.spacing.xxl : FreeShowTheme.spacing.xl,
          }
        ]}>
          <View style={styles.header}>
            <Text style={[
              styles.title,
              { fontSize: isTablet ? FreeShowTheme.fontSize.xxl : FreeShowTheme.fontSize.xl }
            ]}>
              Share Connection
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons 
                name="close" 
                size={isTablet ? 28 : 24} 
                color={FreeShowTheme.colors.text} 
              />
            </TouchableOpacity>
          </View>

          <View style={[
            styles.qrContainer,
            {
              padding: isTablet ? FreeShowTheme.spacing.xl : FreeShowTheme.spacing.lg,
              marginBottom: isTablet ? FreeShowTheme.spacing.xxl : FreeShowTheme.spacing.xl,
            }
          ]}>
            <QRCode
              value={JSON.stringify(payload)}
              size={qrSize}
              backgroundColor="white"
              color="black"
            />
          </View>

          <View style={[
            styles.infoContainer,
            { marginBottom: isTablet ? FreeShowTheme.spacing.xxl : FreeShowTheme.spacing.xl }
          ]}>
            <Text style={[
              styles.urlText,
              {
                fontSize: isTablet ? FreeShowTheme.fontSize.lg : FreeShowTheme.fontSize.md,
                marginBottom: isTablet ? FreeShowTheme.spacing.lg : FreeShowTheme.spacing.md,
              }
            ]}>
              {`Sharing details of ${connection?.nickname || host}`}
            </Text>
            <Text style={[
              styles.instructionText,
              {
                fontSize: isTablet ? FreeShowTheme.fontSize.md : FreeShowTheme.fontSize.sm,
                lineHeight: isTablet ? 24 : 20,
              }
            ]}>
              Scan to import this connection (nickname, host, and all ports)
            </Text>
          </View>

          <TouchableOpacity style={[
            styles.doneButton,
            {
              paddingVertical: isTablet ? FreeShowTheme.spacing.lg : FreeShowTheme.spacing.md,
              paddingHorizontal: isTablet ? FreeShowTheme.spacing.xxl : FreeShowTheme.spacing.xl,
            }
          ]} onPress={onClose}>
            <Text style={[
              styles.doneButtonText,
              { fontSize: isTablet ? FreeShowTheme.fontSize.lg : FreeShowTheme.fontSize.md }
            ]}>
              Done
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingVertical: FreeShowTheme.spacing.xl,
  },
  modalContainer: {
    backgroundColor: FreeShowTheme.colors.primary,
    borderRadius: FreeShowTheme.borderRadius.xl,
    width: '100%',
    alignItems: 'center',
    // Removed fixed padding and maxWidth - now handled dynamically
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: FreeShowTheme.spacing.lg, // Reduced for tablets
  },
  title: {
    fontWeight: 'bold',
    color: FreeShowTheme.colors.secondary,
    fontFamily: FreeShowTheme.fonts.system,
    // fontSize now handled dynamically
  },
  closeButton: {
    padding: FreeShowTheme.spacing.sm,
    borderRadius: FreeShowTheme.borderRadius.md,
    backgroundColor: FreeShowTheme.colors.primary + '20',
  },
  qrContainer: {
    backgroundColor: 'white',
    borderRadius: FreeShowTheme.borderRadius.lg,
    // Padding and marginBottom now handled dynamically
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoContainer: {
    alignItems: 'center',
    width: '100%',
    // marginBottom now handled dynamically
  },
  urlText: {
    color: FreeShowTheme.colors.text,
    fontFamily: FreeShowTheme.fonts.system,
    textAlign: 'center',
    fontWeight: '500',
    // fontSize and marginBottom now handled dynamically
  },
  instructionText: {
    color: FreeShowTheme.colors.text + '99',
    fontFamily: FreeShowTheme.fonts.system,
    textAlign: 'center',
    // fontSize and lineHeight now handled dynamically
  },
  doneButton: {
    backgroundColor: FreeShowTheme.colors.secondary,
    borderRadius: FreeShowTheme.borderRadius.lg,
    minWidth: 120,
    alignItems: 'center',
    // Padding now handled dynamically
    shadowColor: FreeShowTheme.colors.secondary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  doneButtonText: {
    color: 'white',
    fontWeight: '600',
    fontFamily: FreeShowTheme.fonts.system,
    // fontSize now handled dynamically
  },
});

export default ShareQRModal;
