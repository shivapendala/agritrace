export type UserRole = 
  | 'SUPER_ADMIN'
  | 'FARMER'
  | 'QUALITY_OFFICER'
  | 'WAREHOUSE_MANAGER'
  | 'TRANSPORT_MANAGER'
  | 'DRIVER'
  | 'RETAILER'
  | 'CUSTOMER';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone_number?: string;
  organization?: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  phone_number?: string;
  organization?: string;
}

