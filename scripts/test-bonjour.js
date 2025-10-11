#!/usr/bin/env node

/**
 * FreeShow Bonjour Discovery Test Script
 * 
 * This script scans for FreeShow services on your local network using mDNS/Bonjour.
 * It will show you what services are being broadcast and their capabilities.
 * 
 * Usage: node test-bonjour.js
 * 
 * Make sure FreeShow is running with at least one output enabled.
 */

const { Bonjour } = require('bonjour-service');

console.log('🔍 FreeShow Bonjour Discovery Test');
console.log('=====================================');
console.log('Scanning for FreeShow services on the network...');
console.log('Make sure FreeShow is running with outputs enabled.\n');

// Track discovered services by IP to aggregate them
const discoveredServices = new Map();

// Create bonjour instance
const bonjour = new Bonjour();

// Create browser for FreeShow services
// FreeShow broadcasts with service type '_freeshow._udp'
const browser = bonjour.find({ type: 'freeshow', protocol: 'udp' });

browser.on('up', (service) => {
  console.log('📡 Service discovered:', {
    name: service.name,
    type: service.type,
    protocol: service.protocol,
    host: service.host,
    port: service.port,
    addresses: service.addresses || [service.referer?.address],
    txt: service.txt
  });
  
  // Extract primary IP (prefer IPv4)
  const addresses = service.addresses || [service.referer?.address].filter(Boolean);
  const primaryIP = addresses.find(addr => 
    addr && addr.includes('.') && !addr.startsWith('169.254')
  ) || addresses[0];
  
  if (!primaryIP) {
    console.log('⚠️  No valid IP found for service');
    return;
  }
  
  // Parse capability from service name
  const capability = parseServiceCapability(service.name);
  console.log(`   └─ Service Type: ${capability}`);
  console.log(`   └─ Original Name: ${service.name}`);
  console.log(`   └─ IP Address: ${primaryIP}`);
  console.log(`   └─ Port: ${service.port}`);
  
  // Aggregate services by IP
  if (!discoveredServices.has(primaryIP)) {
    discoveredServices.set(primaryIP, {
      name: service.host.replace('.local', ''),
      host: service.host,
      ip: primaryIP,
      services: [],
      ports: {},
      capabilities: []
    });
  }
  
  const instance = discoveredServices.get(primaryIP);
  instance.services.push(service);
  instance.ports[capability] = service.port;
  if (!instance.capabilities.includes(capability)) {
    instance.capabilities.push(capability);
  }
  
  // Check if this is an API service specifically
  const isApiService = capability === 'api';
  if (isApiService) {
    instance.hasApiService = true;
  }
  
  console.log('');
});

browser.on('down', (service) => {
  console.log('📉 Service went down:', service.name);
  
  // You could implement service removal logic here if needed
});

// Helper function to parse capability from service name
function parseServiceCapability(serviceName) {
  const name = serviceName.toUpperCase(); // FreeShow uses uppercase names
  
  // Direct service names from FreeShow
  if (name === 'API') return 'api';
  if (name === 'REMOTE') return 'remote';
  if (name === 'STAGE') return 'stage';
  if (name === 'CONTROLLER') return 'control';
  if (name === 'OUTPUT_STREAM' || name === 'OUTPUT') return 'output';
  
  // Fallback for lowercase or partial matches
  const lowerName = serviceName.toLowerCase();
  if (lowerName.includes('api')) return 'api';
  if (lowerName.includes('remote')) return 'remote';
  if (lowerName.includes('stage')) return 'stage';
  if (lowerName.includes('control')) return 'control';
  if (lowerName.includes('output')) return 'output';
  
  return serviceName.toLowerCase(); // Return the actual name if we can't parse it
}

// Start discovery
console.log('Starting mDNS browser...\n');

// Set a timeout to stop discovery and show results
const scanTimeout = setTimeout(() => {
  console.log('⏰ Scan timeout reached. Stopping discovery...\n');
  
  // Show aggregated results
  if (discoveredServices.size === 0) {
    console.log('❌ No FreeShow services found');
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Make sure FreeShow is running');
    console.log('   2. Enable at least one output in FreeShow (API, Remote, Stage, etc.)');
    console.log('   3. Check that you\'re on the same network');
    console.log('   4. Ensure your firewall allows mDNS traffic');
    console.log('   5. Try restarting FreeShow and running this script again');
  } else {
    console.log('✅ FreeShow Discovery Results:');
    console.log('==============================\n');
    
    discoveredServices.forEach((instance, ip) => {
      console.log(`📱 FreeShow Instance: ${instance.name}`);
      console.log(`   IP: ${ip}`);
      console.log(`   Host: ${instance.host}`);
      console.log(`   Discovered Services: ${instance.services.length}`);
      console.log(`   Services Found:`);
      
      // List each individual service
      instance.services.forEach(service => {
        const capability = parseServiceCapability(service.name);
        console.log(`      • ${service.name} (${capability}) - Port: ${service.port}`);
      });
      
      console.log(`   Aggregated Capabilities: ${instance.capabilities.join(', ')}`);
      console.log(`   Ports by Type:`);
      
      Object.entries(instance.ports).forEach(([capability, port]) => {
        console.log(`      ${capability}: ${port}`);
      });
      
  // Check if API is available - API runs on default port 5505, not broadcasted via Bonjour
  const hasAnyService = instance.capabilities.length > 0;
  // API is available on default port 5505 when any service is running
  const apiPort = 5505;
  
  console.log(`   Services Available: ${hasAnyService ? '✅ Yes' : '❌ No'}`);
  console.log(`   Can Mobile App Connect: ${hasAnyService ? '✅ Yes' : '❌ No (No services detected)'}`);
  
  if (hasAnyService) {
    console.log(`   🔗 Test API connection: http://${ip}:${apiPort}/api`);
    console.log(`   🌐 Web interface: http://${ip}:${apiPort}`);
    console.log(`   💡 API endpoint available on default port ${apiPort}`);
  } else {
    console.log(`   ⚠️  No FreeShow services detected`);
    console.log(`   💡 Enable at least one output in FreeShow`);
  }      console.log('');
    });
    
    // Show what the mobile app would see
    console.log('📱 Mobile App Perspective:');
    console.log('==========================');
    discoveredServices.forEach((instance, ip) => {
      const hasAnyService = instance.capabilities.length > 0;
      const availableOutputs = instance.capabilities;
      const apiPort = 5505; // Default API port
      
      console.log(`Instance: ${instance.name} (${ip})`);
      console.log(`  - Services Discovered: ${instance.services.map(s => s.name).join(', ')}`);
      console.log(`  - FreeShow Running: ${hasAnyService ? 'Yes' : 'No'}`);
      console.log(`  - Can Connect: ${hasAnyService ? 'Yes' : 'No (No services detected)'}`);
      console.log(`  - Available Outputs: ${availableOutputs.length > 0 ? availableOutputs.join(', ') : 'None detected'}`);
      console.log(`  - API Port: ${apiPort} (default API port)`);
      
      if (hasAnyService) {
        console.log(`  - Tabs/Features Shown: Home, ${availableOutputs.map(cap => {
          switch(cap) {
            case 'remote': return 'Remote';
            case 'stage': return 'Stage Display';
            case 'control': return 'Controller';
            case 'output': return 'Output';
            default: return cap;
          }
        }).join(', ')}`);
      } else {
        console.log(`  - App Behavior: Will show "No FreeShow services found"`);
      }
      console.log('');
    });
  }
  
  bonjour.destroy();
  process.exit(0);
}, 10000); // 10 second scan

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n🛑 Stopping discovery...');
  clearTimeout(scanTimeout);
  bonjour.destroy();
  process.exit(0);
});

console.log('Press Ctrl+C to stop scanning early.\n');
