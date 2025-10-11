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

  // Enable interface modal
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
   * Shows enable interface modal with default port
   */
  const showEnableInterfaceModal = (show: ShowOption, defaultPort: string) => {
    setEnableInterfaceModal({ visible: true, show, port: defaultPort });
    hideCompactPopup(); // Close compact popup when opening enable modal
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
    enableInterfaceModal,

    // Modal handlers
    showDisconnectConfirmModal,
    hideDisconnectConfirmModal,
    showErrorModal,
    hideErrorModal,
    showCompactPopup,
    hideCompactPopup,
    showEnableInterfaceModal,
    hideEnableInterfaceModal,
  };
};
