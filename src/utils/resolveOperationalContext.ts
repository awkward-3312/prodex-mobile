import type { OperationalContext, OperationalEntity } from '../types/auth';

function findEntity<T extends OperationalEntity>(entities: T[] | undefined, id: string | number | null | undefined): T | null {
  if (id == null || String(id).trim() === '' || !Array.isArray(entities)) return null;
  return entities.find(entity => entity && entity.id != null && String(entity.id) === String(id)
    && typeof entity.name === 'string' && !!entity.name.trim()) ?? null;
}

/** Read-only display projection. Never chooses a replacement for an effective assignment. */
export function resolveOperationalContext(context: OperationalContext | null | undefined) {
  const branch = findEntity(context?.branches, context?.effective?.branch_id);
  const inventoryLocation = findEntity(context?.inventory_locations, context?.effective?.inventory_location_id);
  const cashDrawer = findEntity(context?.cash_drawers, context?.effective?.cash_drawer_id);
  return {
    branch, inventoryLocation, cashDrawer,
    readyForLocationPos: context?.ready_for_location_pos,
    label: [branch, inventoryLocation, cashDrawer].map(entity => entity?.name?.trim()).filter(Boolean).join(' · ')
      || 'Contexto operativo no disponible',
  };
}
