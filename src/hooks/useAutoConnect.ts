import { useState, useEffect } from 'react';
import { settingsRepository } from '../repositories';
import { ErrorLogger } from '../services/ErrorLogger';

/**
 * Hook to check if auto-connect should be attempted
 */
export const useAutoConnectExpected = () => {
  const [autoConnectExpected, setAutoConnectExpected] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAutoConnectConditions = async () => {
      try {
        const appSettings = await settingsRepository.getAppSettings();
        if (!appSettings.autoReconnect) {
          setAutoConnectExpected(false);
          return;
        }

        const lastConnection = await settingsRepository.getLastConnection();
        const shouldAutoConnect = !!(lastConnection && lastConnection.host);
        setAutoConnectExpected(shouldAutoConnect);

        ErrorLogger.info('[AutoConnectCheck] Conditions checked', 'useAutoConnectExpected', {
          autoReconnect: appSettings.autoReconnect,
          hasLastConnection: !!lastConnection?.host,
          shouldAutoConnect
        });
      } catch (error) {
        ErrorLogger.error('[AutoConnectCheck] Error checking conditions', 'useAutoConnectExpected', error instanceof Error ? error : new Error(String(error)));
        setAutoConnectExpected(false);
      }
    };

    checkAutoConnectConditions();
  }, []);

  return autoConnectExpected;
};
