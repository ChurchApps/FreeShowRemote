import { useState } from 'react';
import { ShowOption } from '../types';

/** Manages interface-related modal states. */
export const useModalState = () => {
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const [errorModal, setErrorModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({
    visible: false,
    title: '',
    message: ''
  });

  const [compactPopup, setCompactPopup] = useState<{
    visible: boolean;
    show: ShowOption | null;
  }>({ visible: false, show: null });

  const [disabledInterfaceModal, setDisabledInterfaceModal] = useState<{
    visible: boolean;
    show: ShowOption | null;
  }>({ visible: false, show: null });

  const [enableInterfaceModal, setEnableInterfaceModal] = useState<{
    visible: boolean;
    show: ShowOption | null;
    port: string;
  }>({ visible: false, show: null, port: '' });

  const showDisconnectConfirmModal = () => {
    setShowDisconnectConfirm(true);
  };

  const hideDisconnectConfirmModal = () => {
    setShowDisconnectConfirm(false);
  };

  const showErrorModal = (title: string, message: string) => {
    setErrorModal({ visible: true, title, message });
  };

  const hideErrorModal = () => {
    setErrorModal({ visible: false, title: '', message: '' });
  };

  const showCompactPopup = (show: ShowOption) => {
    setCompactPopup({ visible: true, show });
  };

  const hideCompactPopup = () => {
    setCompactPopup({ visible: false, show: null });
  };

  const showDisabledInterfaceModal = (show: ShowOption) => {
    setDisabledInterfaceModal({ visible: true, show });
    hideCompactPopup();
  };

  const hideDisabledInterfaceModal = () => {
    setDisabledInterfaceModal({ visible: false, show: null });
  };

  const showEnableInterfaceModal = (show: ShowOption, defaultPort: string) => {
    setEnableInterfaceModal({ visible: true, show, port: defaultPort });
  };

  const hideEnableInterfaceModal = () => {
    setEnableInterfaceModal({ visible: false, show: null, port: '' });
  };

  return {
    showDisconnectConfirm,
    errorModal,
    compactPopup,
    disabledInterfaceModal,
    enableInterfaceModal,
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
