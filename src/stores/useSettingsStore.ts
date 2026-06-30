import { create } from 'zustand';

export interface AccountabilityContact {
  name: string;
  email: string;
}

interface SettingsState {
  defaultAvailableHours: number;
  accountabilityContacts: AccountabilityContact[];
  notificationsEnabled: boolean;
  loading: boolean;
  setDefaultAvailableHours: (hours: number) => void;
  setAccountabilityContacts: (contacts: AccountabilityContact[]) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setLoading: (loading: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  defaultAvailableHours: 8,
  accountabilityContacts: [],
  notificationsEnabled: true,
  loading: false,
  setDefaultAvailableHours: (defaultAvailableHours) => set({ defaultAvailableHours }),
  setAccountabilityContacts: (accountabilityContacts) => set({ accountabilityContacts }),
  setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
  setLoading: (loading) => set({ loading }),
}));
