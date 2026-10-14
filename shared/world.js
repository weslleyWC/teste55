export const bounds = { minX: -7.3, maxX: 15, minZ: -105, maxZ: 65 };
export function blocked(x, z) {
  for (const kz of [-17, -65]) if (Math.abs(x - 1.8) < 2.15 && Math.abs(z - kz) < 1.9) return true;
  for (let bz = -93; bz < 80; bz += 23) if (Math.abs(x + 6.7) < .85 && Math.abs(z - bz - 3) < 1.4) return true;
  return false;
}
export const gestures = ['wave', 'dance', 'clap'];
