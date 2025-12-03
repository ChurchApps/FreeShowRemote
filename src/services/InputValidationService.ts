import { configService } from '../config/AppConfig';
import { ErrorLogger } from './ErrorLogger';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: any;
}

/**
 * Comprehensive input validation and sanitization service
 */
export class InputValidationService {
  /**
   * Sanitize a string by removing dangerous characters
   */
  private static sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return String(input);
    }

    return input
      .trim() // Remove leading/trailing whitespace
      .replace(/[<>]/g, '') // Remove potential HTML/XML tags
      .replace(/['";]/g, '') // Remove potential SQL injection characters
      .replace(/[^\w\s\-._:\[\]]/g, ''); // Keep only alphanumeric, spaces, and safe punctuation
  }

  /**
   * Validate and sanitize IP address
   */
  static validateIPAddress(ip: string): ValidationResult {
    try {
      if (!ip || typeof ip !== 'string') {
        return {
          isValid: false,
          error: 'IP address is required and must be a string',
        };
      }

      // Sanitize input
      const sanitized = this.sanitizeString(ip);
      
      if (sanitized !== ip) {
        ErrorLogger.warn('IP address contained suspicious characters', 'InputValidation', 
          new Error(`Original: ${ip}, Sanitized: ${sanitized}`)
        );
      }

      // Check length
      const config = configService.getValidationConfig();
      if (sanitized.length === 0) {
        return {
          isValid: false,
          error: 'IP address cannot be empty',
        };
      }

      if (sanitized.length > config.maxHostLength) {
        return {
          isValid: false,
          error: `IP address too long (max ${config.maxHostLength} characters)`,
        };
      }

      // Validate IP format
      if (!configService.isValidIP(sanitized)) {
        return {
          isValid: false,
          error: 'Invalid IP address format. Please enter a valid IPv4 or IPv6 address',
        };
      }

      // Check for private/local IP ranges (additional security)
      if (this.isPrivateIP(sanitized)) {
        // This is fine for local network apps, but log it
        ErrorLogger.debug('Using private IP address', 'InputValidation', { ip: sanitized });
      }

      return {
        isValid: true,
        sanitizedValue: sanitized,
      };
    } catch (error) {
      ErrorLogger.error('IP validation failed', 'InputValidation', error instanceof Error ? error : new Error(String(error)));
      return {
        isValid: false,
        error: 'IP address validation failed',
      };
    }
  }

  /**
   * Validate and sanitize hostname
   */
  static validateHostname(hostname: string): ValidationResult {
    try {
      if (!hostname || typeof hostname !== 'string') {
        return {
          isValid: false,
          error: 'Hostname is required and must be a string',
        };
      }

      // Sanitize input
      const sanitized = this.sanitizeString(hostname);
      
      if (sanitized !== hostname) {
        ErrorLogger.warn('Hostname contained suspicious characters', 'InputValidation', 
          new Error(`Original: ${hostname}, Sanitized: ${sanitized}`)
        );
      }

      // Check length
      const config = configService.getValidationConfig();
      if (sanitized.length === 0) {
        return {
          isValid: false,
          error: 'Hostname cannot be empty',
        };
      }

      if (sanitized.length > config.maxHostLength) {
        return {
          isValid: false,
          error: `Hostname too long (max ${config.maxHostLength} characters)`,
        };
      }

      // Validate hostname format
      if (!configService.isValidHostname(sanitized)) {
        return {
          isValid: false,
          error: 'Invalid hostname format. Use only letters, numbers, dots, and hyphens',
        };
      }

      return {
        isValid: true,
        sanitizedValue: sanitized,
      };
    } catch (error) {
      ErrorLogger.error('Hostname validation failed', 'InputValidation', error instanceof Error ? error : new Error(String(error)));
      return {
        isValid: false,
        error: 'Hostname validation failed',
      };
    }
  }

  /**
   * Validate and sanitize port number
   */
  static validatePort(port: string | number): ValidationResult {
    try {
      // Allow blank ports (treat as disabled)
      if (port === '' || port === 0) {
        return {
          isValid: true,
          sanitizedValue: 0,
        };
      }

      let portNumber: number;

      // Convert to number if string
      if (typeof port === 'string') {
        // Sanitize string input
        const sanitized = this.sanitizeString(port);
        
        if (sanitized !== port) {
          ErrorLogger.warn('Port contained suspicious characters', 'InputValidation', 
            new Error(`Original: ${port}, Sanitized: ${sanitized}`)
          );
        }

        if (sanitized.length === 0) {
          return {
            isValid: false,
            error: 'Port number is required',
          };
        }

        const config = configService.getValidationConfig();
        if (sanitized.length > config.maxPortLength) {
          return {
            isValid: false,
            error: `Port number too long (max ${config.maxPortLength} digits)`,
          };
        }

        // Check if it's a valid number
        if (!/^\d+$/.test(sanitized)) {
          return {
            isValid: false,
            error: 'Port must contain only numbers',
          };
        }

        portNumber = parseInt(sanitized, 10);
      } else if (typeof port === 'number') {
        portNumber = port;
      } else {
        return {
          isValid: false,
          error: 'Port must be a number or numeric string',
        };
      }

      // Validate port range
      if (!configService.isValidPort(portNumber)) {
        const config = configService.getValidationConfig();
        return {
          isValid: false,
          error: `Port must be between ${config.portRange.min} and ${config.portRange.max}`,
        };
      }

      return {
        isValid: true,
        sanitizedValue: portNumber,
      };
    } catch (error) {
      ErrorLogger.error('Port validation failed', 'InputValidation', error instanceof Error ? error : new Error(String(error)));
      return {
        isValid: false,
        error: 'Port validation failed',
      };
    }
  };

  /**
   * Validate host (IP address or hostname)
   */
  static validateHost(host: string): ValidationResult {
    // Try IP validation first
    const ipResult = this.validateIPAddress(host);
    if (ipResult.isValid) {
      return ipResult;
    }

    // If IP validation fails, try hostname validation
    const hostnameResult = this.validateHostname(host);
    if (hostnameResult.isValid) {
      return hostnameResult;
    }

    // Both failed
    return {
      isValid: false,
      error: 'Invalid host. Please enter a valid IP address or hostname',
    };
  }

  /**
   * Validate QR code content with enhanced security
   */
  static validateQRContent(content: string): ValidationResult {
    try {
      if (!content || typeof content !== 'string') {
        return {
          isValid: false,
          error: 'QR code content is required',
        };
      }

      // Sanitize content
      const sanitized = content.trim();

      if (sanitized.length === 0) {
        return {
          isValid: false,
          error: 'QR code content cannot be empty',
        };
      }

      // Length check for security
      if (sanitized.length > 2048) {
        return {
          isValid: false,
          error: 'QR code content is too long',
        };
      }

      // Enhanced suspicious patterns check
      const suspiciousPatterns = [
        /javascript:/i,
        /data:/i,
        /vbscript:/i,
        /<script/i,
        /onclick/i,
        /onerror/i,
        /onload/i,
        /eval\(/i,
        /function\(/i,
        /alert\(/i,
        /document\./i,
        /window\./i,
        /location\./i,
        /cookie/i,
        /localStorage/i,
        /sessionStorage/i,
        /XMLHttpRequest/i,
        /fetch\(/i,
        /import\(/i,
        /require\(/i,
        /process\./i,
        /__dirname/i,
        /__filename/i,
        /global/i,
        /Buffer/i,
        /fs\./i,
        /path\./i,
        /os\./i,
        /child_process/i,
        /exec\(/i,
        /spawn\(/i,
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(sanitized)) {
          ErrorLogger.warn('QR code contains suspicious content', 'InputValidation', 
            new Error(`Suspicious pattern detected: ${pattern}`));
          return {
            isValid: false,
            error: 'QR code contains potentially unsafe content',
          };
        }
      }

      // Check for non-printable characters
      if (/[^\x20-\x7E\t\n\r]/.test(sanitized)) {
        return {
          isValid: false,
          error: 'QR code contains invalid characters',
        };
      }

      // Try to parse as structured JSON payload first
      try {
        const obj = JSON.parse(sanitized);
        if (obj && typeof obj === 'object') {
          // Expect our structured payload
          if (obj.type === 'freeshow-remote-connection') {
            // Validate host
            const hostResult = this.validateHost(String(obj.host || ''));
            if (!hostResult.isValid) {
              return { isValid: false, error: `Invalid host in QR payload: ${hostResult.error}` };
            }

            // Validate ports object
            const portsResult = this.validateShowPorts(obj.ports);
            if (!portsResult.isValid) {
              return { isValid: false, error: `Invalid ports in QR payload: ${portsResult.error}` };
            }

            // Sanitize nickname (optional)
            const nickname = obj.nickname ? this.sanitizeString(String(obj.nickname)) : undefined;

            return {
              isValid: true,
              sanitizedValue: {
                type: 'freeshow-remote-connection',
                version: Number(obj.version) || 1,
                host: hostResult.sanitizedValue,
                nickname,
                ports: portsResult.sanitizedValue,
              },
            };
          }
        }
      } catch {
        // Not JSON – continue
      }

      // Try to parse as URL or IP
      try {
        // Check if it's a URL
        const url = new URL(sanitized);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          return {
            isValid: false,
            error: 'QR code must contain a valid HTTP/HTTPS URL or IP address',
          };
        }
        
        return {
          isValid: true,
          sanitizedValue: sanitized,
        };
      } catch {
        // Not a URL, try as plain host
        return this.validateHost(sanitized);
      }
    } catch (error) {
      ErrorLogger.error('QR content validation failed', 'InputValidation', error instanceof Error ? error : new Error(String(error)));
      return {
        isValid: false,
        error: 'QR code validation failed',
      };
    }
  }

  /**
   * Check if IP is in private range
   */
  private static isPrivateIP(ip: string): boolean {
    const privateRanges = [
      /^10\./,                    // 10.0.0.0/8
      /^192\.168\./,              // 192.168.0.0/16
      /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
      /^127\./,                   // 127.0.0.0/8 (localhost)
      /^169\.254\./,              // 169.254.0.0/16 (link-local)
    ];

    return privateRanges.some(range => range.test(ip));
  }

  /**
   * Sanitize and validate show ports object
   */
  /**
   * Validate show ports - simplified version
   */
  static validateShowPorts(ports: any): ValidationResult {
    try {
      if (!ports || typeof ports !== 'object') {
        return {
          isValid: false,
          error: 'Show ports configuration is required',
        };
      }

      const requiredPorts = ['remote', 'stage', 'control', 'output', 'api'];
      const sanitizedPorts: any = {};

      for (const portName of requiredPorts) {
        if (!(portName in ports)) {
          sanitizedPorts[portName] = 0; // Default to disabled
          continue;
        }

        // Allow blank ports (treat as disabled)
        if (ports[portName] === '' || ports[portName] === 0 || ports[portName] === null || ports[portName] === undefined) {
          sanitizedPorts[portName] = 0;
          continue;
        }

        const portResult = this.validatePort(ports[portName] as string | number);
        if (!portResult.isValid) {
          return {
            isValid: false,
            error: `Invalid ${portName} port: ${portResult.error}`,
          };
        }

        sanitizedPorts[portName] = portResult.sanitizedValue;
      }

      // Simple check: if enabled ports exist, they must be unique
      const enabledPorts = Object.values(sanitizedPorts).filter((port): port is number => typeof port === 'number' && port > 0);
      const uniquePorts = new Set(enabledPorts);
      
      if (enabledPorts.length !== uniquePorts.size) {
        return {
          isValid: false,
          error: 'Port numbers must be unique',
        };
      }

      return {
        isValid: true,
        sanitizedValue: sanitizedPorts,
      };
    } catch (error) {
      ErrorLogger.error('Show ports validation failed', 'InputValidation', error instanceof Error ? error : new Error(String(error)));
      return {
        isValid: false,
        error: 'Show ports validation failed',
      };
    }
  }
}

// Export the service
export { InputValidationService as ValidationService };
