import { useState } from 'react';
import { ShowOption } from '../types';

/**
 * Modal state management hook for interface-related modals
 */
export const useModalState = () => {
  // Disconnect confirmation modal
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  // Error modal state
  const [errorModal, setErrorModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({
    visible: false,
    title: '',
    message: ''
  });

  // Compact popup modal
  const [compactPopup, setCompactPopup] = useState<{
    visible: boolean;
    show: ShowOption | null;
  }>({ visible: false, show: null });

  // Disabled interface modal
  const [disabledInterfaceModal, setDisabledInterfaceModal] = useState<{
    visible: boolean;
    show: ShowOption | null;
  }>({ visible: false, show: null });

  // Enable interface modal (for port input)
  const [enableInterfaceModal, setEnableInterfaceModal] = useState<{
    visible: boolean;
    show: ShowOption | null;
    port: string;
  }>({ visible: false, show: null, port: '' });

  /**
   * Shows disconnect confirmation modal
   */
  const showDisconnectConfirmModal = () => {
    setShowDisconnectConfirm(true);
  };

  /**
   * Hides disconnect confirmation modal
   */
  const hideDisconnectConfirmModal = () => {
    setShowDisconnectConfirm(false);
  };

  /**
   * Shows error modal with specified message
   */
  const showErrorModal = (title: string, message: string) => {
    setErrorModal({ visible: true, title, message });
  };

  /**
   * Hides error modal
   */
  const hideErrorModal = () => {
    setErrorModal({ visible: false, title: '', message: '' });
  };

  /**
   * Shows compact popup for interface options
   */
  const showCompactPopup = (show: ShowOption) => {
    setCompactPopup({ visible: true, show });
  };

  /**
   * Hides compact popup
   */
  const hideCompactPopup = () => {
    setCompactPopup({ visible: false, show: null });
  };

  /**
   * Shows disabled interface modal
   */
  const showDisabledInterfaceModal = (show: ShowOption) => {
    setDisabledInterfaceModal({ visible: true, show });
    hideCompactPopup(); // Close compact popup when opening disabled modal
  };

  /**
   * Hides disabled interface modal
   */
  const hideDisabledInterfaceModal = () => {
    setDisabledInterfaceModal({ visible: false, show: null });
  };

  /**
   * Shows enable interface modal with default port
   */
  const showEnableInterfaceModal = (show: ShowOption, defaultPort: string) => {
    setEnableInterfaceModal({ visible: true, show, port: defaultPort });
  };

  /**
   * Hides enable interface modal
   */
  const hideEnableInterfaceModal = () => {
    setEnableInterfaceModal({ visible: false, show: null, port: '' });
  };

  return {
    // Modal states
    showDisconnectConfirm,
    errorModal,
    compactPopup,
    disabledInterfaceModal,
    enableInterfaceModal,

    // Modal handlers
    showDisconnectConfirmModal,
    hideDisconnectConfirmModal,
    showErrorModal,
    hideErrorModal,
    showCompactPopup,
    hideCompactPopup,
    showDisabledInterfaceModal,
    hideDisabledInterfaceModal,
    showEnableInterfaceModal,
    hideEnableInterfaceModal,
  };
};
