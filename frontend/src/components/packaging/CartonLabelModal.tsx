import React, { useEffect, useRef, useState } from 'react';
import bwipjs from 'bwip-js/browser';
import {
  Printer,
  X,
  Copy,
  Check,
  Tag,
  Layers,
  CheckCircle2,
  Send,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../services/api.js';
import type { PackagingUnit, RunReconciliation, NetworkPrinterInfo } from '../../types/packaging.js';

interface CartonLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit: PackagingUnit | null;
  reconciliation?: RunReconciliation | null;
  isPalletMaster?: boolean;
  palletId?: string;
  palletCartonsCount?: number;
  palletTotalParts?: number;
}

export const CartonLabelModal: React.FC<CartonLabelModalProps> = ({
  isOpen,
  onClose,
  unit,
  reconciliation,
  isPalletMaster = false,
  palletId,
  palletCartonsCount = 0,
  palletTotalParts = 0,
}) => {
  const [barcodeFormat, setBarcodeFormat] = useState<'DATAMATRIX' | 'QR'>('DATAMATRIX');
  const [copied, setCopied] = useState(false);
  const [renderTimestamp, setRenderTimestamp] = useState<string>('');
  const [dateCode, setDateCode] = useState<string>('');
  const [palletMasterSerial, setPalletMasterSerial] = useState<string>('');

  // Network Industrial Printer State
  const [printers, setPrinters] = useState<NetworkPrinterInfo[]>([]);
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>('');
  const [copies, setCopies] = useState<number>(1);
  const [isPrintingZpl, setIsPrintingZpl] = useState<boolean>(false);
  const [zplStatus, setZplStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const partBarcodeRef = useRef<HTMLCanvasElement | null>(null);
  const qtyBarcodeRef = useRef<HTMLCanvasElement | null>(null);
  const serialBarcodeRef = useRef<HTMLCanvasElement | null>(null);
  const matrixBarcodeRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setRenderTimestamp(now.toLocaleString());
      setDateCode(now.toISOString().slice(0, 10));
      setPalletMasterSerial(
        `PAL-MST-${(palletId ?? '01').replace(/[^a-zA-Z0-9]/g, '')}-${now.getTime().toString(36).toUpperCase()}`,
      );
      setZplStatus(null);

      void api
        .getPackagingPrinters()
        .then((list) => {
          setPrinters(list);
          if (list.length > 0 && !selectedPrinterId) {
            setSelectedPrinterId(list[0].id);
          }
        })
        .catch((err) => {
          console.warn('Could not retrieve network printers:', err);
        });
    }
  }, [isOpen, palletId, selectedPrinterId]);

  const orderNumber = unit?.run?.productionOrder?.orderNumber ?? reconciliation?.orderNumber ?? 'WO-UNKNOWN';
  const partNumber = unit?.run?.productionOrder?.product?.partNumber ?? reconciliation?.product?.partNumber ?? 'PART-001';
  const productName = unit?.run?.productionOrder?.product?.name ?? reconciliation?.product?.name ?? 'Standard Molded Component';
  const machineCode = unit?.run?.machine?.code ?? reconciliation?.machine?.code ?? 'IMM-01';
  const moldCode = reconciliation?.mold?.code ?? 'MOLD-01';
  const serialCode = isPalletMaster
    ? palletMasterSerial || 'PAL-MST-01'
    : unit?.barcode ?? 'PKG-0000-0000';
  const partCount = isPalletMaster ? palletTotalParts : unit?.partCount ?? 50;
  const packagerName = unit?.packager?.username ?? 'Operator-1';
  const packedTimestamp = unit?.packedAt ? new Date(unit.packedAt).toLocaleString() : renderTimestamp;

  // Render Barcodes via bwip-js
  useEffect(() => {
    if (!isOpen) return;

    // Small delay to allow DOM modal canvas nodes to mount
    const timer = setTimeout(() => {
      // 1. Part Number Code 128
      if (partBarcodeRef.current) {
        try {
          bwipjs.toCanvas(partBarcodeRef.current, {
            bcid: 'code128',
            text: `P${partNumber}`,
            scale: 2,
            height: 8,
            includetext: false,
          });
        } catch (err) {
          console.error('Failed to render part barcode:', err);
        }
      }

      // 2. Quantity Code 128
      if (qtyBarcodeRef.current) {
        try {
          bwipjs.toCanvas(qtyBarcodeRef.current, {
            bcid: 'code128',
            text: `Q${partCount}`,
            scale: 2,
            height: 8,
            includetext: false,
          });
        } catch (err) {
          console.error('Failed to render qty barcode:', err);
        }
      }

      // 3. Serial / Package Code 128
      if (serialBarcodeRef.current) {
        try {
          bwipjs.toCanvas(serialBarcodeRef.current, {
            bcid: 'code128',
            text: `S${serialCode}`,
            scale: 2,
            height: 10,
            includetext: false,
          });
        } catch (err) {
          console.error('Failed to render serial barcode:', err);
        }
      }

      // 4. 2D DataMatrix or QR Code (ISO/IEC 15434 format)
      if (matrixBarcodeRef.current) {
        try {
          const raw2DData = `[)>*06*P${partNumber}*Q${partCount}*S${serialCode}*1T${orderNumber}*11D${dateCode.replace(/-/g, '')}*20T${machineCode}`;
          bwipjs.toCanvas(matrixBarcodeRef.current, {
            bcid: barcodeFormat === 'DATAMATRIX' ? 'datamatrix' : 'qrcode',
            text: raw2DData,
            scale: 3,
          });
        } catch (err) {
          console.error('Failed to render 2D matrix barcode:', err);
        }
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen, barcodeFormat, partNumber, partCount, serialCode, orderNumber, machineCode, dateCode]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopySerial = async () => {
    try {
      await navigator.clipboard.writeText(serialCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handlePrintZpl = async () => {
    const chosen = printers.find((p) => p.id === selectedPrinterId) || printers[0];
    if (!chosen) {
      setZplStatus({ type: 'error', text: 'No industrial network printer available' });
      return;
    }

    setIsPrintingZpl(true);
    setZplStatus(null);
    try {
      const result = await api.printCartonToNetwork({
        barcode: serialCode,
        printerIp: chosen.ip,
        printerPort: chosen.port,
        copies,
      });

      if (result.success) {
        setZplStatus({
          type: 'success',
          text: `ZPL dispatched (${result.bytesWritten} bytes) to ${chosen.name}`,
        });
      } else {
        setZplStatus({
          type: 'error',
          text: result.message || `Printer ${chosen.ip}:${chosen.port} unreachable`,
        });
      }
    } catch (err) {
      setZplStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error transmitting raw ZPL over TCP socket',
      });
    } finally {
      setIsPrintingZpl(false);
    }
  };

  return (
    <dialog
      open
      aria-labelledby="label-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto w-full h-full border-none max-w-none max-h-none"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-[#0B120E24] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#0B120E24] bg-[#F8F9FA]">
          <div className="flex items-center gap-2">
            {isPalletMaster ? (
              <Layers className="h-5 w-5 text-[#006644]" />
            ) : (
              <Tag className="h-5 w-5 text-[#1868DB]" />
            )}
            <div>
              <h2 id="label-modal-title" className="text-sm font-bold text-[#292A2E]">
                {isPalletMaster ? 'Master Pallet Shipping Label (AIAG B-10)' : 'Carton Packaging Label (AIAG B-10)'}
              </h2>
              <p className="text-xs text-[#505258]">
                Standard 4" × 6" industrial thermal label with Code 128 & 2D Matrix
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[#505258] hover:text-[#292A2E] hover:bg-[#EBECF0] transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 bg-[#F1F2F4] border-b border-[#0B120E24] text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#505258]">2D Matrix Format:</span>
            <button
              type="button"
              onClick={() => setBarcodeFormat('DATAMATRIX')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                barcodeFormat === 'DATAMATRIX'
                  ? 'bg-[#1868DB] text-white shadow-xs'
                  : 'bg-white text-[#292A2E] border border-[#0B120E24] hover:bg-[#F8F8F8]'
              }`}
            >
              DataMatrix
            </button>
            <button
              type="button"
              onClick={() => setBarcodeFormat('QR')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                barcodeFormat === 'QR'
                  ? 'bg-[#1868DB] text-white shadow-xs'
                  : 'bg-white text-[#292A2E] border border-[#0B120E24] hover:bg-[#F8F8F8]'
              }`}
            >
              QR Code
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySerial}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-white text-[#292A2E] border border-[#0B120E24] hover:bg-[#F8F8F8] font-medium"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-[#216E4E]" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied Serial' : 'Copy Serial'}</span>
            </button>
          </div>
        </div>

        {/* Modal Body / Printable Label Preview Canvas */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#EBECF0]/60 flex justify-center">
          {/* 4x6" Industrial Shipping Label (AIAG B-10 compliant container) */}
          <div
            id="printable-industrial-label"
            className="w-full max-w-[500px] bg-white border-2 border-black p-4 text-black font-sans shadow-md select-none print:shadow-none print:border-none print:m-0 print:p-0"
            style={{ minHeight: '600px' }}
          >
            {/* Top Header */}
            <div className="border-b-2 border-black pb-2 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest block text-gray-700">
                  {isPalletMaster ? 'MASTER PALLET LABEL' : 'PRODUCTION CONTAINER LABEL'}
                </span>
                <span className="text-base font-extrabold tracking-tight">MANUFACTURING EXECUTION SYSTEM</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono font-bold block">{isPalletMaster ? 'AIAG B-10 MASTER' : 'AIAG B-10'}</span>
                <span className="text-[10px] text-gray-600 font-mono">{dateCode}</span>
              </div>
            </div>

            {/* Grid Area: Part Number & 2D Matrix */}
            <div className="grid grid-cols-3 border-b-2 border-black">
              {/* Part Number Column (2 cols) */}
              <div className="col-span-2 p-2 border-r-2 border-black flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold block text-gray-700">PART NO. (P)</span>
                  <div className="text-2xl font-black font-mono tracking-tight leading-none mt-1">
                    {partNumber}
                  </div>
                  <div className="text-xs font-semibold text-gray-800 truncate mt-0.5">
                    {productName}
                  </div>
                </div>
                <div className="mt-2 flex flex-col items-center">
                  <canvas ref={partBarcodeRef} className="max-h-12 w-auto" />
                  <span className="text-[9px] font-mono tracking-widest text-gray-600">P{partNumber}</span>
                </div>
              </div>

              {/* 2D Matrix Column (1 col) */}
              <div className="col-span-1 p-2 flex flex-col items-center justify-center bg-gray-50/50">
                <span className="text-[9px] font-bold text-gray-700 block mb-1">2D ISO/IEC 15434</span>
                <canvas ref={matrixBarcodeRef} className="h-24 w-24 border border-gray-300 p-1 bg-white" />
                <span className="text-[8px] font-mono text-gray-500 mt-1 uppercase">{barcodeFormat}</span>
              </div>
            </div>

            {/* Grid Area: Quantity & Order Details */}
            <div className="grid grid-cols-2 border-b-2 border-black">
              {/* Quantity */}
              <div className="p-2 border-r-2 border-black flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold block text-gray-700">QUANTITY (Q)</span>
                  <div className="text-3xl font-black font-mono leading-none mt-1">
                    {partCount} <span className="text-sm font-bold text-gray-600">PCS</span>
                  </div>
                  {isPalletMaster && (
                    <div className="text-xs font-semibold text-emerald-800 mt-0.5">
                      {palletCartonsCount} Verified Cartons
                    </div>
                  )}
                </div>
                <div className="mt-2 flex flex-col items-center">
                  <canvas ref={qtyBarcodeRef} className="max-h-10 w-auto" />
                  <span className="text-[9px] font-mono tracking-widest text-gray-600">Q{partCount}</span>
                </div>
              </div>

              {/* Work Order / Lot */}
              <div className="p-2 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold block text-gray-700">WORK ORDER / LOT (1T)</span>
                  <div className="text-lg font-black font-mono leading-none mt-1">
                    {orderNumber}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Mach: <span className="font-bold font-mono text-black">{machineCode}</span> | Mold: <span className="font-bold font-mono text-black">{moldCode}</span>
                  </div>
                </div>
                <div className="text-[10px] text-gray-600 mt-2">
                  Pallet: <span className="font-bold font-mono text-black">{isPalletMaster ? (palletId ?? 'PAL-01') : (unit?.palletId ?? 'PAL-01')}</span>
                </div>
              </div>
            </div>

            {/* Serial / Container Barcode Full Width */}
            <div className="p-3 border-b-2 border-black flex flex-col items-center justify-center bg-gray-50/20">
              <span className="text-[10px] font-bold self-start text-gray-700">
                {isPalletMaster ? 'MASTER SERIAL NUMBER (S)' : 'CARTON SERIAL NUMBER (S)'}
              </span>
              <div className="my-2 flex flex-col items-center w-full">
                <canvas ref={serialBarcodeRef} className="max-h-14 w-4/5" />
                <span className="text-sm font-mono font-black tracking-widest mt-1 text-black">
                  {serialCode}
                </span>
              </div>
            </div>

            {/* Bottom Footer Details */}
            <div className="pt-2 text-[10px] flex items-center justify-between text-gray-700">
              <div>
                Packer: <span className="font-bold text-black">{packagerName}</span>
              </div>
              <div>
                Time: <span className="font-mono text-black">{packedTimestamp}</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-700 font-bold">
                <CheckCircle2 className="h-3 w-3" />
                <span>QC PASSED</span>
              </div>
            </div>
          </div>
        </div>

        {/* Network Thermal Printer Hardware Section */}
        <div className="px-6 py-3 bg-[#F4F5F7] border-t border-[#0B120E24] space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-[#1868DB]" />
              <span className="font-bold text-[#292A2E]">Industrial Thermal Printer (ZPL via TCP :9100):</span>
              <select
                aria-label="Target Network Printer"
                value={selectedPrinterId}
                onChange={(e) => setSelectedPrinterId(e.target.value)}
                className="bg-[#FFFFFF] border border-[#0B120E24] rounded-md px-2.5 py-1 text-xs text-[#292A2E] font-medium"
              >
                {printers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.ip}:{p.port})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="zpl-copies" className="text-[#505258] font-semibold">Copies:</label>
              <input
                id="zpl-copies"
                type="number"
                min={1}
                max={10}
                value={copies}
                onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-14 bg-[#FFFFFF] border border-[#0B120E24] rounded-md px-2 py-1 text-xs text-center font-bold"
              />
              <button
                type="button"
                onClick={() => void handlePrintZpl()}
                disabled={isPrintingZpl || printers.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-[#091E42] hover:bg-[#000000] text-[#FFFFFF] disabled:opacity-50 transition-colors shadow-xs"
              >
                {isPrintingZpl ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5 text-[#36B37E]" />
                )}
                <span>{isPrintingZpl ? 'Transmitting...' : 'Send ZPL to Printer'}</span>
              </button>
            </div>
          </div>

          {zplStatus && (
            <div
              className={`text-[11px] p-2 rounded-md flex items-center gap-2 ${
                zplStatus.type === 'success'
                  ? 'bg-[#E3FCEF] text-[#216E4E] border border-[#7EE2B8]'
                  : 'bg-[#FFEBE6] text-[#AE2A19] border border-[#FF8F73]'
              }`}
            >
              {zplStatus.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{zplStatus.text}</span>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#0B120E24] bg-[#F8F9FA]">
          <span className="text-xs text-[#505258]">
            Direct print sends 4" × 6" layout to Zebra/TSC thermal or office printer.
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-xs font-semibold bg-[#FFFFFF] hover:bg-[#F8F8F8] text-[#292A2E] border border-[#0B120E24] transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-[#1868DB] hover:bg-[#1558BC] text-white shadow-xs transition-colors"
            >
              <Printer className="h-4 w-4" />
              <span>Print Label (4" × 6")</span>
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
};

