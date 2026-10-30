export type UserRole =
  | 'admin'
  | 'plant_manager'
  | 'production_supervisor'
  | 'operator'
  | 'maintenance_lead'
  | 'maintenance_technician'
  | 'quality_inspector'
  | 'material_handler'
  | 'planner';

export interface User {
  id: string;
  username: string;
  name?: string;
  role: UserRole;
  token?: string;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    username: string;
    role: UserRole;
  };
}
