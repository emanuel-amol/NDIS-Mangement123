// frontend/src/components/SourceAttribution.tsx
import React, { useMemo } from "react";
import { FileText, ArrowUpRight, Info } from "lucide-react";
import type { RAGSource } from "../services/api";
import { parseSourceCitations, formatSimilarityScore } from "../utils/ragHelpers";

interface SourceAttributionProps {
  sources?: RAGSource[] | null;
  compact?: boolean;
  className?: string;
  onSelectSource?: (source: RAGSource) => void;
  emptyMessage?: string;
}

const badgeColors: Record<string, string> = {
  high: "bg-green-100 text-green-700 border border-green-200",
  medium: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  low: "bg-gray-100 text-gray-600 border border-gray-200",
};

const SourceAttribution: React.FC<SourceAttributionProps> = ({
  sources,
  compact = false,
  className = "",
  onSelectSource,
  emptyMessage = "No supporting documents were referenced.",
}) => {
  const parsedSources = useMemo(() => parseSourceCitations(sources), [sources]);

  if (!parsedSources.length) {
    return (
      <div
        className={`rounded-lg border border-dashed border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 ${className}`}
      >
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-gray-400" />
          <span>{emptyMessage}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border border-blue-100 bg-blue-50 p-4 ${className}`}
      aria-label="RAG source attribution"
    >
      <div className="mb-3 flex items-center gap-2">
        <FileText className="h-4 w-4 text-blue-600" />
        <p className="text-sm font-medium text-blue-700">
          Sources ({parsedSources.length})
        </p>
      </div>

      <div className={`flex flex-col gap-2 ${compact ? "" : "max-h-64 overflow-y-auto pr-1"}`}>
        {parsedSources.map((source, index) => {
          const original = sources?.[index];
          const badgeClass = badgeColors[source.relevanceLabel] ?? badgeColors.low;
          return (
            <button
              key={`${source.documentId}-${index}`}
              type="button"
              className={`flex w-full items-center gap-3 rounded-md bg-white px-3 py-2 text-left shadow-sm transition hover:bg-blue-100 ${
                onSelectSource ? "cursor-pointer" : "cursor-default"
              }`}
              onClick={() => original && onSelectSource?.(original)}
            >
              <span
                className={`inline-flex min-w-[56px] items-center justify-center rounded-full px-2 py-1 text-xs font-semibold ${badgeClass}`}
              >
                {formatSimilarityScore(source.score, 0)}
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">{source.title}</p>
                <p className="text-xs text-gray-500">Relevance: {source.relevanceLabel.toUpperCase()}</p>
              </div>
              {onSelectSource && <ArrowUpRight className="h-4 w-4 text-blue-600" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SourceAttribution;
