import { createContext, useContext } from 'react';

export const ReminderContext = createContext(null);

export function useReminderActions() {
  const ctx = useContext(ReminderContext);
  if (!ctx) {
    throw new Error('useReminderActions must be used inside ReminderHost');
  }
  return ctx;
}
