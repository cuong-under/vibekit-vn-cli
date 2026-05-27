export function maskLicenseKey(key) {
  if (!key || key.length < 12) return '***';
  return `${key.slice(0, 12)}...${key.slice(-4)}`;
}
