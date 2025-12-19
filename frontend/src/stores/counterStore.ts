import { create } from 'zustand';

interface CounterSettings {
  hapticEnabled: boolean;
  soundEnabled: boolean;
  voiceEnabled: boolean;
}

interface CounterState {
  // Current active section
  activeSectionId: string | null;
  currentRow: number;
  totalRows: number | null;
  
  // Current instruction
  currentInstruction: string | null;
  nextInstruction: string | null;
  
  // Measurement tracking
  needsMeasurement: boolean;
  measurementReminder: string | null;
  
  // Settings
  settings: CounterSettings;
  
  // Actions
  setActiveSection: (sectionId: string) => void;
  setCurrentRow: (row: number) => void;
  setTotalRows: (total: number | null) => void;
  setInstructions: (current: string | null, next: string | null) => void;
  setMeasurementReminder: (needs: boolean, message: string | null) => void;
  updateSettings: (settings: Partial<CounterSettings>) => void;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

export const useCounterStore = create<CounterState>((set, get) => ({
  activeSectionId: null,
  currentRow: 0,
  totalRows: null,
  currentInstruction: null,
  nextInstruction: null,
  needsMeasurement: false,
  measurementReminder: null,
  settings: {
    hapticEnabled: true,
    soundEnabled: true,
    voiceEnabled: false,
  },

  setActiveSection: (sectionId) => set({ activeSectionId: sectionId }),
  
  setCurrentRow: (row) => set({ currentRow: row }),
  
  setTotalRows: (total) => set({ totalRows: total }),
  
  setInstructions: (current, next) =>
    set({ currentInstruction: current, nextInstruction: next }),
  
  setMeasurementReminder: (needs, message) =>
    set({ needsMeasurement: needs, measurementReminder: message }),
  
  updateSettings: (newSettings) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    })),

  increment: () => {
    const { currentRow, totalRows, settings } = get();
    const newRow = currentRow + 1;
    
    // Haptic feedback
    if (settings.hapticEnabled && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
    
    // Don't exceed total if set
    if (totalRows !== null && newRow > totalRows) {
      return;
    }
    
    set({ currentRow: newRow });
  },

  decrement: () => {
    const { currentRow, settings } = get();
    if (currentRow <= 0) return;
    
    if (settings.hapticEnabled && 'vibrate' in navigator) {
      navigator.vibrate([5, 5, 5]);
    }
    
    set({ currentRow: currentRow - 1 });
  },

  reset: () => set({ currentRow: 0 }),
}));


