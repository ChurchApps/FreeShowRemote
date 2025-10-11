import { ErrorLogger } from './ErrorLogger';
import { configService } from '../config/AppConfig';

export interface PingResult {
  isReachable: boolean;
  responseTime?: number;
  error?: string;
}

export interface PortPingResult {
  port: number;
  isReachable: boolean;
  responseTime?: number;
  error?: string;
}

export interface InterfaceValidationResult {
  remote: number;
  stage: number;
  control: number;
  output: number;
  api: number;
  validatedPorts: PortPingResult[];
  hasEnabledInterfaces: boolean;
}

/**
 * Service for validating FreeShow interface ports and host connectivity
 */
export class InterfacePingService {
  private readonly logContext = 'InterfacePingService';
  private readonly timeout = configService.getNetworkConfig().interfacePingTimeout;

  /**
   * Test a specific port on a host
   */
  async pingPort(host: string, port: number): Promise<PortPingResult> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const _response = await fetch(`http://${host}:${port}`, {
        method: 'HEAD',
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      return {
        port,
        isReachable: true,
        responseTime
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        port,
        isReachable: false,
        responseTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Validate interface ports by testing their connectivity
   * Returns actual reachability - disables unreachable interfaces
   */
  async validateInterfacePorts(host: string, ports: {
    remote: number;
    stage: number;
    control: number;
    output: number;
    api: number;
  }): Promise<InterfaceValidationResult> {
    const finalPorts = { ...ports };

    // Test all non-zero ports in parallel for speed
    const portsToTest = Object.entries(ports).filter(([_, port]) => port > 0);
    
    if (portsToTest.length === 0) {
      return { ...finalPorts, validatedPorts: [], hasEnabledInterfaces: false };
    }
    
    const pingPromises = portsToTest.map(([interfaceName, port]) => 
      this.pingPort(host, port).then(result => ({ interfaceName, result }))
    );

    // Process ping results and disable unreachable interfaces
    const pingResults = await Promise.all(pingPromises);
    const validatedPorts: PortPingResult[] = [];

    for (const { interfaceName, result } of pingResults) {
      validatedPorts.push(result);
      
      if (!result.isReachable) {
        finalPorts[interfaceName as keyof typeof ports] = 0;
        ErrorLogger.info(`Disabled ${interfaceName} interface - port ${result.port} not responding`, this.logContext);
      } else {
        ErrorLogger.info(`Validated ${interfaceName} interface on port ${result.port}`, this.logContext);
      }
    }

    return {
      ...finalPorts,
      validatedPorts,
      hasEnabledInterfaces: Object.values(finalPorts).some(port => port > 0)
    };
  }

  /**
   * Test host connectivity on common FreeShow ports
   */
  async pingHost(host: string): Promise<PingResult> {
    const startTime = Date.now();
    
    try {
      const defaultPort = configService.getNetworkConfig().defaultPort;
      const testPorts = [defaultPort, 80, 443];
      
      // Try ports sequentially with short timeout
      for (const port of testPorts) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), this.timeout);

          const response = await fetch(`http://${host}:${port}`, {
            method: 'HEAD',
            signal: controller.signal,
            headers: { 'Cache-Control': 'no-cache' }
          });
          
          clearTimeout(timeoutId);
          const responseTime = Date.now() - startTime;
          
          ErrorLogger.debug(`Host ${host} is reachable on port ${port}`, this.logContext, {
            host, port, responseTime, status: response.status
          });
          
          return { isReachable: true, responseTime };
          
        } catch {
          continue; // Try next port
        }
      }
      
      // All ports failed
      const responseTime = Date.now() - startTime;
      return {
        isReachable: false,
        responseTime,
        error: 'Host not reachable on tested ports'
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      ErrorLogger.warn(`Failed to ping host ${host}`, this.logContext, 
        error instanceof Error ? error : new Error(String(error))
      );
      
      return {
        isReachable: false,
        responseTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

// Export singleton instance
export const interfacePingService = new InterfacePingService();
