import type { LoginResponse } from '../types/auth.js';
import type { Machine } from '../types/machine.js';
import type { AndonTicket } from '../types/andon.js';
import type { ProductionOrder, ProductionRun, Product, Mold } from '../types/production.js';
import type { OeeCalculationResult } from '../types/oee.js';

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
  public async getMachineOee(machineId: string, window: 'RUN' | 'SHIFT' | 'DAY' = 'SHIFT'): Promise<OeeCalculationResult> {
    return this.request<OeeCalculationResult>(`/oee/machines/${encodeURIComponent(machineId)}?window=${window}`);
  }

  public async getPlantOee(window: 'SHIFT' | 'DAY' = 'SHIFT'): Promise<OeeCalculationResult> {
    return this.request<OeeCalculationResult>(`/oee/plant?window=${window}`);
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
}

export const api = new ApiService();
