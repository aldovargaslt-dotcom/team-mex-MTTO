import type { HealthStatus } from './types';

export type HealthSemantic = {
  key: 'excellent' | 'good' | 'attention' | 'poor' | 'critical';
  fg: string;
  bg: string;
};

const MAP: Record<HealthStatus, HealthSemantic> = {
  EXCELLENT: {
    key: 'excellent',
    fg: 'var(--health-excellent)',
    bg: 'var(--health-excellent-bg)',
  },
  GOOD: {
    key: 'good',
    fg: 'var(--health-good)',
    bg: 'var(--health-good-bg)',
  },
  ATTENTION: {
    key: 'attention',
    fg: 'var(--health-attention)',
    bg: 'var(--health-attention-bg)',
  },
  POOR: {
    key: 'poor',
    fg: 'var(--health-poor)',
    bg: 'var(--health-poor-bg)',
  },
  CRITICAL: {
    key: 'critical',
    fg: 'var(--health-critical)',
    bg: 'var(--health-critical-bg)',
  },
};

export function getHealthSemantic(status: HealthStatus): HealthSemantic {
  return MAP[status];
}
