/**
 * Virtual Modbus TCP Fieldbus PLC Simulator
 *
 * Connects to the MES Modbus TCP Gateway (port 5502) and writes holding registers
 * representing barrel PID temperatures, hydraulic clamping forces, cycle counters,
 * and machine states using standard Modbus TCP FC 16 (Write Multiple Registers).
 *
 * Run with: pnpm mock:modbus
 */

import * as net from 'node:net';

const MODBUS_HOST = process.env.MODBUS_HOST || '127.0.0.1';
const MODBUS_PORT = Number(process.env.MODBUS_PORT || 5502);

console.log('🏭 [Virtual Modbus PLC] Starting Industrial Modbus TCP Simulator...');
console.log(`🔌 Target Gateway: ${MODBUS_HOST}:${MODBUS_PORT}`);

let txId = 1;

function writeRegisters(socket: net.Socket, unitId: number, startAddr: number, values: number[]): Promise<void> {
  return new Promise((resolve) => {
    const currentTx = txId++;
    if (txId > 65535) txId = 1;

    const quantity = values.length;
    const byteCount = quantity * 2;
    const pduLength = 7 + byteCount; // FC(1) + startAddr(2) + qty(2) + byteCount(1) + values

    const packet = Buffer.alloc(6 + pduLength);
    // MBAP Header
    packet.writeUInt16BE(currentTx, 0); // Transaction ID
    packet.writeUInt16BE(0, 2);         // Protocol ID (0x0000)
    packet.writeUInt16BE(pduLength, 4); // Length = Unit ID + PDU
    packet.writeUInt8(unitId, 6);       // Unit / Slave ID

    // PDU: FC 16 (0x10)
    packet.writeUInt8(0x10, 7);
    packet.writeUInt16BE(startAddr, 8);
    packet.writeUInt16BE(quantity, 10);
    packet.writeUInt8(byteCount, 12);

    for (let i = 0; i < quantity; i++) {
      packet.writeUInt16BE(values[i], 13 + i * 2);
    }

    socket.write(packet, () => {
      resolve();
    });
  });
}

function runSimulation() {
  const socket = new net.Socket();
  let shotCounter = 1500;
  let cycle = 0;

  socket.connect(MODBUS_PORT, MODBUS_HOST, () => {
    console.log(`✅ [Virtual Modbus PLC] Connected to Modbus Gateway at ${MODBUS_HOST}:${MODBUS_PORT}`);
    console.log('📡 Simulating live holding registers updates (Status, Shot Counter, Barrel Temps, Pressures)...');

    setInterval(async () => {
      cycle++;
      shotCounter += 2;

      // Simulate Unit ID 1 (IMM-01) - Normal run with live PID barrel fluctuations
      const t1 = Math.round((205.0 + (Math.sin(cycle * 0.2) * 1.5)) * 10);
      const t2 = Math.round((215.0 + (Math.cos(cycle * 0.2) * 1.2)) * 10);
      const t3 = Math.round((228.0 + (Math.sin(cycle * 0.15) * 1.0)) * 10);
      const t4 = Math.round((230.0 + (Math.cos(cycle * 0.15) * 0.8)) * 10);
      const nozzle = Math.round((232.0 + (Math.sin(cycle * 0.1) * 0.5)) * 10);
      const pressure = Math.round(135 + Math.random() * 4);

      const imm01Registers = [
        1,                         // 0: RUNNING
        (shotCounter >> 16) & 0xffff, // 1: Shot High Word
        shotCounter & 0xffff,      // 2: Shot Low Word
        185,                       // 3: Cycle Time (18.5s)
        39,                        // 4: Injection Time (3.9s)
        420,                       // 5: Cushion (4.20mm)
        pressure,                  // 6: Peak Pressure (136 bar)
        1480,                      // 7: Clamp Force (1480 kN)
        t1, t2, t3, t4, nozzle,    // 8-12: Temperatures
        0,                         // 13: Fault Code (0 = None)
        shotCounter - 15,          // 14: Good Parts
        15,                        // 15: Scrap Parts
      ];

      await writeRegisters(socket, 1, 0, imm01Registers);

      // Simulate Unit ID 2 (IMM-02)
      const imm02Registers = [
        1,
        ((shotCounter - 400) >> 16) & 0xffff,
        (shotCounter - 400) & 0xffff,
        210, 42, 435, 142, 1500,
        2000, 2100, 2200, 2250, 2270,
        0, shotCounter - 410, 10,
      ];
      await writeRegisters(socket, 2, 0, imm02Registers);

      console.log(`[Modbus PLC Cycle ${cycle}] Updated Unit 1 (IMM-01) Shots: ${shotCounter}, Temp Z1: ${(t1/10).toFixed(1)}°C, Pressure: ${pressure} bar`);
    }, 2000);
  });

  socket.on('error', (err) => {
    console.warn(`[Virtual Modbus PLC] Connection error: ${err.message}. Retrying in 5s...`);
    setTimeout(runSimulation, 5000);
  });

  socket.on('close', () => {
    console.log('[Virtual Modbus PLC] Connection closed. Reconnecting in 3s...');
    setTimeout(runSimulation, 3000);
  });
}

runSimulation();
