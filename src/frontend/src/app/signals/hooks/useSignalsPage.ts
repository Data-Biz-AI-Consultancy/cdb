'use client';

import { useSignalsData } from './useSignalsData';
import { useSignalsFilter } from './useSignalsFilter';
import { useSignalActionModal } from './useSignalActionModal';

export function useSignalsPage() {
  const data = useSignalsData();
  const filter = useSignalsFilter(data.catalog, data.signals);
  const modal = useSignalActionModal(data.setSignals, data.setActionInProgress);

  const handleBulkAction = (
    action: 'snoozed' | 'resolved' | 'dismissed' | 'acknowledged' | 'acknowledge' | 'resolve' | 'dismiss'
  ) => {
    return data.handleBulkAction(filter.selectedSignalIds, filter.setSelectedSignalIds, action);
  };

  return {
    ...data,
    ...filter,
    ...modal,
    handleBulkAction,
  };
}

export { useSignalsData, useSignalsFilter, useSignalActionModal };
