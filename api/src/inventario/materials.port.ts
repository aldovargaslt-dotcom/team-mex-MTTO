import { EntityManager } from 'typeorm';
import { CurrentUser } from '../auth/current-user';
import { MaterialCommand, MaterialState } from './materials-model';

export type MaterialsView = { revision: number; state: MaterialState; summary: { complete: boolean; materialsCost: string | null; knownMaterialsCost: string; lossCost: string | null; pendingDestinations: { qty: string }[] } };
export abstract class InventoryMaterialsPort {
  abstract read(visitaId: string, manager?: EntityManager): Promise<MaterialsView>;
  abstract command(manager: EntityManager, visitaId: string, key: string, revision: number, command: MaterialCommand, user: CurrentUser, closed?: boolean): Promise<MaterialsView>;
  abstract reconcile(visitaId: string): Promise<void>;
  abstract attachReceipt(manager: EntityManager, visitaId: string, purchaseId: string, dataUrl: string, user: CurrentUser): Promise<MaterialsView>;
  abstract receipt(visitaId: string, purchaseId: string): Promise<{ content: Buffer; mime: string }>;
  abstract prepareClose(manager: EntityManager, visitaId: string, eventId: string, legacy: { itemId: string; qty: number; origen: string }[]): Promise<void>;
  abstract hasPostings(manager: EntityManager, visitaId: string): Promise<boolean>;
}
