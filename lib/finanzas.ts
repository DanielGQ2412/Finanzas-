/** Acceso a datos del espacio Personal: espacios, carpetas y movimientos. */
import { rangoMes, type Mes } from './formato';
import { supabase } from './supabase';

export type Prioridad = 'alta' | 'media' | 'baja';

export type TipoCarpeta =
  | 'fijo' | 'variable' | 'ahorro' | 'inversion' | 'emergencia'
  | 'planilla' | 'proveedor' | 'imprevisto' | 'reinversion' | 'ingreso';

export type TipoMovimiento =
  | 'ingreso' | 'gasto' | 'ahorro' | 'inversion'
  | 'reinversion' | 'transferencia' | 'reembolso';

export type Carpeta = {
  id: string;
  nombre: string;
  tipo: TipoCarpeta;
  prioridad: Prioridad;
  presupuesto_mensual: number | null;
  orden: number;
};

export type Movimiento = {
  id: string;
  carpeta_id: string | null;
  tipo: TipoMovimiento;
  monto: number;
  fecha: string;
  descripcion: string | null;
  prioridad: Prioridad | null;
  pagado: boolean;
  creado_en: string;
};

/** Tipos de carpeta que se muestran como categoría en cada pestaña de "Agregar". */
export const CARPETAS_POR_PESTANA: Record<'gasto' | 'ingreso' | 'ahorro', TipoCarpeta[]> = {
  gasto: ['fijo', 'variable', 'imprevisto'],
  ingreso: ['ingreso'],
  ahorro: ['ahorro', 'emergencia', 'inversion'],
};

/** Convierte un error de Supabase/red en un mensaje para mostrar en pantalla. */
export function mensajeError(err: { message?: string; code?: string } | null | undefined, accion: string): string {
  const m = (err?.message ?? '').toLowerCase();
  if (m.includes('network') || m.includes('fetch')) return `No hay conexión. Revisá tu internet e intentá ${accion} de nuevo.`;
  if (err?.code === '42501' || m.includes('row-level security')) return `No tenés permiso para ${accion}.`;
  if (m.includes('jwt') || m.includes('token')) return 'Tu sesión venció. Cerrá sesión y volvé a entrar.';
  return `No se pudo ${accion}. Intentá de nuevo.`;
}

/** Id del espacio Personal del usuario (o null si no existe). */
export async function obtenerEspacioPersonal(usuarioId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('espacios')
    .select('id')
    .eq('tipo', 'personal')
    .eq('creado_por', usuarioId)
    .maybeSingle();
  if (error) throw error;
  return (data?.id as string | undefined) ?? null;
}

export async function obtenerCarpetas(espacioId: string): Promise<Carpeta[]> {
  const { data, error } = await supabase
    .from('carpetas')
    .select(COLUMNAS_CARPETA)
    .eq('espacio_id', espacioId)
    .eq('archivada', false)
    .is('padre_id', null)
    .order('orden')
    .order('nombre');
  if (error) throw error;
  return (data ?? []).map(normalizarCarpeta);
}

const COLUMNAS_CARPETA = 'id, nombre, tipo, prioridad, presupuesto_mensual, orden';

function normalizarCarpeta(c: Record<string, unknown>): Carpeta {
  return {
    ...c,
    presupuesto_mensual: c.presupuesto_mensual == null ? null : Number(c.presupuesto_mensual),
  } as Carpeta;
}

export async function obtenerCarpeta(id: string): Promise<Carpeta | null> {
  const { data, error } = await supabase.from('carpetas').select(COLUMNAS_CARPETA).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? normalizarCarpeta(data) : null;
}

/** null = sin límite. */
export async function guardarPresupuesto(carpetaId: string, presupuesto: number | null): Promise<void> {
  const { data, error } = await supabase
    .from('carpetas')
    .update({ presupuesto_mensual: presupuesto })
    .eq('id', carpetaId)
    .select('id');
  if (error) throw error;
  // Con RLS, un update no permitido no da error: simplemente actualiza 0 filas.
  if (!data || data.length === 0) throw { message: 'row-level security: nada actualizado', code: '42501' };
}

export async function obtenerMovimientosMes(
  espacioId: string,
  mes: Mes,
  carpetaId?: string,
): Promise<Movimiento[]> {
  const { desde, hasta } = rangoMes(mes);
  let consulta = supabase
    .from('movimientos')
    .select('id, carpeta_id, tipo, monto, fecha, descripcion, prioridad, pagado, creado_en')
    .eq('espacio_id', espacioId);
  if (carpetaId) consulta = consulta.eq('carpeta_id', carpetaId);
  const { data, error } = await consulta
    .gte('fecha', desde)
    .lt('fecha', hasta)
    .order('fecha', { ascending: false })
    .order('creado_en', { ascending: false });
  if (error) throw error;
  // numeric llega como string desde PostgREST.
  return (data ?? []).map((m) => ({ ...m, monto: Number(m.monto) })) as Movimiento[];
}

export type NuevoMovimiento = {
  espacio_id: string;
  carpeta_id: string | null;
  tipo: 'gasto' | 'ingreso' | 'ahorro';
  monto: number;
  fecha: string;
  prioridad: Prioridad;
  descripcion: string | null;
};

export async function crearMovimiento(m: NuevoMovimiento): Promise<void> {
  // origen queda NULL (solo aplica a negocios); pagado usa su default true.
  const { error } = await supabase.from('movimientos').insert(m);
  if (error) throw error;
}

/** Totales del mes (solo movimientos pagados). Ignora 'reinversion' (solo negocios). */
export function resumenMes(movs: Movimiento[]) {
  let ingresos = 0, gastos = 0, ahorros = 0, inversiones = 0;
  for (const m of movs) {
    if (!m.pagado) continue;
    if (m.tipo === 'ingreso') ingresos += m.monto;
    else if (m.tipo === 'gasto') gastos += m.monto;
    else if (m.tipo === 'ahorro') ahorros += m.monto;
    else if (m.tipo === 'inversion') inversiones += m.monto;
  }
  return { ingresos, gastos, ahorros, inversiones, disponible: ingresos - gastos - ahorros - inversiones };
}

/** Suma por carpeta de lo que salió en el mes (gastos, ahorros, inversiones). */
export function totalesPorCarpeta(movs: Movimiento[]): Map<string, number> {
  const totales = new Map<string, number>();
  for (const m of movs) {
    if (!m.pagado || !m.carpeta_id) continue;
    if (m.tipo !== 'gasto' && m.tipo !== 'ahorro' && m.tipo !== 'inversion') continue;
    totales.set(m.carpeta_id, (totales.get(m.carpeta_id) ?? 0) + m.monto);
  }
  return totales;
}
