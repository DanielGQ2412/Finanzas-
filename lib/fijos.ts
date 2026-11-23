/** Gastos fijos: plantillas en pagos_fijos + movimientos que marcan cada mes como pagado. */
import type { Prioridad } from './finanzas';
import { fechaISO, mesActual, rangoMes, type Mes } from './formato';
import { supabase } from './supabase';

export type PagoFijo = {
  id: string;
  carpeta_id: string | null;
  nombre: string;
  monto: number;
  dia_pago: number | null;
  prioridad: Prioridad;
  activo: boolean;
};

/** Pago del mes: movimiento que marca un pago fijo como pagado. */
export type PagoDelMes = { id: string; pago_fijo_id: string; monto: number; fecha: string };

const COLUMNAS = 'id, carpeta_id, nombre, monto, dia_pago, prioridad, activo';

function normalizar(p: Record<string, unknown>): PagoFijo {
  return {
    ...p,
    monto: Number(p.monto),
    dia_pago: p.dia_pago == null ? null : Number(p.dia_pago),
    prioridad: (p.prioridad as Prioridad | null) ?? 'media',
  } as PagoFijo;
}

export async function obtenerPagosFijos(espacioId: string): Promise<PagoFijo[]> {
  const { data, error } = await supabase
    .from('pagos_fijos')
    .select(COLUMNAS)
    .eq('espacio_id', espacioId)
    .order('dia_pago', { ascending: true, nullsFirst: false })
    .order('nombre');
  if (error) throw error;
  return (data ?? []).map(normalizar);
}

export async function obtenerPagoFijo(id: string): Promise<PagoFijo | null> {
  const { data, error } = await supabase.from('pagos_fijos').select(COLUMNAS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? normalizar(data) : null;
}

/** Movimientos que cuentan como "pagado" en el mes: tipo gasto, pagado = true, con pago_fijo_id. */
export async function obtenerPagosDelMes(espacioId: string, mes: Mes): Promise<Map<string, PagoDelMes>> {
  const { desde, hasta } = rangoMes(mes);
  const { data, error } = await supabase
    .from('movimientos')
    .select('id, pago_fijo_id, monto, fecha')
    .eq('espacio_id', espacioId)
    .eq('tipo', 'gasto')
    .eq('pagado', true)
    .not('pago_fijo_id', 'is', null)
    .gte('fecha', desde)
    .lt('fecha', hasta);
  if (error) throw error;
  const mapa = new Map<string, PagoDelMes>();
  for (const m of data ?? []) {
    const pagoId = m.pago_fijo_id as string;
    const previo = mapa.get(pagoId);
    // Si por algún motivo hubiera dos, se suman para que el total cuadre con el disponible.
    mapa.set(pagoId, {
      id: m.id as string,
      pago_fijo_id: pagoId,
      monto: (previo?.monto ?? 0) + Number(m.monto),
      fecha: m.fecha as string,
    });
  }
  return mapa;
}

/** Fecha del movimiento: hoy si es el mes actual; si no, el día de pago dentro del mes visto. */
function fechaParaMes(mes: Mes, diaPago: number | null): string {
  const actual = mesActual();
  if (actual.anio === mes.anio && actual.mes === mes.mes) return fechaISO(new Date());
  const ultimoDia = new Date(mes.anio, mes.mes + 1, 0).getDate();
  const dia = Math.min(Math.max(diaPago ?? 1, 1), ultimoDia);
  return fechaISO(new Date(mes.anio, mes.mes, dia));
}

export async function marcarPagado(pago: PagoFijo, espacioId: string, mes: Mes): Promise<void> {
  const { desde, hasta } = rangoMes(mes);
  // Evitar duplicados: ¿ya existe un pago para este mes?
  const { data: existente, error: errBusca } = await supabase
    .from('movimientos')
    .select('id')
    .eq('pago_fijo_id', pago.id)
    .eq('tipo', 'gasto')
    .eq('pagado', true)
    .gte('fecha', desde)
    .lt('fecha', hasta)
    .limit(1);
  if (errBusca) throw errBusca;
  if (existente && existente.length > 0) return;

  const { error } = await supabase.from('movimientos').insert({
    espacio_id: espacioId,
    carpeta_id: pago.carpeta_id,
    pago_fijo_id: pago.id,
    tipo: 'gasto',
    monto: pago.monto,
    fecha: fechaParaMes(mes, pago.dia_pago),
    prioridad: pago.prioridad,
    descripcion: pago.nombre,
  });
  if (error) throw error;
}

export async function desmarcarPagado(pagoId: string, mes: Mes): Promise<void> {
  const { desde, hasta } = rangoMes(mes);
  const { data, error } = await supabase
    .from('movimientos')
    .delete()
    .eq('pago_fijo_id', pagoId)
    .eq('tipo', 'gasto')
    .eq('pagado', true)
    .gte('fecha', desde)
    .lt('fecha', hasta)
    .select('id');
  if (error) throw error;
  // Con RLS, un borrado no permitido no da error: simplemente borra 0 filas.
  if (!data || data.length === 0) throw { message: 'row-level security: nada borrado', code: '42501' };
}

export type DatosPagoFijo = {
  carpeta_id: string;
  nombre: string;
  monto: number;
  dia_pago: number;
  prioridad: Prioridad;
};

export async function crearPagoFijo(espacioId: string, datos: DatosPagoFijo): Promise<void> {
  const { error } = await supabase.from('pagos_fijos').insert({ espacio_id: espacioId, activo: true, ...datos });
  if (error) throw error;
}

export async function actualizarPagoFijo(id: string, datos: Partial<DatosPagoFijo> & { activo?: boolean }): Promise<void> {
  const { data, error } = await supabase.from('pagos_fijos').update(datos).eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw { message: 'row-level security: nada actualizado', code: '42501' };
}

export async function crearCarpetaFija(
  espacioId: string,
  nombre: string,
  prioridad: Prioridad,
  orden: number,
): Promise<void> {
  const { error } = await supabase
    .from('carpetas')
    .insert({ espacio_id: espacioId, nombre, tipo: 'fijo', prioridad, orden });
  if (error) throw error;
}
