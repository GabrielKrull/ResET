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

export interface DatabaseSchema {
  system_meta: SystemMetaTable;
  users: UsersTable;
}
