// frontend/src/pages/admin/DynamicDataManagement.tsx
// API-backed management UI (no mock data)

import React, { useEffect, useMemo, useState } from "react";
import {
  DynamicDataPoint,
  DynamicDataType,
  createDataPoint,
  deleteDataPoint,
  getDataPoints,
  getDataTypes,
  setPointActive,
  updateDataPoint,
} from "../../lib/api";

type DraftPoint = {
  name: string;
  display_name: string;
  sort_order: number | "";
  is_active: boolean;
};

const emptyDraft: DraftPoint = {
  name: "",
  display_name: "",
  sort_order: "",
  is_active: true,
};

const DynamicDataManagement: React.FC = () => {
  const [types, setTypes] = useState<DynamicDataType[]>([]);
  const [selectedTypeName, setSelectedTypeName] = useState<string>("");
  const [selectedType, setSelectedType] = useState<DynamicDataType | null>(
    null
  );
  const [points, setPoints] = useState<DynamicDataPoint[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftPoint>({ ...emptyDraft });
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftPoint>({ ...emptyDraft });
  const [showInactive, setShowInactive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load types
  useEffect(() => {
    (async () => {
      setLoadingTypes(true);
      setError(null);
      try {
        const data = await getDataTypes(false);
        data.sort((a, b) => {
          const sa = a.sort_order ?? 0;
          const sb = b.sort_order ?? 0;
          if (sa !== sb) return sa - sb;
          return a.name.localeCompare(b.name);
        });
        setTypes(data);
        if (!selectedTypeName && data.length) setSelectedTypeName(data[0].name);
      } catch (e: any) {
        setError(e?.message || "Failed to load types.");
      } finally {
        setLoadingTypes(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep selectedType in sync
  useEffect(() => {
    const t = types.find((x) => x.name === selectedTypeName) || null;
    setSelectedType(t);
  }, [types, selectedTypeName]);

  // Load points
  useEffect(() => {
    if (!selectedTypeName) return;
    (async () => {
      setLoadingPoints(true);
      setError(null);
      try {
        const data = await getDataPoints(selectedTypeName, !showInactive);
        data.sort((a, b) => {
          const sa = a.sort_order ?? 0;
          const sb = b.sort_order ?? 0;
          if (sa !== sb) return sa - sb;
          return a.name.localeCompare(b.name);
        });
        setPoints(data);
      } catch (e: any) {
        setError(e?.message || "Failed to load points.");
      } finally {
        setLoadingPoints(false);
      }
    })();
  }, [selectedTypeName, showInactive]);

  const filteredPoints = useMemo(() => points, [points]);

  // Create
  const onCreate = async () => {
    if (!selectedType) return;
    if (!draft.name.trim() || !draft.display_name.trim()) {
      setError("Internal name and Display name are required.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const payload = {
        data_type_id: selectedType.id,
        name: draft.name.trim(),
        display_name: draft.display_name.trim(),
        description: draft.display_name.trim(),
        sort_order:
          draft.sort_order === ""
            ? points.length
              ? points.length + 1
              : 1
            : Number(draft.sort_order),
        is_active: draft.is_active,
      };
      const created = await createDataPoint(payload);
      setPoints((prev) => [...prev, created].sort(sortPoints));
      setDraft({ ...emptyDraft });
    } catch (e: any) {
      setError(e?.message || "Failed to create.");
    } finally {
      setCreating(false);
    }
  };

  // Edit
  const beginEdit = (p: DynamicDataPoint) => {
    setEditId(p.id);
    setEditDraft({
      name: p.name,
      display_name: p.display_name || p.name,
      sort_order: p.sort_order ?? "",
      is_active: p.is_active,
    });
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditDraft({ ...emptyDraft });
  };

  const saveEdit = async () => {
    if (!editId) return;
    if (!editDraft.name.trim() || !editDraft.display_name.trim()) {
      setError("Internal name and Display name are required.");
      return;
    }
    setSavingId(editId);
    setError(null);
    try {
      const payload = {
        name: editDraft.name.trim(),
        display_name: editDraft.display_name.trim(),
        description: editDraft.display_name.trim(),
        sort_order:
          editDraft.sort_order === "" ? undefined : Number(editDraft.sort_order),
        is_active: editDraft.is_active,
      };
      const updated = await updateDataPoint(editId, payload);
      setPoints((prev) =>
        prev.map((x) => (x.id === editId ? updated : x)).sort(sortPoints)
      );
      cancelEdit();
    } catch (e: any) {
      setError(e?.message || "Failed to save changes.");
    } finally {
      setSavingId(null);
    }
  };

  // Toggle active
  const toggleActive = async (p: DynamicDataPoint) => {
    setSavingId(p.id);
    setError(null);
    try {
      const updated = await setPointActive(p.id, !p.is_active);
      setPoints((prev) =>
        prev.map((x) => (x.id === p.id ? updated : x)).sort(sortPoints)
      );
    } catch (e: any) {
      setError(e?.message || "Failed to update status.");
    } finally {
      setSavingId(null);
    }
  };

  // Delete
  const onDelete = async (p: DynamicDataPoint) => {
    // use window.confirm to satisfy eslint no-restricted-globals
    if (!window.confirm(`Delete "${p.display_name || p.name}"? This cannot be undone.`)) return;
    setDeletingId(p.id);
    setError(null);
    try {
      await deleteDataPoint(p.id);
      setPoints((prev) => prev.filter((x) => x.id !== p.id));
    } catch (e: any) {
      setError(e?.message || "Failed to delete.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="w-full h-full flex gap-6 p-6">
      {/* Left column: Types */}
      <aside className="w-72 shrink-0 border rounded-xl bg-white">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Dynamic Data Types</h2>
        </div>

        <div className="max-h-[75vh] overflow-auto">
          {loadingTypes ? (
            <p className="p-4 text-sm">Loading types…</p>
          ) : (
            <ul className="p-2">
              {types.map((t) => {
                const activeClass =
                  t.name === selectedTypeName
                    ? "bg-indigo-50 border-indigo-300"
                    : "hover:bg-gray-50";
                return (
                  <li key={t.id} className="mb-1">
                    <button
                      onClick={() => setSelectedTypeName(t.name)}
                      className={`w-full text-left border rounded-lg px-3 py-2 ${activeClass}`}
                    >
                      <div className="font-medium">
                        {t.display_name || toTitle(t.name)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Internal: {t.name}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Right column: Points */}
      <main className="flex-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">
              {selectedType
                ? selectedType.display_name || toTitle(selectedType.name)
                : "Select a data type"}
            </h1>
            {selectedType && (
              <p className="text-sm text-gray-500">Internal: {selectedType.name}</p>
            )}
          </div>

          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Show inactive
          </label>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Add New */}
        <section className="mt-6 rounded-xl border bg-white">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h2 className="font-semibold">Add New Option</h2>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">Internal name</label>
              <input
                className="w-full rounded-md border px-3 py-2"
                placeholder="e.g., email"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">Display name</label>
              <input
                className="w-full rounded-md border px-3 py-2"
                placeholder="e.g., Email"
                value={draft.display_name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, display_name: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Sort order</label>
              <input
                className="w-full rounded-md border px-3 py-2"
                type="number"
                placeholder="auto"
                value={draft.sort_order}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    sort_order: e.target.value === "" ? "" : Number(e.target.value),
                  }))
                }
              />
            </div>

            <div className="sm:col-span-5 flex items-center justify-between">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={draft.is_active}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, is_active: e.target.checked }))
                  }
                />
                Active
              </label>

              <button
                className="rounded-md bg-indigo-600 text-white px-4 py-2 disabled:opacity-60"
                onClick={onCreate}
                disabled={creating || !selectedType}
              >
                {creating ? "Adding…" : "Add"}
              </button>
            </div>
          </div>
        </section>

        {/* Points list */}
        <section className="mt-6 space-y-3">
          {loadingPoints ? (
            <div className="rounded-xl border bg-white p-4 text-sm">Loading options…</div>
          ) : !selectedType ? (
            <div className="rounded-xl border bg-white p-4 text-sm">
              Select a data type on the left.
            </div>
          ) : filteredPoints.length === 0 ? (
            <div className="rounded-xl border bg-white p-4 text-sm">No options found.</div>
          ) : (
            filteredPoints.map((p) => {
              const editing = editId === p.id;
              return (
                <div
                  key={p.id}
                  className="rounded-xl border bg-white px-4 py-3 flex items-start justify-between gap-4"
                >
                  <div className="flex-1">
                    {!editing ? (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="text-base font-medium">
                            {p.display_name || p.name}
                          </div>
                          <span
                            className={`text-xs rounded-full px-2 py-0.5 border ${
                              p.is_active
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-gray-50 text-gray-600 border-gray-200"
                            }`}
                          >
                            {p.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Internal: {p.name} · Sort order: {p.sort_order ?? "—"}
                        </div>
                      </>
                    ) : (
                      <div className="grid sm:grid-cols-5 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-xs mb-1">Internal name</label>
                          <input
                            className="w-full rounded-md border px-3 py-2"
                            value={editDraft.name}
                            onChange={(e) =>
                              setEditDraft((d) => ({ ...d, name: e.target.value }))
                            }
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs mb-1">Display name</label>
                          <input
                            className="w-full rounded-md border px-3 py-2"
                            value={editDraft.display_name}
                            onChange={(e) =>
                              setEditDraft((d) => ({ ...d, display_name: e.target.value }))
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1">Sort order</label>
                          <input
                            className="w-full rounded-md border px-3 py-2"
                            type="number"
                            value={editDraft.sort_order}
                            onChange={(e) =>
                              setEditDraft((d) => ({
                                ...d,
                                sort_order:
                                  e.target.value === "" ? "" : Number(e.target.value),
                              }))
                            }
                          />
                        </div>
                        <label className="inline-flex items-center gap-2 text-sm mt-1">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={editDraft.is_active}
                            onChange={(e) =>
                              setEditDraft((d) => ({ ...d, is_active: e.target.checked }))
                            }
                          />
                          Active
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!editing ? (
                      <>
                        <button
                          className="px-3 py-1.5 text-sm rounded-md border hover:bg-gray-50"
                          onClick={() => beginEdit(p)}
                        >
                          Edit
                        </button>
                        <button
                          className="px-3 py-1.5 text-sm rounded-md border hover:bg-gray-50 disabled:opacity-60"
                          onClick={() => toggleActive(p)}
                          disabled={savingId === p.id}
                        >
                          {p.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          className="px-3 py-1.5 text-sm rounded-md border hover:bg-red-50 text-red-600 border-red-200 disabled:opacity-60"
                          onClick={() => onDelete(p)}
                          disabled={deletingId === p.id}
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="px-3 py-1.5 text-sm rounded-md bg-indigo-600 text-white disabled:opacity-60"
                          onClick={saveEdit}
                          disabled={savingId === p.id}
                        >
                          Save
                        </button>
                        <button
                          className="px-3 py-1.5 text-sm rounded-md border hover:bg-gray-50"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
};

export default DynamicDataManagement;

// ---------- helpers ----------
function sortPoints(a: DynamicDataPoint, b: DynamicDataPoint) {
  const sa = a.sort_order ?? 0;
  const sb = b.sort_order ?? 0;
  if (sa !== sb) return sa - sb;
  return a.name.localeCompare(b.name);
}

function toTitle(s: string) {
  return s.replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}
