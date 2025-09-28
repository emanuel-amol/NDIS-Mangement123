// frontend/src/pages/admin/users/AddSupportWorker.tsx
import { useState } from "react";
import { createUser, UserRole } from "../../../services/adminUsers";

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
      setMessage("✅ Support worker created successfully.");
      setForm({ email: "", password: "", first_name: "", last_name: "", phone: "" });
    } catch (err: any) {
      console.error("Error creating user:", err);
      setMessage(`❌ ${err?.message || "Failed to create support worker."}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-semibold mb-4">Add Support Worker</h1>
      
      {message && (
        <div className={`p-3 rounded-lg mb-4 ${
          message.includes('✅') 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            First Name <span className="text-red-500">*</span>
          </label>
          <input 
            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
            value={form.first_name} 
            onChange={e=>update("first_name", e.target.value)} 
            required 
            disabled={saving}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input 
            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
            value={form.last_name} 
            onChange={e=>update("last_name", e.target.value)} 
            required 
            disabled={saving}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input 
            type="email" 
            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
            value={form.email} 
            onChange={e=>update("email", e.target.value)} 
            required 
            disabled={saving}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input 
            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
            value={form.phone} 
            onChange={e=>update("phone", e.target.value)} 
            disabled={saving}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Temporary Password <span className="text-red-500">*</span>
          </label>
          <input 
            type="password" 
            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
            value={form.password} 
            onChange={e=>update("password", e.target.value)} 
            required 
            minLength={8} 
            disabled={saving}
          />
          <p className="text-xs text-gray-500 mt-1">Ask the worker to change this on first login.</p>
        </div>

        <button 
          type="submit"
          disabled={saving} 
          className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Creating..." : "Create Support Worker"}
        </button>
      </form>
    </div>
  );
}