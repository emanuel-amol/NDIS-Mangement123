// frontend/src/components/DocumentSearch.tsx
import React, { useState } from "react";
import { Search, Loader2, ExternalLink, FileText } from "lucide-react";
import type { UseRAGReturn } from "../hooks/useRAG";
import type { RAGSearchResult } from "../services/api";
import { formatSimilarityScore } from "../utils/ragHelpers";

interface DocumentSearchProps {
  participantId: number;
  className?: string;
  onViewDocument?: (documentId: number) => void;
  onViewContext?: (result: RAGSearchResult) => void;
  rag: UseRAGReturn;
}

const DocumentSearch: React.FC<DocumentSearchProps> = ({
  participantId,
  className = "",
  onViewDocument,
  onViewContext,
  rag,
}) => {
  const [query, setQuery] = useState<string>("");
  const { searchDocuments, searchResults, searchLoading, searchError, status } = rag;

  const handleSearch = async () => {
    if (!query.trim() || searchLoading) return;
    await searchDocuments(query.trim());
  };

  return (
    <section className={`rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}>
      <header className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-600">
          <Search className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Smart Document Search</h3>
          <p className="text-sm text-gray-500">
            Semantic and keyword search across participant documents.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
            Participant #{participantId}
          </span>
          {status && (
            <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-600">
              {status.embeddings_available ? "Semantic" : "Keyword"} mode
            </span>
          )}
        </div>
      </header>

      <div className="px-6 py-5">
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSearch();
              }
            }}
            placeholder="Search by concept, goal, risk, or question..."
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={searchLoading || !query.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {searchLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Search
              </>
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Try queries like &ldquo;community participation goals&rdquo;, &ldquo;risk management plan&rdquo;, or
          &ldquo;communication strategies&rdquo;.
        </p>

        {searchError && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {searchError}
          </div>
        )}

        {searchResults && searchResults.results.length === 0 && !searchLoading && (
          <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            No relevant content found. Try different keywords or broaden your question.
          </div>
        )}

        {searchResults && searchResults.results.length > 0 && (
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-400">
              <span>{searchResults.total_results} relevant sections</span>
              <span>{searchResults.search_type} search</span>
            </div>

            <div className="space-y-3">
              {searchResults.results.map((result) => (
                <article
                  key={`${result.document_id}-${result.chunk_id}`}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-purple-200 hover:shadow-md"
                >
                  <header className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <p className="text-sm font-semibold text-gray-800">
                          {result.metadata?.document_title ?? `Document #${result.document_id}`}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {result.metadata?.category ?? "Uncategorised"} · Section {result.chunk_index + 1}
                      </p>
                    </div>

                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      {formatSimilarityScore(result.similarity_score, 0)} match
                    </span>
                  </header>

                  <p className="mt-3 line-clamp-3 text-sm text-gray-700">{result.chunk_text}</p>

                  <footer className="mt-4 flex flex-wrap gap-2 text-sm">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-md border border-purple-200 bg-purple-50 px-3 py-1 text-purple-700 transition hover:bg-purple-100"
                      onClick={() => onViewDocument?.(result.document_id)}
                    >
                      View document
                      <ExternalLink className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1 text-gray-600 transition hover:border-purple-200 hover:text-purple-700"
                      onClick={() => onViewContext?.(result)}
                    >
                      View context
                    </button>
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">
                      {result.search_type === "semantic" ? "Semantic" : "Keyword"}
                    </span>
                  </footer>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default DocumentSearch;
