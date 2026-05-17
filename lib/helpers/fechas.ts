export function calcularProximoMartes(desde: Date = new Date()): Date {
  const d = new Date(desde)
  const dia = d.getDay() // 0=dom, 1=lun, 2=mar, 3=mie, 4=jue, 5=vie, 6=sab
  // Si ya es martes, el "próximo" martes es en 7 días
  const diasHasta = dia === 2 ? 7 : (2 - dia + 7) % 7
  d.setDate(d.getDate() + diasHasta)
  d.setHours(0, 0, 0, 0)
  return d
}

export function fechaToISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function esDiaMartes(fecha: Date | string): boolean {
  const d = typeof fecha === "string" ? new Date(`${fecha}T12:00:00`) : fecha
  return d.getDay() === 2
}

export function calcularFechaEstimadaEntrega(
  fechaDespacho: string,
  diasHabiles = 3
): string {
  const [y, m, day] = fechaDespacho.split("-").map(Number)
  const d = new Date(y, m - 1, day)
  let agregados = 0
  while (agregados < diasHabiles) {
    d.setDate(d.getDate() + 1)
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) agregados++
  }
  return fechaToISODate(d)
}

export function generarNombreGrupo(fechaDespacho: string): string {
  return `Despacho martes ${fechaDespacho}`
}

export function formatearFechaCL(isoDate: string): string {
  const [y, m, day] = isoDate.split("-").map(Number)
  const d = new Date(y, m - 1, day)
  return d.toLocaleDateString("es-CL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}
