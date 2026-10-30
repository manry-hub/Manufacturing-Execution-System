/**
 * Virtual Factory Edge Gateway / Euromap 77 PLC Simulator
 *
 * Simulates physical Industry 4.0 injection molding machines (Engel, KraussMaffei, Haitian)
 * broadcasting OPC 40077 (Euromap 77) telemetry packets to the local MQTT broker.
 *
 * Run with: pnpm mock:edge
 */

import mqtt from 'mqtt';

const BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const PLANT_ID = process.env.PLANT_ID || 'plant-1';

interface VirtualMachineConfig {
  code: string;
  tonnage: number;
  baseCycleTime: number;
  targetTemp: number[];
  state: 'RUNNING' | 'IDLE' | 'SETUP' | 'FAULT';
  currentShot: number;
}

const MACHINES: VirtualMachineConfig[] = [
  { code: 'IMM-01', tonnage: 150, baseCycleTime: 22.0, targetTemp: [205, 215, 225, 230], state: 'RUNNING', currentShot: 1240 },
  { code: 'IMM-02', tonnage: 150, baseCycleTime: 21.5, targetTemp: [200, 210, 220, 225], state: 'RUNNING', currentShot: 980 },
  { code: 'IMM-03', tonnage: 200, baseCycleTime: 25.0, targetTemp: [210, 220, 230, 235], state: 'RUNNING', currentShot: 3120 },
  { code: 'IMM-04', tonnage: 200, baseCycleTime: 24.5, targetTemp: [215, 225, 235, 240], state: 'IDLE', currentShot: 450 },
  { code: 'IMM-05', tonnage: 300, baseCycleTime: 32.0, targetTemp: [220, 230, 240, 245], state: 'RUNNING', currentShot: 8540 },
  { code: 'IMM-06', tonnage: 300, baseCycleTime: 31.0, targetTemp: [220, 230, 240, 245], state: 'RUNNING', currentShot: 4120 },
  { code: 'IMM-07', tonnage: 450, baseCycleTime: 42.0, targetTemp: [230, 240, 250, 255], state: 'SETUP', currentShot: 120 },
  { code: 'IMM-08', tonnage: 450, baseCycleTime: 44.0, targetTemp: [230, 240, 250, 255], state: 'RUNNING', currentShot: 6300 },
  { code: 'IMM-09', tonnage: 650, baseCycleTime: 55.0, targetTemp: [240, 250, 260, 265], state: 'RUNNING', currentShot: 2100 },
  { code: 'IMM-10', tonnage: 850, baseCycleTime: 68.0, targetTemp: [250, 260, 270, 275], state: 'RUNNING', currentShot: 1850 },
];

console.log('🏭 [Virtual Edge Gateway] Initializing Industry 4.0 PLC Simulator...');
console.log(`🔌 Connecting to MQTT Broker: ${BROKER_URL}`);

const client = mqtt.connect(BROKER_URL, {
  clientId: `virtual-edge-gateway-${Date.now().toString(16)}`,
  clean: true,
  reconnectPeriod: 3000,
});

client.on('connect', () => {
  console.log('✅ [Virtual Edge Gateway] Connected to MQTT Broker successfully!');
  console.log(`📡 Simulating 10 Injection Molding Machines publishing to "factory/${PLANT_ID}/+/euromap77"`);
  startSimulationLoop();
});

client.on('error', (err) => {
  console.error('❌ [Virtual Edge Gateway] MQTT Connection error:', err.message);
});

client.on('offline', () => {
  console.warn('⚠️ [Virtual Edge Gateway] MQTT Broker went offline. Reconnecting...');
});

function randomJitter(base: number, maxDelta: number): number {
  return parseFloat((base + (Math.random() * 2 - 1) * maxDelta).toFixed(2));
}

function startSimulationLoop(): void {
  // Telemetry broadcast loop (runs every 2 seconds)
  setInterval(() => {
    if (!client.connected) return;

    for (const machine of MACHINES) {
      if (machine.state === 'RUNNING') {
        machine.currentShot++;
      }

      // Generate realistic Euromap 77 packet
      const cycleTime = randomJitter(machine.baseCycleTime, 0.8);
      const injectionTime = randomJitter(machine.baseCycleTime * 0.16, 0.2);
      const cushion = randomJitter(4.2, 0.35);
      const peakInjectionPressure = randomJitter(138.0, 4.5);
      const clampingForce = randomJitter(machine.tonnage * 9.81, 15.0);

      const zoneTemps = machine.targetTemp.map((temp) => randomJitter(temp, 1.2));
      const nozzleTemp = randomJitter(machine.targetTemp[machine.targetTemp.length - 1] + 5, 1.5);

      const topic = `factory/${PLANT_ID}/${machine.code}/euromap77`;

      const payload = {
        timestamp: new Date().toISOString(),
        machineCode: machine.code,
        protocol: 'EUROMAP_77',
        version: '1.0',
        cyclicParameters: {
          cycleTime: machine.state === 'RUNNING' ? cycleTime : undefined,
          injectionTime: machine.state === 'RUNNING' ? injectionTime : undefined,
          cushion: machine.state === 'RUNNING' ? cushion : undefined,
          peakInjectionPressure: machine.state === 'RUNNING' ? peakInjectionPressure : undefined,
        },
        clampingUnit: {
          clampingForce: machine.state === 'RUNNING' ? clampingForce : 0,
          mouldStatus: machine.state === 'RUNNING' ? 'CLOSED' : 'OPEN',
        },
        heatingZones: {
          zoneTemperatures: zoneTemps,
          nozzleTemperature: nozzleTemp,
        },
        production: {
          totalParts: machine.currentShot,
          goodParts: Math.floor(machine.currentShot * 0.985),
          badParts: Math.ceil(machine.currentShot * 0.015),
        },
        machineStatus: machine.state,
        activeFault: null,
      };

      client.publish(topic, JSON.stringify(payload), { qos: 0 });
    }

    process.stdout.write(
      `\r[${new Date().toLocaleTimeString()}] Published Euromap 77 telemetry frames for 10 IMM nodes...`,
    );
  }, 2000);
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 [Virtual Edge Gateway] Shutting down simulator...');
  client.end(true, () => {
    console.log('👋 [Virtual Edge Gateway] Disconnected.');
    process.exit(0);
  });
});
