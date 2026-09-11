import { Rol } from './roles.enum';

export interface CurrentUser {
  rol: Rol;
  userId: string | null;
}
