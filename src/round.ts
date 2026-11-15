export const board = {
  rows: ['AIPIL', 'CLLUT', 'ERSEI', 'NMOJR', 'ISAIS'],
  targets: ['TULIP', 'LILAC', 'ROSE', 'IRIS', 'JASMINE'],
  // A small sample for the test round. A full bonus dictionary can come later.
  bonus: ['AIR', 'ALL', 'ARE', 'ARM', 'ART', 'EAR', 'ERA', 'ILL', 'JAR', 'LIP', 'PILOT', 'RIM', 'SEA', 'SEAM', 'SEAR', 'SIR', 'SORE'],
};

export const size = board.rows.length;
export const letters = [...board.rows.join('')];

export function extendPath(path: readonly number[], tile: number): readonly number[] {
  if (tile < 0 || tile >= letters.length) return path;
  const last = path.at(-1);
  if (last === undefined) return [tile];
  if (tile === path.at(-2)) return path.slice(0, -1);

  const rowDistance = Math.abs(Math.floor(last / size) - Math.floor(tile / size));
  const columnDistance = Math.abs(last % size - tile % size);
  if (rowDistance > 1 || columnDistance > 1 || path.includes(tile)) return path;
  return [...path, tile];
}

export function readPath(path: readonly number[]): string {
  return path.map((tile) => letters[tile]).join('');
}
