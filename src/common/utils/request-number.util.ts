export function generateRequestNumber(): string {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0');
  return `REQ-${year}-${seq}`;
}