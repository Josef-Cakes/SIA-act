import { Activity, Droplets, Shield, Skull } from 'lucide-react';

export const QUICK_ACTIONS = [
  {
    type: 'MORTALITY',
    label: 'Mortality',
    description: 'Record animal loss and update stock counts.',
    Icon: Skull,
    iconClassName: 'text-veridian-rose',
    iconSurfaceClassName: 'bg-veridian-rose/15',
    buttonClassName: 'border-veridian-rose/30 hover:bg-veridian-rose/10',
  },
  {
    type: 'FEEDING',
    label: 'Feeding',
    description: 'Log a feeding activity for a selected batch.',
    Icon: Droplets,
    iconClassName: 'text-veridian-sky',
    iconSurfaceClassName: 'bg-veridian-sky/15',
    buttonClassName: 'border-veridian-sky/30 hover:bg-veridian-sky/10',
  },
  {
    type: 'VACCINATION',
    label: 'Vaccination',
    description: 'Track administered vaccines for the batch.',
    Icon: Shield,
    iconClassName: 'text-veridian-amber',
    iconSurfaceClassName: 'bg-veridian-amber/15',
    buttonClassName: 'border-veridian-amber/30 hover:bg-veridian-amber/10',
  },
  {
    type: 'HEALTH_CHECK',
    label: 'Health Check',
    description: 'Capture health inspections and observations.',
    Icon: Activity,
    iconClassName: 'text-veridian-emerald',
    iconSurfaceClassName: 'bg-veridian-emerald/15',
    buttonClassName: 'border-veridian-emerald/30 hover:bg-veridian-emerald/10',
  },
];

export function getActionConfig(actionType) {
  return QUICK_ACTIONS.find((action) => action.type === actionType) || QUICK_ACTIONS[0];
}

export function getActionSummary(log) {
  const batchLabel = log.batchName || `Batch #${log.batchId}`;

  switch (log.actionType) {
    case 'MORTALITY':
      return `Recorded ${log.quantity} mortality in ${batchLabel}.`;
    case 'FEEDING':
      return `Logged feeding activity for ${batchLabel}.`;
    case 'VACCINATION':
      return `Captured vaccination update for ${batchLabel}.`;
    case 'HEALTH_CHECK':
      return `Completed a health check for ${batchLabel}.`;
    default:
      return `Logged ${log.actionType} for ${batchLabel}.`;
  }
}
