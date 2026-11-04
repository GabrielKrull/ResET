export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface HealthStatus {
  status: "ok" | "degraded" | "error";
  uptime: number;
  timestamp: string;
  version: string;
  services?: {
    database: "connected" | "disconnected";
  };
}
