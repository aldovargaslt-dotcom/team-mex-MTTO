import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

/** EWO-067: POST /unidades requires an existing sucursal (facility). */
export const TEST_SUCURSAL = 'test-sucursal';

export async function ensureTestSucursal(app: INestApplication) {
  await app.get(DataSource).query(
    `INSERT INTO facilities(id,name,timezone,version)
     VALUES ($1,'Sucursal de prueba','America/Mexico_City',1)
     ON CONFLICT (id) DO NOTHING`,
    [TEST_SUCURSAL],
  );
}
