import { isUUID } from 'class-validator';
import { MaterialCommand } from './materials-model';

/** Validate nested opaque IDs before sending any values to PostgreSQL. */
export function validateMaterialsCommand(command: MaterialCommand) {
  if (!command || typeof command !== 'object') throw new Error('Comando inválido.');
  if ('reason' in command && typeof command.reason !== 'string') throw new Error('El motivo debe ser texto.');
  const types = ['USE', 'PURCHASE', 'DESTINATION', 'CORRECT_USE', 'COMPLETE_COST', 'VALUE_STOCK', 'CORRECT_PRICE', 'SETTLEMENT', 'REPLACEMENT_RECEIPT'];
  if (!types.includes(command.type)) throw new Error('Comando de materiales inválido.');
  const uuid = (value: unknown) => { if (typeof value !== 'string' || !isUUID(value, '4')) throw new Error('La referencia de inventario no es válida.'); };
  if ('itemId' in command) uuid(command.itemId);
  if (command.type === 'PURCHASE') {
    if (!Array.isArray(command.lines) || !command.lines.length || command.lines.length > 50) throw new Error('Añade entre una y 50 líneas.');
    for (const line of command.lines) {
      if (!line || typeof line !== 'object') throw new Error('La línea de compra no es válida.');
      uuid(line.itemId);
    }
  }
  if ((command.type === 'DESTINATION' || command.type === 'CORRECT_PRICE')) { uuid(command.purchaseId); uuid(command.lineId); }
  if ('returnId' in command && (typeof command.returnId !== 'string' || command.returnId.length > 100)) throw new Error('La referencia de devolución no es válida.');
  if ('postingId' in command && (typeof command.postingId !== 'string' || command.postingId.length > 100)) throw new Error('La referencia de movimiento no es válida.');
}
