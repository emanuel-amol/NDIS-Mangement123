// frontend/src/components/DocumentInsights.tsx
import React, { useMemo } from "react";
import { BarChart2, RefreshCcw, Loader2, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import type { RAGStatus, DocumentProcessingStatus } from "../services/api";

interface DocumentInsightsProps {
  status?: RAGStatus | null;
  processingStatuses?: Record<number, DocumentProcessingStatus>;
  className?: string;
  onRefreshStatus?: () => Promise<void> | void;
  loading?: boolean;
}

const formatDateTime = (value?: string | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
};

const DocumentInsights: React.FC<DocumentInsightsProps> = ({
  status,
  processingStatuses = {},
  className = "",
  onRefreshStatus,
  loading = false,
}) => {
  const { totalTracked, completed, inProgress, failed } = useMemo(() => {
    const statuses = Object.values(processingStatuses);
    return {
      totalTracked: statuses.length,
      completed: statuses.filter((item) => item.status === "completed").length,
      inProgress: statuses.filter((item) => item.status === "processing").length,
      failed: statuses.filter((item) => item.status === "failed").length,
    };
  }, [processingStatuses]);

  return (
    <section className={`rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}>
      <header className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <BarChart2 className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Document Insights</h3>
            <p className="text-sm text-gray-500">Chunking and embedding overview for this workspace.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRefreshStatus?.()}
          className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition hover:border-emerald-300 hover:text-emerald-600"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </>
          )}
        </button>
      </header>

      <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">RAG status</p>
          <h4 className="mt-2 text-xl font-semibold text-emerald-800">
            {status?.embeddings_available ? "Semantic search enabled" : "Keyword search mode"}
          </h4>
          <p className="mt-1 text-sm text-emerald-700">
            {status?.embeddings_available
              ? `Embedding model: ${status.embedding_model ?? "Custom"}`
              : "Embeddings are not configured. Semantic search will be unavailable."}
          </p>
          {status?.configuration && (
            <dl className="mt-3 grid grid-cols-3 gap-2 text-xs text-emerald-700">
              <div>
                <dt className="font-semibold text-emerald-800">Chunk size</dt>
                <dd>{status.configuration.chunk_size}</dd>
              </div>
              <div>
                <dt className="font-semibold text-emerald-800">Overlap</dt>
                <dd>{status.configuration.chunk_overlap}</dd>
              </div>
              <div>
                <dt className="font-semibold text-emerald-800">Minimum</dt>
                <dd>{status.configuration.min_chunk_size}</dd>
              </div>
            </dl>
          )}
        </div>

        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Processing overview</p>
          <div className="mt-2 flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-blue-700">
              <CheckCircle className="h-4 w-4 text-blue-500" />
              <span>
                {completed}/{totalTracked} completed
              </span>
            </div>
            <div className="flex items-center gap-2 text-blue-600">
              <Clock className="h-4 w-4 text-blue-400" />
              <span>{inProgress} in progress</span>
            </div>
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span>{failed} issues</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-blue-600">
            Tracking {totalTracked} documents for chunking and embedding.
          </p>
        </div>
      </div>

      {Object.keys(processingStatuses).length > 0 && (
        <div className="px-6 pb-6">
          <div className="rounded-lg border border-gray-100 bg-gray-50">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-white">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">Document</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">Chunks</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">Embedded</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Object.entries(processingStatuses).map(([documentId, details]) => (
                  <tr key={documentId} className="bg-white">
                    <td className="px-4 py-2 text-gray-700">#{documentId}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          details.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : details.status === "failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {details.status ?? "unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {details.chunks_created ?? details.chunk_count ?? 0}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {details.chunks_embedded ?? 0}
                    </td>
                    <td className="px-4 py-2 text-gray-500">
                      {formatDateTime(details.completed_at ?? details.started_at) ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};

export default DocumentInsights;
