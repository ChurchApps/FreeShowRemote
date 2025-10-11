// Combined Context Provider - Combines all focused contexts for backward compatibility

import React, { ReactNode } from 'react';
import { ConnectionProvider } from './ConnectionStateContext';
import { DiscoveryProvider } from './DiscoveryContext';
import { SettingsProvider, useSettings } from './SettingsContext';


// Inner component that has access to the settings context
const ConnectionProviderWithSettings: React.FC<{
  children: ReactNode;
  navigation?: any;
  quickActionRef?: React.MutableRefObject<any>;
}> = ({ children, navigation, quickActionRef }) => {
  const { actions } = useSettings();
  
  return (
    <ConnectionProvider 
      navigation={navigation}
      onConnectionHistoryUpdate={actions.refreshHistory}
      quickActionRef={quickActionRef}
    >
      <DiscoveryProvider autoStartDiscovery={false}>
        {children}
      </DiscoveryProvider>
    </ConnectionProvider>
  );
};

// Combine all providers into a single AppContext
export const AppContextProvider: React.FC<{
  children: ReactNode;
  navigation?: any;
  quickActionRef?: React.MutableRefObject<any>;
}> = ({ children, navigation, quickActionRef }) => {
  return (
    <SettingsProvider>
      <ConnectionProviderWithSettings navigation={navigation} quickActionRef={quickActionRef}>
        {children}
      </ConnectionProviderWithSettings>
    </SettingsProvider>
  );
};

export * from './ConnectionStateContext';
export * from './DiscoveryContext';
export * from './SettingsContext';

