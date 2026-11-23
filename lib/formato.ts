/** Utilidades de formato: colones y fechas en español. */

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** Separa miles con punto: 12500 → "12.500". */
function miles(entero: number): string {
  return String(entero).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Formato de colones: 12500 → "₡12.500"; 12500.5 → "₡12.500,50"; -300 → "-₡300".
 * No depende de Intl para que se vea igual en iOS, Android y web.
 */
export function colones(monto: number): string {
  const signo = monto < 0 ? '-' : '';
  const abs = Math.abs(Math.round(monto * 100)) / 100;
  const entero = Math.floor(abs);
  const centimos = Math.round((abs - entero) * 100);
  const dec = centimos > 0 ? ',' + String(centimos).padStart(2, '0') : '';
  return `${signo}₡${miles(entero)}${dec}`;
}

/** Solo los dígitos de un texto, como número entero (para el campo de monto). */
export function leerMonto(texto: string): number {
  const digitos = texto.replace(/\D/g, '').slice(0, 12);
  return digitos ? Number(digitos) : 0;
}

/** Mes de trabajo: año y mes (0 = enero). */
export type Mes = { anio: number; mes: number };

export function mesActual(): Mes {
  const hoy = new Date();
  return { anio: hoy.getFullYear(), mes: hoy.getMonth() };
}

export function moverMes({ anio, mes }: Mes, delta: number): Mes {
  const d = new Date(anio, mes + delta, 1);
  return { anio: d.getFullYear(), mes: d.getMonth() };
}

export function nombreMes({ anio, mes }: Mes): string {
  return `${MESES[mes]} ${anio}`;
}

/** Rango [desde, hasta) del mes en formato "AAAA-MM-DD" para filtrar en Supabase. */
export function rangoMes(m: Mes): { desde: string; hasta: string } {
  return { desde: fechaISO(new Date(m.anio, m.mes, 1)), hasta: fechaISO(new Date(m.anio, m.mes + 1, 1)) };
}

/** Fecha local → "AAAA-MM-DD" (sin pasar por UTC, para no correr el día). */
export function fechaISO(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** "AAAA-MM-DD" → Date local a medianoche. */
export function desdeISO(iso: string): Date {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export function sumarDias(d: Date, dias: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + dias);
}

/** "Hoy", "Ayer", o "lun 23 nov 2026". */
export function fechaLarga(d: Date): string {
  const hoy = new Date();
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const dif = Math.round((d.getTime() - base.getTime()) / 86_400_000);
  if (dif === 0) return 'Hoy';
  if (dif === -1) return 'Ayer';
  if (dif === 1) return 'Mañana';
  return `${DIAS_CORTOS[d.getDay()]} ${d.getDate()} ${MESES_CORTOS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "AAAA-MM-DD" → "23 nov". */
export function fechaCorta(iso: string): string {
  const d = desdeISO(iso);
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`;
}
