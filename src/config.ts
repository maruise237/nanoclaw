import { execSync } from 'child_process';
import os from 'os';
import path from 'path';

import { readEnvFile } from './env.js';

// Read config values from .env (falls back to process.env).
// Secrets (API keys, tokens) are NOT read here — they are loaded only
// by the credential proxy (credential-proxy.ts), never exposed to containers.
const envConfig = readEnvFile(['ASSISTANT_NAME', 'ASSISTANT_HAS_OWN_NUMBER']);

export const ASSISTANT_NAME =
  process.env.ASSISTANT_NAME || envConfig.ASSISTANT_NAME || 'Andy';
export const ASSISTANT_HAS_OWN_NUMBER =
  (process.env.ASSISTANT_HAS_OWN_NUMBER ||
    envConfig.ASSISTANT_HAS_OWN_NUMBER) === 'true';
export const POLL_INTERVAL = 2000;
export const SCHEDULER_POLL_INTERVAL = 60000;

// Absolute paths needed for container mounts
const PROJECT_ROOT = process.cwd();

function detectHostProjectPath(): string {
  if (process.env.HOST_PROJECT_PATH) return process.env.HOST_PROJECT_PATH;

  // Try to auto-detect if running inside a container with access to Docker socket
  // (Standard for Docker-out-of-Docker setups like Dokploy/Portainer)
  try {
    const hostname = os.hostname();
    const output = execSync(
      `docker inspect ${hostname} --format '{{ range .Mounts }}{{ if eq .Destination "/app" }}{{ .Source }}{{ end }}{{ end }}'`,
      { stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf8', timeout: 5000 },
    ).trim();
    if (output && path.isAbsolute(output)) {
      return output;
    }
  } catch {
    // Ignore errors, fallback to local path
  }

  return process.cwd();
}

export const HOST_PROJECT_PATH = detectHostProjectPath();

const HOME_DIR = process.env.HOME || os.homedir();

// Mount security: allowlist stored OUTSIDE project root, never mounted into containers
export const MOUNT_ALLOWLIST_PATH = path.join(
  HOME_DIR,
  '.config',
  'nanoclaw',
  'mount-allowlist.json',
);
export const SENDER_ALLOWLIST_PATH = path.join(
  HOME_DIR,
  '.config',
  'nanoclaw',
  'sender-allowlist.json',
);
export const STORE_DIR = path.resolve(PROJECT_ROOT, 'store');
export const GROUPS_DIR = path.resolve(PROJECT_ROOT, 'groups');
export const DATA_DIR = path.resolve(PROJECT_ROOT, 'data');

export const CONTAINER_IMAGE =
  process.env.CONTAINER_IMAGE || 'nanoclaw-agent:latest';
export const CONTAINER_TIMEOUT = parseInt(
  process.env.CONTAINER_TIMEOUT || '1800000',
  10,
);
export const CONTAINER_MAX_OUTPUT_SIZE = parseInt(
  process.env.CONTAINER_MAX_OUTPUT_SIZE || '10485760',
  10,
); // 10MB default
export const CREDENTIAL_PROXY_PORT = parseInt(
  process.env.CREDENTIAL_PROXY_PORT || '3001',
  10,
);
export const IPC_POLL_INTERVAL = 1000;
export const IDLE_TIMEOUT = parseInt(process.env.IDLE_TIMEOUT || '1800000', 10); // 30min default — how long to keep container alive after last result
export const MAX_CONCURRENT_CONTAINERS = Math.max(
  1,
  parseInt(process.env.MAX_CONCURRENT_CONTAINERS || '5', 10) || 5,
);

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const TRIGGER_PATTERN = new RegExp(
  `^@${escapeRegex(ASSISTANT_NAME)}\\b`,
  'i',
);

// Timezone for scheduled tasks (cron expressions, etc.)
// Uses system timezone by default
export const TIMEZONE =
  process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Translates a local path (inside this orchestrator container) to a path
 * on the host machine. Used for volume mounts when running Docker-out-of-Docker.
 */
export function toHostPath(localPath: string): string {
  if (HOST_PROJECT_PATH === PROJECT_ROOT) return localPath;

  // Only translate paths that are within the project root.
  // External paths (like /var/run/docker.sock or /dev/null) should be left alone.
  if (!localPath.startsWith(PROJECT_ROOT)) return localPath;

  const relative = path.relative(PROJECT_ROOT, localPath);
  return path.join(HOST_PROJECT_PATH, relative);
}
