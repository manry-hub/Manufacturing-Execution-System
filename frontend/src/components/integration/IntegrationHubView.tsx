import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  ShieldCheck,
  Wrench,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Server,
  ExternalLink,
  Radio,
  FileCode2,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useShopfloor } from '../../context/ShopfloorContext.js';
import { SchedulingView } from '../scheduling/SchedulingView.js';
import { QualityView } from '../quality/QualityView.js';
import { MaintenanceView } from '../maintenance/MaintenanceView.js';

type IntegrationTab = 'plm' | 'ppss' | 'qms' | 'mms' | 'bridges';

interface PlmRecipeItem {
  id: string;
  recipeCode: string;
  revision: string;
  status: string;
  product: { id: string; partNumber: string; name: string };
  mold: { id: string; code: string; name: string; cavityCount: number };
  clampingTonnage: number;
  injectionPressureBar: number;
  holdingPressureBar: number;
  holdingTimeSec: number;
  coolingTimeSec: number;
  cushionLimitMm: number;
  tempTolerance: number;
  cushionToleranceMm: number;
  barrelTempZones: number[];
  resinGrade: string;
  masterbatchGrade?: string | null;
  masterbatchRatio?: number;
  regrindAllowedPct?: number;
  cadInstructionUrl?: string | null;
  plmApprovedAt: string;
  updatedAt: string;
}

interface ServiceAccountItem {
  id: string;
  name: string;
  clientId: string;
  scopeType: string;
  scopeId: string;
  isActive: boolean;
  permissions: string[];
  updatedAt: string;
}

export const IntegrationHubView: React.FC = () => {
  const { runs, refreshData } = useShopfloor();
  const [activeTab, setActiveTab] = useState<IntegrationTab>('plm');

  // PLM Tab State
  const [recipes, setRecipes] = useState<PlmRecipeItem[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<PlmRecipeItem | null>(null);
  const [isLoadingPlm, setIsLoadingPlm] = useState<boolean>(true);
  const [isSyncingMock, setIsSyncingMock] = useState<boolean>(false);

  // Bridges Tab State
  const [serviceAccounts, setServiceAccounts] = useState<ServiceAccountItem[]>([]);
  const [isLoadingBridges, setIsLoadingBridges] = useState<boolean>(true);
  const [pingResult, setPingResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isPinging, setIsPinging] = useState<boolean>(false);

  // Load PLM Recipes
  const loadPlmRecipes = useCallback(async () => {
    setIsLoadingPlm(true);
    try {
      const data = await api.getPlmRecipes();
      setRecipes(data);
      if (data.length > 0 && !selectedRecipe) {
        setSelectedRecipe(data[0]);
      }
    } catch (err) {
      console.error('Failed to load PLM recipes', err);
    } finally {
      setIsLoadingPlm(false);
    }
  }, [selectedRecipe]);

  // Load Service Accounts
  const loadServiceAccounts = useCallback(async () => {
    setIsLoadingBridges(true);
    try {
      const accounts = await api.getServiceAccounts();
      setServiceAccounts(accounts);
    } catch (err) {
      console.error('Failed to load service accounts', err);
    } finally {
      setIsLoadingBridges(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'plm') {
      void loadPlmRecipes();
    } else if (activeTab === 'bridges') {
      void loadServiceAccounts();
    }
  }, [activeTab, loadPlmRecipes, loadServiceAccounts]);

  // Test Ping Handler
  const handleTestPing = async () => {
    setIsPinging(true);
    setPingResult(null);
    try {
      const result = await api.testIntegrationPing();
      setPingResult(result);
    } catch (err: any) {
      setPingResult({
        success: false,
        message: err.message || 'Network ping error',
      });
    } finally {
      setIsPinging(false);
    }
  };

  // Trigger Sample PLM Sync
  const handleQuickPlmSync = async () => {
    setIsSyncingMock(true);
    try {
      await api.syncPlmRecipe({
        recipeCode: 'RCP-AUTO-BUMPER-MOLD-BUMP-2C-REVB',
        productPartNumber: 'PRD-AUTO-BUMPER',
        moldCode: 'MOLD-BUMP-2C',
        revision: 'REV-B',
        barrelTempZones: [205, 210, 215, 220, 225],
        tempTolerance: 4.5,
        injectionPressureBar: 145.0,
        holdingPressureBar: 98.0,
        holdingTimeSec: 6.8,
        coolingTimeSec: 11.5,
        cushionLimitMm: 4.4,
        cushionToleranceMm: 0.45,
        clampingTonnage: 350,
        resinGrade: 'PP-IM-750-PRIME',
        masterbatchGrade: 'MB-BLACK-01',
        masterbatchRatio: 2.2,
        regrindAllowedPct: 10.0,
        cadInstructionUrl: 'https://docs.manufacturing.local/cad/auto-bumper-rev-b.pdf',
      });
      await loadPlmRecipes();
    } catch (err) {
      console.error('Failed to sync PLM recipe', err);
    } finally {
      setIsSyncingMock(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#E9F2FE] text-[#123263] border border-[#8FB8F6]">
                ISA-95 Level 3-4 Gateway
              </span>
              <span className="text-xs text-[#6B6E76]">Enterprise System Touchpoints</span>
            </div>
            <h1 className="text-xl font-bold text-[#292A2E] tracking-tight">
              External systems & integration hub
            </h1>
            <p className="text-xs text-[#505258] mt-1 max-w-3xl leading-relaxed">
              Unified console bridging MES shop-floor execution with connected enterprise platforms: PLM process recipes, PPSS finite scheduling, QMS quality gating, MMS tooling life cycles, and WMS/ERP machine-to-machine service accounts.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'plm') void loadPlmRecipes();
                if (activeTab === 'bridges') void loadServiceAccounts();
                if (activeTab === 'qms' && refreshData) void refreshData();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FAFBFC] hover:bg-[#F1F2F4] text-[#292A2E] border border-[#0B120E24] shadow-xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#505258]" />
              <span>Refresh data</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#0B120E24] mt-5 gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('plm')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'plm'
                ? 'border-[#1868DB] text-[#1868DB] bg-[#E9F2FE]/30'
                : 'border-transparent text-[#505258] hover:text-[#292A2E]'
            }`}
          >
            <FileCode2 className="w-4 h-4" />
            <span>PLM engineering & recipes</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-[#E9F2FE] text-[#123263] border border-[#8FB8F6]">
              {recipes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ppss')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'ppss'
                ? 'border-[#1868DB] text-[#1868DB] bg-[#E9F2FE]/30'
                : 'border-transparent text-[#505258] hover:text-[#292A2E]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>PPSS finite scheduler</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('qms')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'qms'
                ? 'border-[#1868DB] text-[#1868DB] bg-[#E9F2FE]/30'
                : 'border-transparent text-[#505258] hover:text-[#292A2E]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>QMS first-piece gating</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mms')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'mms'
                ? 'border-[#1868DB] text-[#1868DB] bg-[#E9F2FE]/30'
                : 'border-transparent text-[#505258] hover:text-[#292A2E]'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>MMS tooling maintenance</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bridges')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'bridges'
                ? 'border-[#1868DB] text-[#1868DB] bg-[#E9F2FE]/30'
                : 'border-transparent text-[#505258] hover:text-[#292A2E]'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>M2M service accounts & bridges</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-[#E3FCEF] text-[#164B35] border border-[#7EE2B8]">
              6 M2M
            </span>
          </button>
        </div>
      </div>

      {/* Tab 1: PLM Engineering Recipes */}
      {activeTab === 'plm' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#292A2E]">
                Synchronized PLM process recipes
              </h2>
              <p className="text-xs text-[#6B6E76]">
                Physical parameter envelopes released by PLM Engineering (`service-plm`) enforced at the primary injection molding work centers.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSyncingMock}
                onClick={() => void handleQuickPlmSync()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1868DB] hover:bg-[#1558BC] text-[#FFFFFF] shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isSyncingMock ? 'Syncing...' : 'Sync PLM Rev-B test recipe'}</span>
              </button>
            </div>
          </div>

          {isLoadingPlm ? (
            <div className="bg-white border border-[#0B120E24] rounded-xl p-8 text-center text-xs text-[#6B6E76]">
              Loading PLM recipes...
            </div>
          ) : recipes.length === 0 ? (
            <div className="bg-white border border-[#0B120E24] rounded-xl p-8 text-center text-xs text-[#6B6E76]">
              No recipes synchronized from PLM yet. Click "Sync PLM Rev-B test recipe" above to ingest from `service-plm`.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Recipe List */}
              <div className="lg:col-span-1 space-y-3">
                {recipes.map((rcp) => {
                  const isSelected = selectedRecipe?.id === rcp.id;
                  return (
                    <div
                      key={rcp.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedRecipe(rcp)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setSelectedRecipe(rcp);
                        }
                      }}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#E9F2FE] border-[#1868DB] shadow-xs'
                          : 'bg-[#FFFFFF] border-[#0B120E24] hover:border-[#8FB8F6]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-xs font-bold text-[#1868DB]">
                          {rcp.recipeCode}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#E3FCEF] text-[#164B35] border border-[#7EE2B8]">
                          {rcp.status}
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-[#292A2E] mb-1">
                        {rcp.product.name}
                      </div>
                      <div className="text-[11px] text-[#6B6E76] space-y-0.5">
                        <div>Part: <span className="font-mono text-[#292A2E]">{rcp.product.partNumber}</span></div>
                        <div>Mold: <span className="font-mono text-[#292A2E]">{rcp.mold.code}</span> ({rcp.mold.cavityCount} cavities)</div>
                        <div>Revision: <span className="font-bold text-[#292A2E]">{rcp.revision}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Recipe Specification & Envelope */}
              <div className="lg:col-span-2">
                {selectedRecipe ? (
                  <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-xl p-6 shadow-xs space-y-6">
                    {/* Title Header */}
                    <div className="flex items-start justify-between border-b border-[#0B120E14] pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-[#292A2E]">
                            {selectedRecipe.recipeCode}
                          </h3>
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#E9F2FE] text-[#123263] border border-[#8FB8F6]">
                            {selectedRecipe.revision}
                          </span>
                        </div>
                        <p className="text-xs text-[#505258] mt-0.5">
                          Assigned to {selectedRecipe.product.name} with tooling {selectedRecipe.mold.name}
                        </p>
                      </div>

                      {selectedRecipe.cadInstructionUrl && (
                        <a
                          href={selectedRecipe.cadInstructionUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#1868DB] hover:underline"
                        >
                          <span>CAD instruction</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    {/* Temperature Heating Zones 1–5 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[#292A2E]">
                          Barrel PID heating zones (Tolerance: ±{selectedRecipe.tempTolerance}°C)
                        </span>
                        <span className="text-xs text-[#6B6E76]">Injection barrel profile</span>
                      </div>

                      <div className="grid grid-cols-5 gap-2">
                        {selectedRecipe.barrelTempZones.map((temp, idx) => (
                          <div
                            key={idx}
                            className="bg-[#F8F9FA] border border-[#0B120E18] rounded-lg p-2.5 text-center"
                          >
                            <div className="text-[10px] font-semibold text-[#6B6E76] uppercase">
                              Zone {idx + 1}
                            </div>
                            <div className="text-sm font-bold text-[#292A2E] mt-0.5">
                              {temp}°C
                            </div>
                            <div className="text-[10px] text-[#216E4E] font-medium">
                              ±{selectedRecipe.tempTolerance}°C
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Machine Parameter Envelopes */}
                    <div>
                      <div className="text-xs font-bold text-[#292A2E] mb-2">
                        Validated machine parameter envelope
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-[#F8F9FA] border border-[#0B120E18] rounded-lg p-3">
                          <span className="text-[11px] text-[#6B6E76]">Injection pressure</span>
                          <div className="text-sm font-bold text-[#292A2E] mt-0.5">
                            {selectedRecipe.injectionPressureBar} bar
                          </div>
                        </div>

                        <div className="bg-[#F8F9FA] border border-[#0B120E18] rounded-lg p-3">
                          <span className="text-[11px] text-[#6B6E76]">Holding pressure</span>
                          <div className="text-sm font-bold text-[#292A2E] mt-0.5">
                            {selectedRecipe.holdingPressureBar} bar
                          </div>
                        </div>

                        <div className="bg-[#F8F9FA] border border-[#0B120E18] rounded-lg p-3">
                          <span className="text-[11px] text-[#6B6E76]">Cooling duration</span>
                          <div className="text-sm font-bold text-[#292A2E] mt-0.5">
                            {selectedRecipe.coolingTimeSec} s
                          </div>
                        </div>

                        <div className="bg-[#F8F9FA] border border-[#0B120E18] rounded-lg p-3">
                          <span className="text-[11px] text-[#6B6E76]">Cushion limit</span>
                          <div className="text-sm font-bold text-[#292A2E] mt-0.5">
                            {selectedRecipe.cushionLimitMm} mm
                          </div>
                          <span className="text-[10px] text-[#6B6E76]">±{selectedRecipe.cushionToleranceMm} mm</span>
                        </div>
                      </div>
                    </div>

                    {/* mBOM Raw Material Specification */}
                    <div className="border-t border-[#0B120E14] pt-4">
                      <div className="text-xs font-bold text-[#292A2E] mb-2">
                        mBOM raw material formulation
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="p-2.5 rounded-lg border border-[#0B120E18] bg-[#FAFBFC]">
                          <span className="text-[#6B6E76]">Virgin resin grade:</span>
                          <div className="font-mono font-bold text-[#292A2E] mt-0.5">
                            {selectedRecipe.resinGrade}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg border border-[#0B120E18] bg-[#FAFBFC]">
                          <span className="text-[#6B6E76]">Masterbatch colorant:</span>
                          <div className="font-mono font-bold text-[#292A2E] mt-0.5">
                            {selectedRecipe.masterbatchGrade ?? 'N/A'} ({selectedRecipe.masterbatchRatio ?? 0}%)
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg border border-[#0B120E18] bg-[#FAFBFC]">
                          <span className="text-[#6B6E76]">Max allowed regrind:</span>
                          <div className="font-bold text-[#292A2E] mt-0.5">
                            {selectedRecipe.regrindAllowedPct}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-[#0B120E24] rounded-xl p-8 text-center text-xs text-[#6B6E76]">
                    Select a recipe on the left to inspect parameters
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: PPSS Scheduling View */}
      {activeTab === 'ppss' && (
        <div className="space-y-4">
          <div className="bg-[#E9F2FE] border border-[#8FB8F6] rounded-xl p-4 flex items-center justify-between text-xs text-[#123263]">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#1868DB]" />
              <span>
                <strong>PPSS Schedule Dispatch Touchpoint:</strong> Work orders sequenced by PPIC finite capacity scheduling.
              </span>
            </div>
            <span className="font-mono text-[11px] font-bold">service-ppss: CONNECTED</span>
          </div>
          <SchedulingView />
        </div>
      )}

      {/* Tab 3: QMS Quality View */}
      {activeTab === 'qms' && (
        <div className="space-y-4">
          <div className="bg-[#EDE7F6] border border-[#B39DDB] rounded-xl p-4 flex items-center justify-between text-xs text-[#4A148C]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#5E35B1]" />
              <span>
                <strong>Hard First-Piece QC Gating:</strong> Serial production is locked until Quality releases initial sample inspection.
              </span>
            </div>
            <span className="font-mono text-[11px] font-bold">service-qms: CONNECTED</span>
          </div>
          <QualityView runs={runs} onRefreshRuns={refreshData} />
        </div>
      )}

      {/* Tab 4: MMS Tooling Maintenance View */}
      {activeTab === 'mms' && (
        <div className="space-y-4">
          <div className="bg-[#FBE9E7] border border-[#FFAB91] rounded-xl p-4 flex items-center justify-between text-xs text-[#BF360C]">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#D84315]" />
              <span>
                <strong>MMS Tooling Life Cycle:</strong> Stroke odometer accumulates shots and asserts PM interlock when thresholds are exceeded.
              </span>
            </div>
            <span className="font-mono text-[11px] font-bold">service-mms: CONNECTED</span>
          </div>
          <MaintenanceView />
        </div>
      )}

      {/* Tab 5: M2M Service Accounts & Bridges */}
      {activeTab === 'bridges' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#292A2E]">
                Active machine-to-machine service accounts
              </h2>
              <p className="text-xs text-[#6B6E76]">
                Decoupled departmental systems authenticated via Client Credentials (`POST /api/v1/auth/token`).
              </p>
            </div>

            <button
              type="button"
              disabled={isPinging}
              onClick={() => void handleTestPing()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FAFBFC] hover:bg-[#F1F2F4] text-[#292A2E] border border-[#0B120E24] shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Radio className="w-3.5 h-3.5 text-[#1868DB]" />
              <span>{isPinging ? 'Pinging...' : 'Send integration test ping'}</span>
            </button>
          </div>

          {pingResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
                pingResult.success
                  ? 'bg-[#E3FCEF] border-[#7EE2B8] text-[#164B35]'
                  : 'bg-[#FFEBE6] border-[#FF8F73] text-[#DE350B]'
              }`}
            >
              <div className="flex items-center gap-2">
                {pingResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-[#216E4E]" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-[#C9372C]" />
                )}
                <span>{pingResult.message}</span>
              </div>
            </div>
          )}

          {isLoadingBridges ? (
            <div className="bg-white border border-[#0B120E24] rounded-xl p-8 text-center text-xs text-[#6B6E76]">
              Loading service accounts...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {serviceAccounts.map((sa) => (
                <div
                  key={sa.id}
                  className="bg-[#FFFFFF] border border-[#0B120E24] rounded-xl p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#E9F2FE] border border-[#8FB8F6] flex items-center justify-center text-[#1868DB] font-bold text-xs">
                        {sa.name.substring(0, 3)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#292A2E]">{sa.name} Department</h4>
                        <span className="font-mono text-[10px] text-[#6B6E76]">{sa.clientId}</span>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E3FCEF] text-[#164B35] border border-[#7EE2B8]">
                      ACTIVE
                    </span>
                  </div>

                  <div className="border-t border-[#0B120E14] pt-2.5 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[#6B6E76]">
                      <span>Scope:</span>
                      <span className="font-semibold text-[#292A2E]">{sa.scopeType} ({sa.scopeId})</span>
                    </div>

                    <div>
                      <span className="text-[11px] text-[#6B6E76]">Permissions:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {sa.permissions.map((perm, idx) => (
                          <span
                            key={idx}
                            className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-[#F1F2F4] text-[#44546F] border border-[#0B120E14]"
                          >
                            {perm}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
