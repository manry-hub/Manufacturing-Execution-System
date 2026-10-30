import React, { useState } from 'react';
import {
  Package,
  Layers,
  Cpu,
  QrCode,
  Box,
  AlertTriangle,
  X,
  ShieldAlert,
} from 'lucide-react';
import type { RunGenealogy, LotGenealogy, CartonGenealogy } from '../../types/materials.js';

export type DagViewMode = 'forward' | 'backward' | 'run';

interface DagNode {
  id: string;
  type: 'LOT' | 'HOPPER' | 'RUN' | 'MOLD' | 'CARTON' | 'PALLET';
  label: string;
  subLabel: string;
  status?: string;
  isQuarantined?: boolean;
  metadata: Record<string, string | number | undefined | null>;
}

interface GenealogyDagTreeProps {
  mode: DagViewMode;
  runData?: RunGenealogy | null;
  lotData?: LotGenealogy | null;
  cartonData?: CartonGenealogy | null;
  onQuarantineClick?: (lotId: string, lotNumber: string) => void;
}

export const GenealogyDagTree: React.FC<GenealogyDagTreeProps> = ({
  mode,
  runData,
  lotData,
  cartonData,
  onQuarantineClick,
}) => {
  const [selectedNode, setSelectedNode] = useState<DagNode | null>(null);

  // Generate Columns / Nodes based on active mode
  const columns: { title: string; nodes: DagNode[] }[] = [];

  if (mode === 'forward' && lotData) {
    const isLotQuarantined = lotData.status === 'QUARANTINE';

    // Col 0: Raw Resin Lot
    const lotNode: DagNode = {
      id: `lot-${lotData.lotNumber}`,
      type: 'LOT',
      label: lotData.lotNumber,
      subLabel: `${lotData.material.name} (${lotData.material.category})`,
      status: lotData.status,
      isQuarantined: isLotQuarantined,
      metadata: {
        'Lot Number': lotData.lotNumber,
        'Material Code': lotData.material.code,
        'Material Name': lotData.material.name,
        'Resin Category': lotData.material.category,
        'Supplier Heat #': lotData.supplierLot ?? 'Internal/Certified',
        'Initial Stock': `${lotData.initialQtyKg} kg`,
        'Remaining Stock': `${lotData.remainingQtyKg} kg`,
        Status: lotData.status,
      },
    };
    columns.push({ title: '1. Raw Material Lot', nodes: [lotNode] });

    // Col 1: Consuming Production Runs & Machines
    const runNodes: DagNode[] = (lotData.producedRuns || []).map((r) => ({
      id: `run-${r.runId}`,
      type: 'RUN',
      label: r.orderNumber,
      subLabel: `${r.machineCode} • ${r.productName}`,
      status: r.runStatus,
      isQuarantined: isLotQuarantined,
      metadata: {
        'Work Order': r.orderNumber,
        Machine: r.machineCode,
        'Part #': r.partNumber,
        Product: r.productName,
        'Consumed Resin': `${r.quantityConsumedKg} kg`,
        'Good Output': `${r.producedGoodQty} parts`,
        Status: r.runStatus,
        'Consumption Date': new Date(r.consumedAt).toLocaleString(),
      },
    }));

    columns.push({
      title: `2. Downstream Runs (${runNodes.length})`,
      nodes: runNodes.length > 0 ? runNodes : [
        {
          id: 'no-runs',
          type: 'RUN',
          label: 'No Runs Consumed Yet',
          subLabel: 'Lot is in storage inventory',
          metadata: {},
        },
      ],
    });
  } else if (mode === 'backward' && cartonData) {
    const isCartonQuarantined = cartonData.rawMaterials.some((m) => m.status === 'QUARANTINE');

    // Col 0: Scanned Finished Goods Carton
    const cartonNode: DagNode = {
      id: `carton-${cartonData.carton.barcode}`,
      type: 'CARTON',
      label: cartonData.carton.barcode,
      subLabel: `${cartonData.product.partNumber} • ${cartonData.carton.partCount} pcs`,
      isQuarantined: isCartonQuarantined,
      metadata: {
        'Carton Barcode': cartonData.carton.barcode,
        Quantity: `${cartonData.carton.partCount} pcs`,
        Pallet: cartonData.carton.palletId ?? 'Unassigned',
        'Packed At': new Date(cartonData.carton.packedAt).toLocaleString(),
        Packager: cartonData.carton.packager,
        'Part Number': cartonData.product.partNumber,
        'Part Name': cartonData.product.name,
      },
    };
    columns.push({ title: '1. Scanned Finished Carton', nodes: [cartonNode] });

    // Col 1: Production Machine & Mold
    const runNode: DagNode = {
      id: `run-${cartonData.run.id}`,
      type: 'RUN',
      label: cartonData.run.orderNumber,
      subLabel: `${cartonData.machine.code} • Mold: ${cartonData.mold.code}`,
      status: cartonData.run.status,
      isQuarantined: isCartonQuarantined,
      metadata: {
        'Work Order': cartonData.run.orderNumber,
        Machine: `${cartonData.machine.code} (${cartonData.machine.name})`,
        'Mold Code': `${cartonData.mold.code} (${cartonData.mold.cavities} cavities)`,
        'Total Shots': cartonData.run.totalShots,
        'Good Output': `${cartonData.run.goodQuantity} pcs`,
        Scrapped: `${cartonData.run.rejectQuantity} pcs`,
        Status: cartonData.run.status,
      },
    };
    columns.push({ title: '2. Injection Molding Run', nodes: [runNode] });

    // Col 2: Raw Material Lots Consumed
    const lotNodes: DagNode[] = cartonData.rawMaterials.map((m) => {
      const isQuar = m.status === 'QUARANTINE';
      return {
        id: `lot-${m.lotNumber}`,
        type: 'LOT',
        label: m.lotNumber,
        subLabel: `${m.materialName} (${m.category})`,
        status: m.status,
        isQuarantined: isQuar,
        metadata: {
          'Lot Number': m.lotNumber,
          'Material Code': m.materialCode,
          'Material Name': m.materialName,
          Category: m.category,
          'Supplier Heat #': m.supplierLot ?? 'Internal/Certified',
          'Intake Qty': `${m.quantityKg} kg`,
          'Loaded By': `${m.loadedBy} at ${new Date(m.loadedAt).toLocaleTimeString()}`,
          Status: m.status,
          _lotId: m.lotId,
        },
      };
    });

    columns.push({
      title: `3. Upstream Resin Lots (${lotNodes.length})`,
      nodes: lotNodes.length > 0 ? lotNodes : [
        {
          id: 'no-materials',
          type: 'LOT',
          label: 'No Resin Lots Logged',
          subLabel: 'Hopper intake unrecorded',
          metadata: {},
        },
      ],
    });
  } else if (runData) {
    // RUN MODE (Centric around active run)
    // Col 0: Upstream Materials Consumed
    const matNodes: DagNode[] = (runData.rawMaterialsConsumed || []).map((m) => ({
      id: `mat-${m.lotNumber}`,
      type: 'LOT',
      label: m.lotNumber,
      subLabel: `${m.materialName} (${m.quantityKg} kg)`,
      metadata: {
        'Lot Number': m.lotNumber,
        'Material Name': m.materialName,
        Category: m.category,
        'Supplier Heat #': m.supplierLot ?? 'Internal',
        'Quantity Loaded': `${m.quantityKg} kg`,
        'Loaded By': `${m.loadedBy} (${new Date(m.loadedAt).toLocaleTimeString()})`,
      },
    }));
    columns.push({
      title: `1. Upstream Resin Lots (${matNodes.length})`,
      nodes: matNodes.length > 0 ? matNodes : [
        {
          id: 'no-mats',
          type: 'LOT',
          label: 'No Resin Lots Logged',
          subLabel: 'Load hopper to assign',
          metadata: {},
        },
      ],
    });

    // Col 1: Center Run
    const centerRunNode: DagNode = {
      id: `run-${runData.runId}`,
      type: 'RUN',
      label: runData.orderNumber,
      subLabel: `${runData.machine.code} • ${runData.product.partNumber}`,
      status: runData.runStatus,
      metadata: {
        'Work Order': runData.orderNumber,
        Machine: `${runData.machine.code} (${runData.machine.name})`,
        Mold: `${runData.mold.code} (${runData.mold.cavities} cav)`,
        'Total Shots': runData.totalShots,
        'Good Quantity': `${runData.goodQuantity} pcs`,
        Scrap: `${runData.rejectQuantity} pcs`,
        Status: runData.runStatus,
      },
    };
    columns.push({ title: '2. Molding Operation', nodes: [centerRunNode] });

    // Col 2: Downstream Cartons
    const cartonNodes: DagNode[] = (runData.packagingUnits || []).map((p) => ({
      id: `carton-${p.barcode}`,
      type: 'CARTON',
      label: p.barcode,
      subLabel: `${p.partCount} pcs • ${p.palletId ?? 'PAL-01'}`,
      metadata: {
        Barcode: p.barcode,
        Quantity: `${p.partCount} pcs`,
        Pallet: p.palletId ?? 'PAL-01',
        Packager: p.packager,
        'Packed At': new Date(p.packedAt).toLocaleString(),
      },
    }));
    columns.push({
      title: `3. Finished Cartons (${cartonNodes.length})`,
      nodes: cartonNodes.length > 0 ? cartonNodes : [
        {
          id: 'no-cartons',
          type: 'CARTON',
          label: 'No Cartons Packed Yet',
          subLabel: 'Molded parts in staging buffer',
          metadata: {},
        },
      ],
    });
  }

  const getNodeIcon = (type: DagNode['type']) => {
    switch (type) {
      case 'LOT':
        return <Package className="h-4 w-4" />;
      case 'HOPPER':
        return <Layers className="h-4 w-4" />;
      case 'RUN':
        return <Cpu className="h-4 w-4" />;
      case 'CARTON':
        return <QrCode className="h-4 w-4" />;
      case 'PALLET':
        return <Box className="h-4 w-4" />;
      default:
        return <Box className="h-4 w-4" />;
    }
  };

  const getNodeColorClasses = (node: DagNode) => {
    if (node.isQuarantined) {
      return 'border-[#E2483D] bg-[#FFECEB] text-[#5D1F1A] shadow-xs shadow-red-200';
    }
    switch (node.type) {
      case 'LOT':
        return 'border-[#6A9A23] bg-[#EFFFD6] text-[#37471F]';
      case 'RUN':
        return 'border-[#357DE8] bg-[#E9F2FE] text-[#123263]';
      case 'CARTON':
        return 'border-[#D8A0F7] bg-[#F3E8FF] text-[#58207E]';
      default:
        return 'border-[#0B120E24] bg-white text-[#292A2E]';
    }
  };

  return (
    <div className="relative rounded-xl border border-[#0B120E24] bg-[#F8F9FA] p-5 overflow-hidden shadow-xs">
      {/* Top Banner / Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#0B120E24] gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#505258]">
            {mode === 'forward'
              ? 'Forward Trace DAG (Resin Lot ➔ Finished Goods)'
              : mode === 'backward'
              ? 'Backward Trace DAG (Carton Barcode ➔ Virgin Resin)'
              : 'End-to-End Production Run Lineage'}
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#E9F2FE] text-[#1868DB] font-semibold">
            Interactive Node-Link Graph
          </span>
        </div>
        <span className="text-xs text-[#6B6E76]">
          Click any node to inspect lineage parameters or trigger containment
        </span>
      </div>

      {/* DAG Node Columns Canvas */}
      <div className="py-6 overflow-x-auto min-h-[360px] flex items-stretch justify-between gap-6">
        {columns.map((col, colIdx) => (
          <div key={col.title} className="flex-1 min-w-[240px] max-w-[320px] flex flex-col space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-[#505258] uppercase tracking-wide">
                {col.title}
              </span>
              <span className="text-[11px] font-mono text-[#8C8F97]">Col {colIdx + 1}</span>
            </div>

            <div className="flex-1 space-y-3 flex flex-col justify-center">
              {col.nodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => setSelectedNode(node)}
                    className={`w-full text-left p-3.5 rounded-lg border-2 transition-all transform hover:scale-[1.02] shadow-xs cursor-pointer ${getNodeColorClasses(
                      node,
                    )} ${isSelected ? 'ring-2 ring-[#1868DB] ring-offset-2' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <div
                          className={`p-1.5 rounded-md ${
                            node.isQuarantined
                              ? 'bg-[#C9372C] text-white'
                              : 'bg-white/80 text-[#292A2E]'
                          }`}
                        >
                          {getNodeIcon(node.type)}
                        </div>
                        <span className="font-mono font-bold text-xs truncate">
                          {node.label}
                        </span>
                      </div>
                      {node.isQuarantined ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#C9372C] text-white">
                          <AlertTriangle className="h-3 w-3" />
                          <span>QUARANTINE</span>
                        </span>
                      ) : node.status ? (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/70 border border-[#0B120E15]">
                          {node.status}
                        </span>
                      ) : null}
                    </div>

                    <p className="text-xs opacity-80 mt-2 truncate font-medium">
                      {node.subLabel}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Flyout / Slide-over Node Inspector Drawer */}
      {selectedNode && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-[#0B120E24] shadow-2xl p-6 overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-200">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#0B120E24]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-md bg-[#E9F2FE] text-[#1868DB]">
                  {getNodeIcon(selectedNode.type)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#292A2E]">{selectedNode.label}</h3>
                  <p className="text-xs text-[#505258]">{selectedNode.subLabel}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded-md text-[#505258] hover:bg-[#F1F2F4] transition-colors"
                aria-label="Close details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quarantine Status Banner if Quarantined */}
            {selectedNode.isQuarantined && (
              <div className="p-4 rounded-lg bg-[#FFECEB] border border-[#E2483D] text-[#5D1F1A] space-y-1">
                <div className="flex items-center gap-2 font-bold text-xs text-[#AE2E24]">
                  <ShieldAlert className="h-4 w-4" />
                  <span>MATERIAL RECALL / CONTAINMENT ACTIVE</span>
                </div>
                <p className="text-xs">
                  This entity is directly associated with a quarantined polymer lot. Downstream parts must be isolated for quality evaluation.
                </p>
              </div>
            )}

            {/* Attributes Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#505258] uppercase tracking-wider">
                Lineage Parameters & Attributes
              </h4>
              <div className="rounded-lg border border-[#0B120E24] divide-y divide-[#0B120E24] text-xs">
                {Object.entries(selectedNode.metadata)
                  .filter(([k]) => !k.startsWith('_'))
                  .map(([key, val]) => (
                    <div key={key} className="flex justify-between p-2.5 bg-white hover:bg-[#F8F8F8]">
                      <span className="font-semibold text-[#6B6E76]">{key}</span>
                      <span className="font-mono text-[#292A2E] text-right font-medium">
                        {String(val ?? '—')}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Regulatory Compliance Footnote */}
            <div className="p-3.5 rounded-lg bg-[#F8F9FA] border border-[#0B120E24] text-xs text-[#505258] space-y-1">
              <span className="font-bold text-[#292A2E] block">ISO 9001 / IATF 16949 Audit Trail</span>
              <p className="text-[11px] text-[#6B6E76]">
                This genealogy node is cryptographically linked to machine shot telemetry and raw material certificates.
              </p>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-6 border-t border-[#0B120E24] space-y-2">
            {selectedNode.type === 'LOT' && onQuarantineClick && !selectedNode.isQuarantined && (
              <button
                type="button"
                onClick={() => {
                  const lotId = (selectedNode.metadata._lotId as string) ?? selectedNode.id.replace('lot-', '');
                  onQuarantineClick(lotId, selectedNode.label);
                  setSelectedNode(null);
                }}
                className="w-full min-h-[40px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-xs font-bold bg-[#C9372C] hover:bg-[#AE2E24] text-white shadow-xs transition-colors"
              >
                <ShieldAlert className="h-4 w-4" />
                <span>Quarantine Lot & Contain Blast Radius</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedNode(null)}
              className="w-full min-h-[36px] px-4 py-2 rounded-md text-xs font-medium bg-[#FFFFFF] hover:bg-[#F8F8F8] text-[#292A2E] border border-[#0B120E24] transition-colors"
            >
              Close Inspector
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
