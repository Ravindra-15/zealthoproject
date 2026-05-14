/**
 * ============================================
 * ADMIN MODULE — Habit Configurator Page
 * ============================================
 * Lists all habits/trackers for the currently selected program.
 * Admin can create, toggle visibility (on/off), edit, delete.
 *
 * Auto-blocks Zealtho (parent has no habits).
 * Pulls programId from SelectedProgramContext.
 *
 * Route: /admin/habits
 * Access: Super Admin only
 * ============================================
 */

import React, { useEffect, useState, useCallback } from "react";
import { Plus, Info } from "lucide-react";
import toast from "react-hot-toast";

import AdminPageHeader from "../../../components/admin/common/AdminPageHeader";
import { useSelectedProgram } from "../../../context/SelectedProgramContext";
import {
  listHabits,
  toggleHabit,
  deleteHabit,
} from "../../../services/adminHabitConfigService";

import HabitCard from "./components/HabitCard";
import AddHabitModal from "./components/AddHabitModal";

const HabitConfigurator = () => {
  const { selectedProgramId, selectedProgram } = useSelectedProgram();
  const isZealtho = selectedProgramId === "zealtho";

  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);

  // 📥 Load habits
  const loadHabits = useCallback(async () => {
    if (isZealtho) {
      setHabits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await listHabits(selectedProgramId);
      setHabits(data);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to load habits"
      );
      setHabits([]);
    } finally {
      setLoading(false);
    }
  }, [selectedProgramId, isZealtho]);

  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  // 🔄 Toggle isActive
  const handleToggle = async (habit) => {
    setTogglingId(habit._id);
    try {
      await toggleHabit(habit._id);
      toast.success(
        habit.isActive
          ? "Habit hidden from users"
          : "Habit is now visible to users"
      );
      loadHabits();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to toggle habit"
      );
    } finally {
      setTogglingId(null);
    }
  };

  // 🗑️ Delete with confirmation
  const handleDelete = async (habit) => {
    const ok = window.confirm(
      `Delete "${habit.trackerName}"? This cannot be undone.`
    );
    if (!ok) return;

    setDeletingId(habit._id);
    try {
      await deleteHabit(habit._id);
      toast.success("Habit deleted");
      loadHabits();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to delete habit"
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ✏️ Open modal for editing
  const handleEdit = (habit) => {
    setEditingHabit(habit);
    setModalOpen(true);
  };

  // ➕ Open modal for create
  const handleAdd = () => {
    setEditingHabit(null);
    setModalOpen(true);
  };

  // 💾 After modal saves
  const handleModalSuccess = () => {
    setModalOpen(false);
    setEditingHabit(null);
    loadHabits();
  };

  // 🚫 Zealtho fallback
  if (isZealtho) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          title="Habit Configurator"
          subtitle="Dynamically adding or editing tracking metrics"
        />
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-10 text-center">
          <p className="text-base font-semibold text-gray-800 mb-2">
            Habits not available for Zealtho
          </p>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Zealtho is the parent platform. Habits/trackers belong to child
            programs (Yoga T20, Diabmukt, MommyFit, Slimfitter). Switch using
            the sidebar dropdown to manage habits.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Habit Configurator"
        subtitle={`Dynamically adding or editing tracking metrics for ${selectedProgram.label}`}
      />

      {/* ============================================ */}
      {/* 📊 ACTIVE TRACKING METRICS GRID              */}
      {/* ============================================ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-5">
          <p className="text-sm font-semibold text-gray-800">
            Active Tracking Metrics
            <span className="ml-2 text-xs text-gray-400 font-normal">
              ({habits.length})
            </span>
          </p>
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus size={14} />
            Add New Metric
          </button>
        </div>

        {loading ? (
          <p className="px-2 py-10 text-center text-sm text-gray-400">
            Loading habits...
          </p>
        ) : habits.length === 0 ? (
          <div className="px-2 py-10 text-center">
            <p className="text-sm text-gray-500 mb-3">
              No habits configured yet. Add your first metric to get started.
            </p>
            <button
              type="button"
              onClick={handleAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
            >
              <Plus size={14} />
              Add First Metric
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {habits.map((habit) => (
              <HabitCard
                key={habit._id}
                habit={habit}
                isToggling={togglingId === habit._id}
                isDeleting={deletingId === habit._id}
                onToggle={() => handleToggle(habit)}
                onEdit={() => handleEdit(habit)}
                onDelete={() => handleDelete(habit)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* ℹ️ CUSTOM METRIC GUIDELINES INFO BOX         */}
      {/* ============================================ */}
      <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-5 flex gap-3">
        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
          <Info size={14} className="text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-1">
            Custom Metric Guidelines
          </p>
          <p className="text-xs text-gray-600 leading-relaxed">
            When adding new metrics, ensure they are relevant to your brand's
            health focus. Each metric should have a clear unit of measurement
            and tracking frequency.
          </p>
        </div>
      </div>

      {/* ============================================ */}
      {/* ➕ ADD / EDIT MODAL                            */}
      {/* ============================================ */}
      {modalOpen && (
        <AddHabitModal
          editingHabit={editingHabit}
          programId={selectedProgramId}
          onClose={() => {
            setModalOpen(false);
            setEditingHabit(null);
          }}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
};

export default HabitConfigurator;