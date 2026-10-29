import type { LoginResponse } from '../types/auth.js';
import type { Machine } from '../types/machine.js';
import type { AndonTicket } from '../types/andon.js';
import type { ProductionOrder, ProductionRun, Product, Mold, OrderOperationStep } from '../types/production.js';
import type { OeeCalculationResult, PlantOeeResponse, ExecutiveOeeAnalyticsResponse, ExecutiveOeeFilterParams } from '../types/oee.js';
import type { Material, MaterialLot, RunGenealogy, LotGenealogy, CartonGenealogy, QuarantineResponse, HopperLevel } from '../types/materials.js';
import type { InspectionPlan, QualityCheck, FirstPieceReleaseStatus, CpkAnalyticsResponse } from '../types/quality.js';
import type { MoldPmSchedule, MaintenanceWorkOrder } from '../types/maintenance.js';
import type { PackagingUnit, RunReconciliation } from '../types/packaging.js';
import type { SchedulingTimelineResponse, MoldChangeoverRule } from '../types/scheduling.js';
import type {
  DigitalTravelerRecord,
  CertificateOfConformanceDto,
  TravelerRunSummaryDto,
  SignoffTravelerPayload,
} from '../types/traveler.js';
import type {
  IotGatewayStatus,
  RawPacketRecord,
  MachineIngestSource,
  ModbusGatewayStatus,
  IngestSourceMode,
  ModbusClientConfig,
} from '../types/iot-gateway.js';

const API_BASE_URL = '/api/v1';

class ApiError extends Error {
  public status: number;
  public data?: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('mes_auth_token');
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('mes_auth_token', token);
    } else {
      localStorage.removeItem('mes_auth_token');
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorData: unknown;
      try {
        errorData = await response.json();
      } catch {
        errorData = await response.text();
      }
      const message =
        typeof errorData === 'object' && errorData !== null && 'message' in errorData
          ? String((errorData as { message: unknown }).message)
          : `HTTP ${response.status}: ${response.statusText}`;
      throw new ApiError(response.status, message, errorData);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  // --- Auth Endpoints ---
  public async login(username: string, password = 'password123'): Promise<LoginResponse> {
    const data = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setToken(data.accessToken);
    return data;
  }

  // --- Machine Endpoints ---
  public async getMachines(areaId?: string): Promise<Machine[]> {
    const query = areaId ? `?areaId=${encodeURIComponent(areaId)}` : '';
    return this.request<Machine[]>(`/machines${query}`);
  }

  public async getMachineById(id: string): Promise<Machine> {
    return this.request<Machine>(`/machines/${encodeURIComponent(id)}`);
  }

  // --- Master Data (Products & Molds) ---
  public async getProducts(): Promise<Product[]> {
    return this.request<Product[]>('/products');
  }

  public async getMolds(): Promise<Mold[]> {
    return this.request<Mold[]>('/molds');
  }

  // --- Simulator Endpoints ---
  public async getSimulatorStatus(): Promise<{
    isRunning: boolean;
    speedMultiplier: number;
    baseTickIntervalMs: number;
    currentSeed: number;
    nodes: Array<{
      machineCode: string;
      name: string;
      tonnage: number;
      normalizedStatus: string;
      rawStatus: string;
      cycleCounter: number;
      currentPhase: string;
      nominalCycleTimeSeconds: number;
      isSlowCycleActive: boolean;
      isFaultActive: boolean;
      activeFaultCode: string | null;
      isDisconnected: boolean;
    }>;
  }> {
    return this.request('/simulator/status');
  }

  public async startSimulator(): Promise<{ status: string }> {
    return this.request('/simulator/start', { method: 'POST' });
  }

  public async stopSimulator(): Promise<{ status: string }> {
    return this.request('/simulator/stop', { method: 'POST' });
  }

  public async setSimulatorSpeed(speedMultiplier: number): Promise<{ status: string; speedMultiplier: number }> {
    return this.request('/simulator/speed', {
      method: 'POST',
      body: JSON.stringify({ speedMultiplier }),
    });
  }

  public async resetSimulator(seed?: number): Promise<{ status: string }> {
    return this.request('/simulator/reset', {
      method: 'POST',
      body: JSON.stringify({ seed }),
    });
  }

  public async triggerScenario(dto: {
    machineCode: string;
    scenario: 'NORMAL' | 'SLOW_CYCLE' | 'HEATER_FAULT' | 'ESTOP' | 'DISCONNECT';
    customCycleTimeSeconds?: number;
    faultCode?: string;
  }): Promise<{ status: string; message: string }> {
    return this.request('/simulator/scenarios/trigger', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  // --- Production Endpoints ---
  public async getOrders(params?: { status?: string; productId?: string }): Promise<ProductionOrder[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.productId) query.set('productId', params.productId);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<ProductionOrder[]>(`/production/orders${qs}`);
  }

  public async createOrder(dto: {
    orderNumber: string;
    productId: string;
    targetQuantity: number;
    plannedStartTime: string;
  }): Promise<ProductionOrder> {
    return this.request<ProductionOrder>('/production/orders', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  public async releaseOrder(id: string): Promise<ProductionOrder> {
    return this.request<ProductionOrder>(`/production/orders/${encodeURIComponent(id)}/release`, {
      method: 'PATCH',
    });
  }

  public async getRuns(params?: { machineId?: string; status?: string }): Promise<ProductionRun[]> {
    const query = new URLSearchParams();
    if (params?.machineId) query.set('machineId', params.machineId);
    if (params?.status) query.set('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<ProductionRun[]>(`/production/runs${qs}`);
  }

  public async getActiveRun(machineId: string): Promise<ProductionRun | null> {
    try {
      return await this.request<ProductionRun>(`/production/runs/active/${encodeURIComponent(machineId)}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  }

  public async startRun(dto: {
    productionOrderId: string;
    machineId: string;
    moldId: string;
  }): Promise<ProductionRun> {
    return this.request<ProductionRun>('/production/runs/start', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  public async pauseRun(id: string): Promise<ProductionRun> {
    return this.request<ProductionRun>(`/production/runs/${encodeURIComponent(id)}/pause`, {
      method: 'POST',
    });
  }

  public async completeRun(id: string): Promise<ProductionRun> {
    return this.request<ProductionRun>(`/production/runs/${encodeURIComponent(id)}/complete`, {
      method: 'POST',
    });
  }

  public async releaseRunToActive(id: string): Promise<ProductionRun> {
    return this.request<ProductionRun>(`/production/runs/${encodeURIComponent(id)}/release-to-active`, {
      method: 'POST',
    });
  }

  public async recordScrap(runId: string, dto: {
    quantity: number;
    defectCode: string;
    notes?: string;
  }): Promise<ProductionRun> {
    return this.request<ProductionRun>(`/production/runs/${encodeURIComponent(runId)}/scrap`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  // --- OEE Endpoints ---
  public async getExecutiveOeeAnalytics(params?: ExecutiveOeeFilterParams): Promise<ExecutiveOeeAnalyticsResponse> {
    const query = new URLSearchParams();
    if (params?.areaId) query.set('areaId', params.areaId);
    if (params?.machineId) query.set('machineId', params.machineId);
    if (params?.window) query.set('window', params.window);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<ExecutiveOeeAnalyticsResponse>(`/oee/executive${qs}`);
  }

  public async getMachineOee(machineId: string, window: 'RUN' | 'SHIFT' | 'DAY' = 'SHIFT'): Promise<OeeCalculationResult> {
    return this.request<OeeCalculationResult>(`/oee/machines/${encodeURIComponent(machineId)}?window=${window}`);
  }

  public async getPlantOee(window: 'SHIFT' | 'DAY' = 'SHIFT'): Promise<PlantOeeResponse> {
    return this.request<PlantOeeResponse>(`/oee/plant?window=${window}`);
  }

  // --- Andon Endpoints ---
  public async getAndonTickets(params?: { machineId?: string; status?: string }): Promise<AndonTicket[]> {
    const query = new URLSearchParams();
    if (params?.machineId) query.set('machineId', params.machineId);
    if (params?.status) query.set('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<AndonTicket[]>(`/andon/tickets${qs}`);
  }

  public async createAndonTicket(dto: {
    machineId: string;
    category: string;
    description: string;
    priority?: string;
  }): Promise<AndonTicket> {
    return this.request<AndonTicket>('/andon/tickets', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  public async acknowledgeAndonTicket(id: string): Promise<AndonTicket> {
    return this.request<AndonTicket>(`/andon/tickets/${encodeURIComponent(id)}/acknowledge`, {
      method: 'POST',
    });
  }

  public async resolveAndonTicket(id: string, dto: {
    downtimeReasonId?: string;
    downtimeClassification?: string;
    correctiveAction?: string;
  }): Promise<AndonTicket> {
    return this.request<AndonTicket>(`/andon/tickets/${encodeURIComponent(id)}/resolve`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  public async getAndonPareto(): Promise<Array<{ downtimeCategory: string; count: number; totalDurationMinutes: number }>> {
    return this.request('/andon/analytics/pareto');
  }

  public async getAndonMttr(): Promise<{
    mttrMinutes: number;
    mttdMinutes: number;
    totalIncidents: number;
  }> {
    return this.request('/andon/analytics/mttr');
  }

  // --- Materials Endpoints ---
  public async getMaterials(): Promise<Material[]> {
    return this.request<Material[]>('/materials');
  }

  public async getMaterialLots(materialId?: string, status?: string): Promise<MaterialLot[]> {
    const params = new URLSearchParams();
    if (materialId) params.append('materialId', materialId);
    if (status) params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<MaterialLot[]>(`/materials/lots/list${query}`);
  }

  public async loadHopper(dto: { runId: string; materialLotId: string; quantityKg: number }): Promise<unknown> {
    return this.request('/materials/hopper-load', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  public async getRunGenealogy(runId: string): Promise<RunGenealogy> {
    return this.request<RunGenealogy>(`/materials/genealogy/run/${encodeURIComponent(runId)}`);
  }

  public async getLotGenealogy(lotNumber: string): Promise<LotGenealogy> {
    return this.request<LotGenealogy>(`/materials/genealogy/lot/${encodeURIComponent(lotNumber)}`);
  }

  public async getCartonGenealogy(barcode: string): Promise<CartonGenealogy> {
    return this.request<CartonGenealogy>(`/materials/genealogy/carton/${encodeURIComponent(barcode)}`);
  }

  public async quarantineLot(lotId: string, reason?: string): Promise<QuarantineResponse> {
    return this.request<QuarantineResponse>(`/materials/lots/${encodeURIComponent(lotId)}/quarantine`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  public async getHopperLevels(): Promise<HopperLevel[]> {
    return this.request<HopperLevel[]>('/materials/hopper/levels');
  }

  // --- Quality Endpoints ---
  public async getInspectionPlans(productId?: string): Promise<InspectionPlan[]> {
    const query = productId ? `?productId=${encodeURIComponent(productId)}` : '';
    return this.request<InspectionPlan[]>(`/quality/plans${query}`);
  }

  public async getRunQualityChecks(runId: string): Promise<QualityCheck[]> {
    return this.request<QualityCheck[]>(`/quality/checks/run/${encodeURIComponent(runId)}`);
  }

  public async recordQualityCheck(dto: {
    runId: string;
    checkType: string;
    disposition?: string;
    notes?: string;
    samples: Array<{ planItemId: string; measuredValue?: number; isPassed?: boolean }>;
  }): Promise<QualityCheck> {
    return this.request<QualityCheck>('/quality/checks', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  public async getFirstPieceStatus(runId: string): Promise<FirstPieceReleaseStatus> {
    return this.request<FirstPieceReleaseStatus>(`/quality/runs/${encodeURIComponent(runId)}/first-piece-status`);
  }

  public async getCpkAnalytics(params?: {
    productId?: string;
    planItemId?: string;
    runId?: string;
  }): Promise<CpkAnalyticsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.productId) queryParams.append('productId', params.productId);
    if (params?.planItemId) queryParams.append('planItemId', params.planItemId);
    if (params?.runId) queryParams.append('runId', params.runId);
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<CpkAnalyticsResponse>(`/quality/cpk${query}`);
  }

  // --- Maintenance Endpoints ---
  public async getMoldPmSchedules(moldId: string): Promise<MoldPmSchedule[]> {
    return this.request<MoldPmSchedule[]>(`/maintenance/schedules/mold/${encodeURIComponent(moldId)}`);
  }

  public async getMaintenanceWorkOrders(filter?: {
    moldId?: string;
    machineId?: string;
    status?: string;
    workType?: string;
  }): Promise<MaintenanceWorkOrder[]> {
    const params = new URLSearchParams();
    if (filter?.moldId) params.append('moldId', filter.moldId);
    if (filter?.machineId) params.append('machineId', filter.machineId);
    if (filter?.status) params.append('status', filter.status);
    if (filter?.workType) params.append('workType', filter.workType);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<MaintenanceWorkOrder[]>(`/maintenance/work-orders${query}`);
  }

  public async updateWorkOrderStatus(
    id: string,
    dto: { status?: string; assignedTechId?: string; checklistPayload?: string },
  ): Promise<MaintenanceWorkOrder> {
    return this.request<MaintenanceWorkOrder>(`/maintenance/work-orders/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  }

  // --- Packaging Endpoints ---
  public async createPackagingUnit(dto: {
    runId: string;
    partCount: number;
    palletId?: string;
    barcode?: string;
  }): Promise<PackagingUnit> {
    return this.request<PackagingUnit>('/packaging/units', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  public async getPackagingUnits(runId?: string, palletId?: string): Promise<PackagingUnit[]> {
    const params = new URLSearchParams();
    if (runId) params.append('runId', runId);
    if (palletId) params.append('palletId', palletId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<PackagingUnit[]>(`/packaging/units${query}`);
  }

  public async reconcileRunPackaging(runId: string): Promise<RunReconciliation> {
    return this.request<RunReconciliation>(`/packaging/reconcile/run/${encodeURIComponent(runId)}`);
  }

  // --- Hybrid Operation Steps Endpoints ---
  public async getOrderOperationSteps(orderId: string): Promise<OrderOperationStep[]> {
    return this.request<OrderOperationStep[]>(`/production/orders/${encodeURIComponent(orderId)}/steps`);
  }

  public async updateOrderOperationStep(
    orderId: string,
    stepId: string,
    data: {
      status?: string;
      quantityIn?: number;
      quantityPassed?: number;
      quantityScrapped?: number;
    },
  ): Promise<OrderOperationStep> {
    return this.request<OrderOperationStep>(
      `/production/orders/${encodeURIComponent(orderId)}/steps/${encodeURIComponent(stepId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
    );
  }

  // --- Production Scheduling & Gantt Endpoints ---
  public async getSchedulingTimeline(startDate?: string, endDate?: string, areaId?: string): Promise<SchedulingTimelineResponse> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (areaId) params.append('areaId', areaId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<SchedulingTimelineResponse>(`/scheduling/timeline${query}`);
  }

  public async getSchedulingBacklog(): Promise<ProductionOrder[]> {
    return this.request<ProductionOrder[]>('/scheduling/backlog');
  }

  public async scheduleOrder(
    orderId: string,
    dto: {
      machineId: string;
      moldId: string;
      plannedStartTime: string;
      plannedEndTime?: string;
      priority?: number;
      schedulingNotes?: string;
    },
  ): Promise<ProductionOrder> {
    return this.request<ProductionOrder>(`/scheduling/orders/${encodeURIComponent(orderId)}/schedule`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  public async rescheduleOrder(
    orderId: string,
    dto: {
      machineId?: string;
      moldId?: string;
      plannedStartTime: string;
      plannedEndTime?: string;
    },
  ): Promise<ProductionOrder> {
    return this.request<ProductionOrder>(`/scheduling/orders/${encodeURIComponent(orderId)}/reschedule`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  }

  public async unscheduleOrder(orderId: string): Promise<ProductionOrder> {
    return this.request<ProductionOrder>(`/scheduling/orders/${encodeURIComponent(orderId)}/unschedule`, {
      method: 'POST',
    });
  }

  public async releaseScheduledOrder(orderId: string): Promise<ProductionOrder> {
    return this.request<ProductionOrder>(`/scheduling/orders/${encodeURIComponent(orderId)}/release`, {
      method: 'POST',
    });
  }

  public async getMoldChangeovers(): Promise<MoldChangeoverRule[]> {
    return this.request<MoldChangeoverRule[]>('/scheduling/changeovers');
  }

  public async upsertMoldChangeover(dto: {
    fromMoldId: string;
    toMoldId: string;
    setupMinutes: number;
    purgeMinutes: number;
  }): Promise<MoldChangeoverRule> {
    return this.request<MoldChangeoverRule>('/scheduling/changeovers', {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  }

  // --- Digital Traveler & CoC Endpoints ---
  public async getTravelerRuns(): Promise<TravelerRunSummaryDto[]> {
    return this.request<TravelerRunSummaryDto[]>('/traveler/runs');
  }

  public async getDigitalTraveler(runId: string): Promise<DigitalTravelerRecord> {
    return this.request<DigitalTravelerRecord>(`/traveler/${encodeURIComponent(runId)}`);
  }

  public async signoffTraveler(
    runId: string,
    dto: SignoffTravelerPayload,
  ): Promise<{
    success: boolean;
    status: string;
    signedBy: string;
    tamperProofHash: string;
    signedAt: string;
  }> {
    return this.request(`/traveler/${encodeURIComponent(runId)}/signoff`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  public async getCertificateOfConformance(runId: string): Promise<CertificateOfConformanceDto> {
    return this.request<CertificateOfConformanceDto>(`/traveler/${encodeURIComponent(runId)}/coc`);
  }

  // --- Industrial IoT Gateway Endpoints ---
  public async getIotGatewayStatus(): Promise<IotGatewayStatus> {
    return this.request<IotGatewayStatus>('/iot-gateway/status');
  }

  public async getIotGatewayPackets(machineCode?: string, limit = 20): Promise<RawPacketRecord[]> {
    const params = new URLSearchParams();
    if (machineCode) params.append('machineCode', machineCode);
    if (limit) params.append('limit', limit.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<RawPacketRecord[]>(`/iot-gateway/packets${query}`);
  }

  public async simulateEuromap77Packet(
    machineCode: string,
    overrides?: Record<string, unknown>,
  ): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/iot-gateway/simulate-euromap77', {
      method: 'POST',
      body: JSON.stringify({ machineCode, ...overrides }),
    });
  }

  public async getIngestSources(): Promise<MachineIngestSource[]> {
    return this.request<MachineIngestSource[]>('/iot-gateway/ingest-sources');
  }

  public async updateIngestSource(
    machineCode: string,
    data: { source: IngestSourceMode; modbusConfig?: ModbusClientConfig; mqttTopic?: string },
  ): Promise<MachineIngestSource> {
    return this.request<MachineIngestSource>(`/iot-gateway/ingest-sources/${encodeURIComponent(machineCode)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async getModbusStatus(): Promise<ModbusGatewayStatus> {
    return this.request<ModbusGatewayStatus>('/iot-gateway/modbus/status');
  }

  public async writeModbusRegister(dto: {
    machineCode: string;
    registerAddress: number;
    value: number;
  }): Promise<{ success: boolean; machineCode: string; register: number; value: number }> {
    return this.request('/iot-gateway/modbus/write-register', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  public async pollModbusMachine(machineCode: string): Promise<{ success: boolean; machineCode: string; polled?: string }> {
    return this.request(`/iot-gateway/modbus/poll/${encodeURIComponent(machineCode)}`, {
      method: 'POST',
    });
  }
}

export const api = new ApiService();
