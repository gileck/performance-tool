export function formatTime(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatBytes(bytes: number): string {
  const kb = bytes / 1024;
  const mb = bytes / (1024 * 1024);
  const kbStr = `${kb.toFixed(1)} KB`;
  if (kb > 1000) {
    return `${kbStr} (${mb.toFixed(2)} MB)`;
  }
  return kbStr;
}

export function formatEventName(name: string): string {
  if (name.length > 80) return name.substring(0, 77) + '...';
  return name;
}

