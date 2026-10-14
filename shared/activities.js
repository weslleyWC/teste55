export const party = { x: 7, z: -17, radius: 5, bpm: 100, title: 'Pôr do sol no quiosque' };
export const raceStart = { x: -3.5, z: 2, radius: 4 };
export const checkpoints = [
  { x: -3.5, z: -10, label: 'Calçadão' },
  { x: 7, z: -10, label: 'Pé na areia' },
  { x: 7, z: 2, label: 'Volta da praia' },
  { x: -3.5, z: 2, label: 'Chegada' },
];
export const near = (position, point, radius = point.radius) => Math.hypot(position.x - point.x, position.z - point.z) <= radius;
