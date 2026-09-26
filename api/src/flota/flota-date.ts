export const FLOTA_TIME_ZONE = 'America/Mexico_City';

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function partesEnZona(fecha: Date): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: FLOTA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(fecha);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function fechaISO({ year, month, day }: Pick<ZonedParts, 'year' | 'month' | 'day'>) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function medianocheUTC(fecha: string): Date {
  const [year, month, day] = fecha.split('-').map(Number);
  const medianocheLocalComoUTC = Date.UTC(year, month - 1, day);
  let timestamp = medianocheLocalComoUTC;

  // Corrige la hora de referencia con el offset real de la zona para esa fecha.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const zoned = partesEnZona(new Date(timestamp));
    const horaLocalComoUTC = Date.UTC(
      zoned.year,
      zoned.month - 1,
      zoned.day,
      zoned.hour,
      zoned.minute,
      zoned.second,
    );
    timestamp += medianocheLocalComoUTC - horaLocalComoUTC;
  }

  return new Date(timestamp);
}

export function rangoDeHoyFlota(now = new Date()) {
  const today = partesEnZona(now);
  const fecha = fechaISO(today);
  const nextDay = new Date(Date.UTC(today.year, today.month - 1, today.day + 1));
  const hastaFecha = fechaISO({
    year: nextDay.getUTCFullYear(),
    month: nextDay.getUTCMonth() + 1,
    day: nextDay.getUTCDate(),
  });

  return {
    fecha,
    desde: medianocheUTC(fecha),
    hasta: medianocheUTC(hastaFecha),
  };
}
