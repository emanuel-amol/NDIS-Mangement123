// frontend/src/utils/ragHelpers.ts
// Utility helpers for formatting RAG responses and sources

import type { RAGSource } from "../services/api";

export interface ParsedSource {
  documentId: number;
  title: string;
  score: number;
  percentage: number;
  relevanceLabel: "high" | "medium" | "low";
}

export const clampScore = (score: number): number => {
  if (Number.isNaN(score)) {
    return 0;
  }
  return Math.min(1, Math.max(0, score));
};

export const formatSimilarityScore = (score: number, digits: number = 0): string => {
  const value = clampScore(score) * 100;
  return `${value.toFixed(digits)}%`;
};

export const describeRelevance = (score: number): "high" | "medium" | "low" => {
  const value = clampScore(score);
  if (value >= 0.75) return "high";
  if (value >= 0.45) return "medium";
  return "low";
};

export const parseSourceCitations = (sources?: RAGSource[] | null): ParsedSource[] => {
  if (!sources || sources.length === 0) {
    return [];
  }
  return sources.map((source) => {
    const score = clampScore(source.similarity_score);
    return {
      documentId: source.document_id,
      title: source.document_title ?? "Unknown document",
      score,
      percentage: parseFloat((score * 100).toFixed(1)),
      relevanceLabel: describeRelevance(score),
    };
  });
};

export const formatAIResponse = (answer?: string | null): string => {
  if (!answer) {
    return "No response available.";
  }
  // Normalize whitespace and trim to keep rendering consistent.
  return answer.replace(/\r\n/g, "\n").trim();
};
