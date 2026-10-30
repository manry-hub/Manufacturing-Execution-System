import { describe, it, expect } from 'vitest';
import { NetworkPrinterService, type CartonLabelData } from './network-printer.service.js';

describe('NetworkPrinterService', () => {
  const service = new NetworkPrinterService();

  const sampleData: CartonLabelData = {
    barcode: 'PKG-DEMO-001',
    orderNumber: 'WO-2026-001',
    partNumber: 'AUTO-HOUSING-01',
    productName: 'Automotive Sensor Housing',
    partCount: 50,
    palletId: 'PLT-004',
    machineCode: 'IMM-01',
    moldCode: 'MOLD-01',
    packagerUsername: 'operator_john',
    disposition: 'RELEASED',
    packedAt: '2026-10-30T07:00:00.000Z',
  };

  it('should return registered industrial printers', () => {
    const printers = service.getRegisteredPrinters();
    expect(Array.isArray(printers)).toBe(true);
    expect(printers.length).toBeGreaterThanOrEqual(3);
    expect(printers[0].name).toContain('Zebra');
    expect(printers[0].port).toBe(9100);
  });

  it('should generate compliant ZPL-II label code', () => {
    const zpl = service.generateCartonZpl(sampleData, 2);

    expect(zpl).toContain('^XA'); // Start of label
    expect(zpl).toContain('^XZ'); // End of label
    expect(zpl).toContain('PKG-DEMO-001'); // Barcode content
    expect(zpl).toContain('AUTO-HOUSING-01'); // Part number
    expect(zpl).toContain('WO-2026-001'); // Order number
    expect(zpl).toContain('50 PCS'); // Quantity
    expect(zpl).toContain('RELEASED'); // Disposition status
    expect(zpl).toContain('^PQ2'); // Print quantity 2
    expect(zpl).toContain('^BQN,2,5'); // QR Code command
    expect(zpl).toContain('^BCN,90,Y,N,N'); // Code 128 command
  });

  it('should generate compliant ESC-POS buffer payload', () => {
    const buffer = service.generateCartonEscPos(sampleData);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(50);
    const text = buffer.toString('ascii');
    expect(text).toContain('ACME MES PACKAGING');
    expect(text).toContain('PKG-DEMO-001');
    expect(text).toContain('AUTO-HOUSING-01');
  });

  it('should handle unreachable printer connection failure gracefully without throw', async () => {
    // Attempt print to non-listening local port with short timeout
    const result = await service.printRawSocket('127.0.0.1', 65530, '^XA^XZ', 500);

    expect(result.success).toBe(false);
    expect(result.bytesWritten).toBe(0);
    expect(result.message).toBeDefined();
  });

  it('should ping unreachable printer and return false without throwing', async () => {
    const isOnline = await service.pingPrinter('127.0.0.1', 65530, 200);
    expect(isOnline).toBe(false);
  });
});
