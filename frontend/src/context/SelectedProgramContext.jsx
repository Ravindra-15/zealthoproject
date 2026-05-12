/**
 * ============================================
 * ADMIN MODULE — Selected Program Context
 * ============================================
 * Globally tracks which program admin is currently viewing.
 * Persisted to localStorage so refresh keeps the selection.
 *
 * Used by:
 *  - AdminSidebar (program dropdown)
 *  - Dashboard (filters stats by program)
 *  - FinancialReports (filters revenue by program)
 *  - Future: Enquiries, Appointments, etc.
 * ============================================
 */

import React, { createContext, useContext, useEffect, useState } from "react";

// 🏢 Available programs (matches backend enum)
export const AVAILABLE_PROGRAMS = [
  { id: "zealtho", label: "Zealtho", color: "bg-indigo-500" },
  { id: "yogat20", label: "Yoga T20", color: "bg-orange-500" },
  { id: "diabmukt", label: "Diabmukt", color: "bg-blue-500" },
  { id: "mommyfit", label: "MommyFit", color: "bg-pink-500" },
  { id: "slimfitter", label: "Slimfitter", color: "bg-purple-500" },
];

const STORAGE_KEY = "adminSelectedProgram";
const DEFAULT_PROGRAM_ID = "zealtho";

const SelectedProgramContext = createContext(null);

export const SelectedProgramProvider = ({ children }) => {
  // 📥 Load previously selected program from localStorage (if any)
  const [selectedProgramId, setSelectedProgramId] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && AVAILABLE_PROGRAMS.some((p) => p.id === stored)) {
        return stored;
      }
    } catch {
      // localStorage unavailable — fall through to default
    }
    return DEFAULT_PROGRAM_ID;
  });

  // 💾 Persist selection whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, selectedProgramId);
    } catch {
      // Storage quota / disabled — silently skip
    }
  }, [selectedProgramId]);

  // 🔄 Helper: change selected program
  const selectProgram = (programId) => {
    if (AVAILABLE_PROGRAMS.some((p) => p.id === programId)) {
      setSelectedProgramId(programId);
    }
  };

  // 🔎 Derived value: full program object for the selected ID
  const selectedProgram =
    AVAILABLE_PROGRAMS.find((p) => p.id === selectedProgramId) ||
    AVAILABLE_PROGRAMS[0];

  return (
    <SelectedProgramContext.Provider
      value={{
        selectedProgramId,
        selectedProgram,
        selectProgram,
        availablePrograms: AVAILABLE_PROGRAMS,
      }}
    >
      {children}
    </SelectedProgramContext.Provider>
  );
};

/**
 * 🪝 Hook: read selected program from anywhere
 *
 * Usage:
 *   const { selectedProgramId, selectProgram } = useSelectedProgram();
 */
export const useSelectedProgram = () => {
  const ctx = useContext(SelectedProgramContext);
  if (!ctx) {
    throw new Error(
      "useSelectedProgram must be used within SelectedProgramProvider"
    );
  }
  return ctx;
};