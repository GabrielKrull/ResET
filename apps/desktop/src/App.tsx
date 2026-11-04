import React, { useState, useEffect, useCallback } from "react";
import { APP_NAME, APP_VERSION } from "@reset/shared";

interface HealthInfo {
  serverStatus: "checking" | "online" | "offline";
  dbStatus: "checking" | "connected" | "disconnected";
  uptime?: number;
  timestamp?: string;
}

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthInfo>({
    serverStatus: "checking",
    dbStatus: "checking",
  });
  const [isRetrying, setIsRetrying] = useState(false);
  const [serverUrl] = useState(() => import.meta.env.VITE_API_URL);

  const checkConnectivity = useCallback(async () => {
    setIsRetrying(true);
    try {
      const res = await fetch(`${serverUrl}/health/ready`, {
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        const data = await res.json();
        setHealth({
          serverStatus: "online",
          dbStatus: data?.services?.database === "connected" ? "connected" : "disconnected",
          uptime: data.uptime,
          timestamp: data.timestamp,
        });
      } else if (res.status === 503) {
        setHealth({
          serverStatus: "online",
          dbStatus: "disconnected",
        });
      } else {
        setHealth({
          serverStatus: "offline",
          dbStatus: "disconnected",
        });
      }
    } catch {
      // Server unreachable
      setHealth({
        serverStatus: "offline",
        dbStatus: "disconnected",
      });
    } finally {
      setIsRetrying(false);
    }
  }, [serverUrl]);

  useEffect(() => {
    checkConnectivity();
  }, [checkConnectivity]);

  return (
    <main style={styles.container}>
      <header style={styles.header}>
        <div style={styles.logoBadge}>R</div>
        <h1 style={styles.title}>{APP_NAME}</h1>
        <span style={styles.versionBadge}>v{APP_VERSION}</span>
      </header>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Diagnóstico de Conectividade</h2>
        <p style={styles.cardDescription}>
          Verificação do status do servidor Fastify e do banco de dados PostgreSQL.
        </p>

        <div style={styles.statusList}>
          <div style={styles.statusRow}>
            <span style={styles.statusLabel}>Servidor Backend (Fastify):</span>
            <span
              style={{
                ...styles.statusBadge,
                backgroundColor:
                  health.serverStatus === "online"
                    ? "rgba(114, 200, 139, 0.15)"
                    : "rgba(239, 68, 68, 0.15)",
                color:
                  health.serverStatus === "online"
                    ? "var(--color-status-ok)"
                    : "var(--color-status-error)",
              }}
            >
              <span
                style={{
                  ...styles.statusDot,
                  backgroundColor:
                    health.serverStatus === "online"
                      ? "var(--color-status-ok)"
                      : "var(--color-status-error)",
                }}
              />
              {health.serverStatus === "checking"
                ? "Verificando..."
                : health.serverStatus === "online"
                  ? "Online"
                  : "Offline"}
            </span>
          </div>

          <div style={styles.statusRow}>
            <span style={styles.statusLabel}>Banco de Dados (PostgreSQL):</span>
            <span
              style={{
                ...styles.statusBadge,
                backgroundColor:
                  health.dbStatus === "connected"
                    ? "rgba(114, 200, 139, 0.15)"
                    : "rgba(239, 68, 68, 0.15)",
                color:
                  health.dbStatus === "connected"
                    ? "var(--color-status-ok)"
                    : "var(--color-status-error)",
              }}
            >
              <span
                style={{
                  ...styles.statusDot,
                  backgroundColor:
                    health.dbStatus === "connected"
                      ? "var(--color-status-ok)"
                      : "var(--color-status-error)",
                }}
              />
              {health.dbStatus === "checking"
                ? "Verificando..."
                : health.dbStatus === "connected"
                  ? "Conectado"
                  : "Desconectado"}
            </span>
          </div>

          {health.uptime !== undefined && (
            <div style={styles.statusRow}>
              <span style={styles.statusLabel}>Uptime do Servidor:</span>
              <span style={styles.uptimeText}>{health.uptime}s</span>
            </div>
          )}
        </div>

        <div style={styles.actions}>
          <button onClick={checkConnectivity} disabled={isRetrying} style={styles.reconnectButton}>
            {isRetrying ? "Verificando..." : "Testar Conexão"}
          </button>
        </div>
      </section>

      <footer style={styles.footer}>
        <span>Sprint 0 — Fundação Arquitetural</span>
      </footer>
    </main>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    padding: "2rem",
    backgroundColor: "var(--color-bg)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginBottom: "2rem",
  },
  logoBadge: {
    width: "40px",
    height: "40px",
    borderRadius: "var(--radius-md)",
    backgroundColor: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    color: "var(--color-accent)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.25rem",
    fontWeight: "bold",
  },
  title: {
    fontSize: "1.75rem",
    fontWeight: "700",
    color: "var(--color-text)",
    letterSpacing: "-0.5px",
  },
  versionBadge: {
    backgroundColor: "var(--color-surface)",
    color: "var(--color-accent-light)",
    padding: "0.2rem 0.5rem",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.75rem",
    fontWeight: "600",
  },
  card: {
    backgroundColor: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    padding: "1.75rem",
    width: "100%",
    maxWidth: "460px",
  },
  cardTitle: {
    fontSize: "1.1rem",
    fontWeight: "600",
    color: "var(--color-text)",
    marginBottom: "0.5rem",
  },
  cardDescription: {
    fontSize: "0.875rem",
    color: "var(--color-text-muted)",
    lineHeight: "1.4",
    marginBottom: "1.5rem",
  },
  statusList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    marginBottom: "1.5rem",
  },
  statusRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.5rem 0",
    borderBottom: "1px solid rgba(43, 61, 50, 0.4)",
  },
  statusLabel: {
    fontSize: "0.875rem",
    color: "var(--color-text)",
  },
  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    fontSize: "0.75rem",
    fontWeight: "600",
    padding: "0.25rem 0.6rem",
    borderRadius: "var(--radius-sm)",
  },
  statusDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
  },
  uptimeText: {
    fontSize: "0.85rem",
    color: "var(--color-text-muted)",
    fontFamily: "monospace",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "1rem",
  },
  reconnectButton: {
    backgroundColor: "var(--color-accent)",
    color: "var(--color-bg)",
    border: "none",
    borderRadius: "var(--radius-md)",
    padding: "0.6rem 1.25rem",
    fontSize: "0.875rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  footer: {
    marginTop: "2rem",
    fontSize: "0.75rem",
    color: "var(--color-text-muted)",
  },
};
