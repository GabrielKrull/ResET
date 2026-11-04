import type { Generated } from "kysely";

export interface SystemMetaTable {
  id: Generated<number>;
  key: string;
  value: string;
  updated_at: Generated<Date>;
}

export interface UsersTable {
  id: Generated<number>;
  username: string;
  password_hash: string;
  is_admin: boolean;
  created_at: Generated<Date>;
}

export interface SessionsTable {
  id: Generated<number>;
  user_id: number;
  token_hash: string;
  created_at: Generated<Date>;
  last_activity_at: Date;
  idle_expires_at: Date;
  absolute_expires_at: Date;
  revoked_at: Date | null;
}

export interface DatabaseSchema {
  system_meta: SystemMetaTable;
  users: UsersTable;
  sessions: SessionsTable;
}
