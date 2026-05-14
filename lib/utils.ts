// Shared utility functions

/** Formatea un numero a pesos chilenos: 15000 → "$15.000" */
export function formatCLP(n: number): string {
  return `$${Number(n).toLocaleString('es-CL')}`
}
