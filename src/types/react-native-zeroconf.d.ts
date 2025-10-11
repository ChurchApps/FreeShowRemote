declare module 'react-native-zeroconf' {
  export interface ZeroconfService {
    name: string;
    host: string;
    port: number;
    addresses?: string[];
    txt?: { [key: string]: string };
    fullName?: string;
  }

  export interface ZeroconfError {
    message?: string;
  }

  export default class Zeroconf {
    constructor();
    
    scan(type: string, protocol?: string, domain?: string): void;
    stop(): void;
    
    on(event: 'start', listener: () => void): void;
    on(event: 'stop', listener: () => void): void;
    on(event: 'error', listener: (error: ZeroconfError) => void): void;
    on(event: 'resolved', listener: (service: ZeroconfService) => void): void;
    on(event: 'remove', listener: (service: ZeroconfService) => void): void;
    
    removeListener(event: string, listener: (...args: any[]) => void): void;
    removeAllListeners(event?: string): void;
  }
}
