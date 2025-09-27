// frontend/src/pages/admin/users/AddSupportWorker.tsx
import { useState } from "react";
import { createUser, UserRole } from "@/services/adminUsers";

export default function AddSupportWorker() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    phone: ""
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const update = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await createUser({
        email: form.email.trim(),
        password: form.password,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim() || undefined,
        role: "support_worker" as UserRole
      });
      setMessage("Support worker created successfully.");
      setForm({ email: "", password: "", first_name: "", last_name: "", phone: "" });
    } catch (err: any) {
      setMessage(err?.message || "Failed to create support worker.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-semibold mb-4">Add Support Worker</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">First Name</label>
          <input className="w-full border rounded-lg p-2" value={form.first_name} onChange={e=>update("first_name", e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm mb-1">Last Name</label>
          <input className="w-full border rounded-lg p-2" value={form.last_name} onChange={e=>update("last_name", e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input type="email" className="w-full border rounded-lg p-2" value={form.email} onChange={e=>update("email", e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm mb-1">Phone</label>
          <input className="w-full border rounded-lg p-2" value={form.phone} onChange={e=>update("phone", e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Temporary Password</label>
          <input type="password" className="w-full border rounded-lg p-2" value={form.password} onChange={e=>update("password", e.target.value)} required minLength={8} />
          <p className="text-xs text-gray-500 mt-1">Ask the worker to change this on first login.</p>
        </div>

        <button disabled={saving} className="px-4 py-2 rounded-lg bg-black text-white">
          {saving ? "Creating..." : "Create Support Worker"}
        </button>

        {message && <p className="mt-3 text-sm">{message}</p>}
      </form>
    </div>
  );
}
