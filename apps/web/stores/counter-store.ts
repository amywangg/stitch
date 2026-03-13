import { create } from 'zustand'

interface CounterState {
  rows: Record<string, number> // sectionId → currentRow
  setRow: (sectionId: string, row: number) => void
  increment: (sectionId: string) => void
  decrement: (sectionId: string) => void
}

export const useCounterStore = create<CounterState>((set) => ({
  rows: {},
  setRow: (sectionId, row) =>
    set((state) => ({ rows: { ...state.rows, [sectionId]: row } })),
  increment: (sectionId) =>
    set((state) => ({
      rows: { ...state.rows, [sectionId]: (state.rows[sectionId] ?? 0) + 1 },
    })),
  decrement: (sectionId) =>
    set((state) => ({
      rows: {
        ...state.rows,
        [sectionId]: Math.max(0, (state.rows[sectionId] ?? 0) - 1),
      },
    })),
}))

export const useRowForSection = (sectionId: string) =>
  useCounterStore((s) => s.rows[sectionId] ?? 0)
