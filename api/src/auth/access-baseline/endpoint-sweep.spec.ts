import * as fs from 'fs';
import * as path from 'path';
import { EndpointAccess, sweepEndpoints } from './endpoint-sweep';

const SRC = path.resolve(__dirname, '..', '..');
const FIXTURE = path.join(__dirname, 'endpoints.baseline.json');

describe('EWO-067 · línea base de acceso por endpoint (AC-P13)', () => {
  const current = sweepEndpoints(SRC);

  it('genera/actualiza la línea base solo con UPDATE_ACCESS_BASELINE=1', () => {
    if (process.env.UPDATE_ACCESS_BASELINE === '1') {
      fs.writeFileSync(FIXTURE, JSON.stringify(current, null, 2) + '\n');
    }
    expect(fs.existsSync(FIXTURE)).toBe(true);
  });

  it('el acceso efectivo de cada endpoint coincide con la línea base congelada', () => {
    const baseline = JSON.parse(
      fs.readFileSync(FIXTURE, 'utf8'),
    ) as EndpointAccess[];
    expect(current).toEqual(baseline);
  });

  it('encuentra controladores (el barrido no está vacío)', () => {
    expect(current.length).toBeGreaterThan(50);
  });
});
