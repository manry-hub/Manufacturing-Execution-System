import { Injectable, Logger } from '@nestjs/common';
import * as net from 'node:net';
import { type NetworkPrinterInfo } from '../dto/print-label.dto.js';

export interface CartonLabelData {
  barcode: string;
  orderNumber: string;
  partNumber: string;
  productName: string;
  partCount: number;
  palletId?: string | null;
  machineCode: string;
  moldCode: string;
  packagerUsername: string;
  disposition?: string;
  packedAt?: string;
}

export interface PrintResult {
  success: boolean;
  bytesWritten: number;
  printer: string;
  message: string;
}

@Injectable()
export class NetworkPrinterService {
  private readonly logger = new Logger(NetworkPrinterService.name);

  // Default shop floor printer registry
  private readonly registeredPrinters: NetworkPrinterInfo[] = [
    {
      id: 'PRN-STATION-01',
      name: 'Zebra ZT411 - Primary Packaging Line 1',
      ip: '10.20.10.80',
      port: 9100,
      model: 'Zebra ZT411 Industrial (203 DPI)',
      location: 'Area 2 - Finishing & Packaging Line 1',
    },
    {
      id: 'PRN-STATION-02',
      name: 'Zebra ZD421 - Secondary Packaging Line 2',
      ip: '10.20.10.81',
      port: 9100,
      model: 'Zebra ZD421 Desktop (203 DPI)',
      location: 'Area 2 - Finishing & Packaging Line 2',
    },
    {
      id: 'PRN-MOBILE-01',
      name: 'Zebra ZQ630 - Mobile QC Inspection Cart',
      ip: '10.20.10.82',
      port: 9100,
      model: 'Zebra ZQ630 Plus Mobile (203 DPI)',
      location: 'Area 4 - Quality Inspection Floor',
    },
  ];

  /**
   * Returns list of configured industrial label printers.
   */
  getRegisteredPrinters(): NetworkPrinterInfo[] {
    return [...this.registeredPrinters];
  }

  /**
   * Generates compliant Zebra Programming Language (ZPL-II) code for a carton label.
   */
  generateCartonZpl(data: CartonLabelData, copies = 1): string {
    const disposition = data.disposition || 'RELEASED';
    const timestamp = data.packedAt
      ? new Date(data.packedAt).toLocaleString()
      : new Date().toLocaleString();
    const pallet = data.palletId || 'UNASSIGNED';

    const qrPayload = JSON.stringify({
      ctn: data.barcode,
      ord: data.orderNumber,
      pn: data.partNumber,
      qty: data.partCount,
      plt: pallet,
      ts: timestamp,
    });

    return `^XA
^PW800
^LL1200
^PON
^LH0,0
^FO40,40^GB720,1120,4^FS
^FO60,65^A0N,34,34^FDACME INJECTION MOLDING MES^FS
^FO60,105^A0N,20,20^FDFACTORY PLANT 1 - CARTON PACKAGING RECONCILIATION^FS
^FO40,140^GB720,0,2^FS
^FO60,165^BY3,3,90^BCN,90,Y,N,N^FD${data.barcode}^FS
^FO520,155^BQN,2,5^FDQA,${qrPayload}^FS
^FO40,290^GB720,0,2^FS
^FO60,315^A0N,22,22^FDPART NUMBER:^FS
^FO240,312^A0N,28,28^FD${data.partNumber}^FS
^FO60,355^A0N,22,22^FDDESCRIPTION:^FS
^FO240,355^A0N,24,24^FD${data.productName.substring(0, 32)}^FS
^FO60,395^A0N,22,22^FDORDER NUMBER:^FS
^FO240,395^A0N,26,26^FD${data.orderNumber}^FS
^FO60,435^A0N,22,22^FDQUANTITY IN CARTON:^FS
^FO340,432^A0N,32,32^FD${data.partCount} PCS^FS
^FO60,480^A0N,22,22^FDMACHINE / MOLD:^FS
^FO240,480^A0N,24,24^FD${data.machineCode} / ${data.moldCode}^FS
^FO60,520^A0N,22,22^FDPALLET ID:^FS
^FO240,520^A0N,24,24^FD${pallet}^FS
^FO40,560^GB720,0,2^FS
^FO60,585^A0N,24,24^FDQC DISPOSITION:^FS
^FO220,578^GB260,42,42^FS
^FO240,587^FR^A0N,26,26^FD${disposition}^FS
^FO60,645^A0N,18,18^FDPACKED BY: ${data.packagerUsername} | ${timestamp}^FS
^FO40,680^GB720,0,2^FS
^FO60,700^A0N,16,16^FDVERIFIED VIA MES HARD FIRST-PIECE & CARTON RECONCILIATION^FS
^PQ${copies}
^XZ
`;
  }

  /**
   * Generates standard ESC-POS binary payload for compact thermal receipt printers.
   */
  generateCartonEscPos(data: CartonLabelData): Buffer {
    const ESC = 0x1b;
    const GS = 0x1d;

    const parts: Buffer[] = [
      Buffer.from([ESC, 0x40]), // Initialize printer
      Buffer.from([ESC, 0x61, 0x01]), // Center justification
      Buffer.from([ESC, 0x21, 0x30]), // Double width + double height
      Buffer.from('ACME MES PACKAGING\n', 'ascii'),
      Buffer.from([ESC, 0x21, 0x00]), // Normal text
      Buffer.from('--------------------------------\n', 'ascii'),
      Buffer.from(`Carton: ${data.barcode}\n`, 'ascii'),
      Buffer.from(`Part No: ${data.partNumber}\n`, 'ascii'),
      Buffer.from(`Qty: ${data.partCount} PCS\n`, 'ascii'),
      Buffer.from(`Order: ${data.orderNumber}\n`, 'ascii'),
      Buffer.from(`Status: ${data.disposition || 'RELEASED'}\n`, 'ascii'),
      Buffer.from('--------------------------------\n', 'ascii'),
      Buffer.from([GS, 0x56, 0x41, 0x03]), // Feed & paper cut
    ];

    return Buffer.concat(parts);
  }

  /**
   * Streams raw bytes to a network thermal printer over standard JetDirect TCP socket (port 9100).
   */
  async printRawSocket(
    ip: string,
    port = 9100,
    payload: string | Buffer,
    timeoutMs = 5000,
  ): Promise<PrintResult> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let bytesWritten = 0;
      let isResolved = false;

      const finish = (result: PrintResult) => {
        if (!isResolved) {
          isResolved = true;
          socket.destroy();
          resolve(result);
        }
      };

      socket.setTimeout(timeoutMs);

      socket.on('timeout', () => {
        this.logger.warn(`Connection timeout to thermal printer at ${ip}:${port}`);
        finish({
          success: false,
          bytesWritten: 0,
          printer: `${ip}:${port}`,
          message: `Connection timed out after ${timeoutMs}ms`,
        });
      });

      socket.on('error', (err) => {
        this.logger.warn(`Socket error connecting to printer ${ip}:${port}: ${err.message}`);
        finish({
          success: false,
          bytesWritten: 0,
          printer: `${ip}:${port}`,
          message: `Network printer error: ${err.message}`,
        });
      });

      socket.connect(port, ip, () => {
        this.logger.log(`Connected to thermal printer at ${ip}:${port}, streaming label...`);
        const dataBuffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'utf8');

        socket.write(dataBuffer, (err) => {
          if (err) {
            finish({
              success: false,
              bytesWritten: 0,
              printer: `${ip}:${port}`,
              message: `Write error: ${err.message}`,
            });
            return;
          }

          bytesWritten = dataBuffer.length;
          socket.end(() => {
            this.logger.log(`Successfully sent ${bytesWritten} bytes to printer ${ip}:${port}`);
            finish({
              success: true,
              bytesWritten,
              printer: `${ip}:${port}`,
              message: `Printed ${bytesWritten} bytes successfully to ${ip}:${port}`,
            });
          });
        });
      });
    });
  }

  /**
   * Verifies if a thermal printer is reachable over TCP.
   */
  async pingPrinter(ip: string, port = 9100, timeoutMs = 2000): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(timeoutMs);

      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });

      socket.connect(port, ip);
    });
  }

  /**
   * Prints an alignment test label.
   */
  async printTestLabel(ip: string, port = 9100): Promise<PrintResult> {
    const testZpl = `^XA
^PW800^LL400^PON
^FO40,40^GB720,320,4^FS
^FO60,70^A0N,36,36^FDMES THERMAL PRINTER TEST^FS
^FO60,120^A0N,22,22^FDIP: ${ip}:${port} | ${new Date().toISOString()}^FS
^FO60,160^BY2,3,60^BCN,60,Y,N,N^FDMES-TEST-ALIGNMENT^FS
^FO60,250^A0N,20,20^FDSUCCESSFULLY REACHABLE VIA TCP JETDIRECT PORT 9100^FS
^XZ`;

    return this.printRawSocket(ip, port, testZpl);
  }
}
