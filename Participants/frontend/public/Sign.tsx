// frontend/src/pages/public/Sign.tsx
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getPublicEnvelope, acceptSignature, EnvelopePublicRead } from "../../services/signing";

export default function SignPage() {
    const { token } = useParams<{ token: string }>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [env, setEnv] = useState<EnvelopePublicRead | null>(null);
    const [typedName, setTypedName] = useState("");
    const [accepted, setAccepted] = useState(false);
    const [done, setDone] = useState(false);

    useEffect(() => {
        if (!token) {
            setError("No token provided");
            setLoading(false);
            return;
        }

        getPublicEnvelope(token)
            .then((data) => {
                setEnv(data);
                setLoading(false);
            })
            .catch((err) => {
                setError(err?.message || "Failed to load signing envelope");
                setLoading(false);
            });
    }, [token]);

    const onSubmit = async () => {
        if (!token || !accepted || typedName.trim().length < 2) return;

        try {
            await acceptSignature(token, typedName.trim());
            setDone(true);
        } catch (e: any) {
            setError(e?.message || "Failed to sign");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                Loading…
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center text-red-600">
                {error}
            </div>
        );
    }

    if (!env) return null;

    if (done) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="max-w-md w-full bg-white shadow p-6 rounded-2xl text-center">
                    <h1 className="text-xl font-semibold mb-2">
                        Thanks, your signature is recorded.
                    </h1>
                    <p className="text-gray-600">You can close this page.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
            <div className="max-w-2xl w-full bg-white shadow p-6 rounded-2xl">
                <h1 className="text-2xl font-semibold">Review & Sign</h1>
                <p className="mt-1 text-gray-600">
                    For: <strong>{env.signer_name}</strong> ({env.signer_role})
                </p>

                <div className="mt-6">
                    <h2 className="font-medium">Documents</h2>
                    <ul className="list-disc list-inside text-gray-700 mt-2">
                        {env.documents.map((d) => (
                            <li key={d.id}>
                                {d.title}
                                {d.category ? ` · ${d.category}` : ""}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="mt-6 space-y-3">
                    <label className="block text-sm font-medium">
                        Type your full name to sign
                    </label>
                    <input
                        className="w-full border rounded-lg px-3 py-2"
                        value={typedName}
                        onChange={(e) => setTypedName(e.target.value)}
                        placeholder="Full name"
                    />
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={accepted}
                            onChange={(e) => setAccepted(e.target.checked)}
                        />
                        I confirm I've reviewed the above documents and agree to sign
                        electronically.
                    </label>
                </div>

                <div className="mt-6 flex gap-3">
                    <button
                        onClick={onSubmit}
                        disabled={!accepted || typedName.trim().length < 2}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700 disabled:hover:bg-blue-600 transition-colors"
                    >
                        Sign & Submit
                    </button>
                </div>
            </div>
        </div>
    );
}