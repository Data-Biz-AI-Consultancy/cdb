import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SignalCatalogTab } from './SignalCatalogTab';
import { SignalDefinition } from '../types';

const mockCatalog: SignalDefinition[] = [
  {
    id: 'dormant_strategic_accounts',
    name: 'Dormant Strategic Accounts',
    category: 'risk',
    target_entity: 'company',
    severity: 'high',
    detection_mechanism: 'temporal_cadence',
    business_interpretation: 'Identifies high-value or strategic client accounts with no logged interactions.',
    parameters: { cadence_days: 90 },
    recommended_action: {
      playbook: 'executive_reengagement',
      title: 'Strategic Re-Engagement Outreach',
    },
    icon: '🏢',
    is_active: true,
  },
  {
    id: 'expansion_opportunity',
    name: 'Expansion Opportunity',
    category: 'opportunity',
    target_entity: 'company',
    severity: 'critical',
    detection_mechanism: 'growth_signals',
    business_interpretation: 'Identifies rapid headcount or project scope growth.',
    parameters: {},
    recommended_action: {
      playbook: 'upsell',
      title: 'Commercial Expansion Pitch',
    },
    icon: '🚀',
    is_active: true,
  },
];

describe('SignalCatalogTab component', () => {
  it('renders all catalog signal definition cards with details', () => {
    render(<SignalCatalogTab catalog={mockCatalog} />);

    expect(screen.getByText('Dormant Strategic Accounts')).toBeInTheDocument();
    expect(screen.getByText('Expansion Opportunity')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    expect(screen.getByText(/Identifies high-value or strategic/i)).toBeInTheDocument();
  });
});
