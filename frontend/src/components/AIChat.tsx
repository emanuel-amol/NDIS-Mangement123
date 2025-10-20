// frontend/src/components/AIChat.tsx
import React, { useMemo, useState } from "react";
import { MessageSquare, Send, Loader2, Sparkles } from "lucide-react";
import type { UseRAGReturn } from "../hooks/useRAG";
import SourceAttribution from "./SourceAttribution";

interface AIChatProps {
  participantId: number;
  className?: string;
  suggestionPrompts?: string[];
  rag: UseRAGReturn;
}

const DEFAULT_SUGGESTIONS = [
  "What are their current goals?",
  "Which supports are working well?",
  "Any risks I should know about?",
  "Summarise their progress this quarter.",
];

const AIChat: React.FC<AIChatProps> = ({ participantId, className = "", suggestionPrompts, rag }) => {
  const [question, setQuestion] = useState<string>("");
  const {
    lastAnswer,
    answerLoading,
    answerError,
    askQuestion,
    status,
    statusLoading,
  } = rag;

  const suggestions = useMemo(
    () => suggestionPrompts && suggestionPrompts.length ? suggestionPrompts : DEFAULT_SUGGESTIONS,
    [suggestionPrompts]
  );

  const handleAsk = async () => {
    if (!question.trim() || answerLoading) return;
    await askQuestion(question.trim());
  };

  return (
    <section className={`rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}>
      <header className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <MessageSquare className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Ask AI Assistant</h3>
          <p className="text-sm text-gray-500">Ask questions about this participant using their documents.</p>
          <p className="text-xs text-gray-400">Participant ID: {participantId}</p>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs">
          {statusLoading ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-gray-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              Checking RAG status
            </span>
          ) : status?.embeddings_available ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-green-700">
              <Sparkles className="h-3 w-3" />
              Using semantic search
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-yellow-700">
              <Sparkles className="h-3 w-3" />
              Keyword mode
            </span>
          )}
        </div>
      </header>

      <div className="px-6 py-5">
        <div className="flex gap-3">
          <input
            type="text"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleAsk();
              }
            }}
            placeholder="Ask about goals, supports, risks, progress..."
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <button
            type="button"
            onClick={handleAsk}
            disabled={!question.trim() || answerLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {answerLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Asking...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Ask
              </>
            )}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Try:</span>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setQuestion(suggestion)}
              className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 transition hover:border-blue-200 hover:text-blue-700"
            >
              {suggestion}
            </button>
          ))}
        </div>

        {answerError && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {answerError}
          </div>
        )}

        {lastAnswer && (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-gray-100 bg-blue-50/60 p-4 shadow-inner">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{lastAnswer.answer}</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                <span>Question:</span>
                <span className="font-medium text-gray-700">"{lastAnswer.question}"</span>
              </div>
            </div>

            <SourceAttribution
              sources={lastAnswer.sources}
              className="bg-white"
              emptyMessage="AI responded without using participant documents."
            />
          </div>
        )}
      </div>
    </section>
  );
};

export default AIChat;
