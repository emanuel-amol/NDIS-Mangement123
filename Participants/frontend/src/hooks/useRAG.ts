// frontend/src/hooks/useRAG.ts
// Centralised hook for interacting with Retrieval-Augmented Generation endpoints

import { useState, useCallback, useEffect } from "react";
import {
  ragAPI,
  RAGStatus,
  RAGAnswerResponse,
  RAGSearchResponse,
  DocumentProcessingStatus,
  DocumentChunksResponse,
  CarePlanRAGResponse,
} from "../services/api";
import { formatAIResponse } from "../utils/ragHelpers";

export interface UseRAGState {
  status: RAGStatus | null;
  statusLoading: boolean;
  statusError: string | null;
  lastAnswer: RAGAnswerResponse | null;
  answerLoading: boolean;
  answerError: string | null;
  searchResults: RAGSearchResponse | null;
  searchLoading: boolean;
  searchError: string | null;
  carePlanResult: CarePlanRAGResponse | null;
  carePlanLoading: boolean;
  carePlanError: string | null;
  processingStatuses: Record<number, DocumentProcessingStatus>;
}

export interface UseRAGActions {
  refreshStatus: () => Promise<void>;
  askQuestion: (question: string) => Promise<RAGAnswerResponse | null>;
  searchDocuments: (query: string, topK?: number, similarityThreshold?: number) => Promise<RAGSearchResponse | null>;
  fetchProcessingStatus: (documentId: number) => Promise<DocumentProcessingStatus | null>;
  fetchDocumentChunks: (documentId: number, includeEmbeddings?: boolean) => Promise<DocumentChunksResponse | null>;
  generateCarePlan: () => Promise<CarePlanRAGResponse | null>;
}

export type UseRAGReturn = UseRAGState & UseRAGActions;

export const useRAG = (participantId?: number): UseRAGReturn => {
  const [status, setStatus] = useState<RAGStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState<boolean>(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [lastAnswer, setLastAnswer] = useState<RAGAnswerResponse | null>(null);
  const [answerLoading, setAnswerLoading] = useState<boolean>(false);
  const [answerError, setAnswerError] = useState<string | null>(null);

  const [searchResults, setSearchResults] = useState<RAGSearchResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [carePlanResult, setCarePlanResult] = useState<CarePlanRAGResponse | null>(null);
  const [carePlanLoading, setCarePlanLoading] = useState<boolean>(false);
  const [carePlanError, setCarePlanError] = useState<string | null>(null);

  const [processingStatuses, setProcessingStatuses] = useState<Record<number, DocumentProcessingStatus>>({});

  const refreshStatus = useCallback(async () => {
    try {
      setStatusLoading(true);
      setStatusError(null);
      const data = await ragAPI.getStatus();
      setStatus(data);
    } catch (error) {
      console.error("Failed to load RAG status", error);
      setStatusError(error instanceof Error ? error.message : "Unable to load RAG status");
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const assertParticipant = useCallback(() => {
    if (typeof participantId !== "number") {
      throw new Error("Participant ID is required for this operation");
    }
  }, [participantId]);

  const askQuestion = useCallback(
    async (question: string): Promise<RAGAnswerResponse | null> => {
      try {
        assertParticipant();
        setAnswerLoading(true);
        setAnswerError(null);
        const response = await ragAPI.askAIAboutParticipant(participantId as number, question);
        const normalised: RAGAnswerResponse = {
          ...response,
          answer: formatAIResponse(response.answer),
        };
        setLastAnswer(normalised);
        return normalised;
      } catch (error) {
        console.error("Failed to ask AI question", error);
        const message = error instanceof Error ? error.message : "Question failed";
        setAnswerError(message);
        return null;
      } finally {
        setAnswerLoading(false);
      }
    },
    [assertParticipant, participantId]
  );

  const searchDocuments = useCallback(
    async (
      query: string,
      topK: number = 5,
      similarityThreshold: number = 0.3
    ): Promise<RAGSearchResponse | null> => {
      try {
        assertParticipant();
        setSearchLoading(true);
        setSearchError(null);
        const results = await ragAPI.searchDocuments(participantId as number, query, topK, similarityThreshold);
        setSearchResults(results);
        return results;
      } catch (error) {
        console.error("Document search failed", error);
        const message = error instanceof Error ? error.message : "Search failed";
        setSearchError(message);
        return null;
      } finally {
        setSearchLoading(false);
      }
    },
    [assertParticipant, participantId]
  );

  const fetchProcessingStatus = useCallback(
    async (documentId: number): Promise<DocumentProcessingStatus | null> => {
      try {
        const statusResponse = await ragAPI.getDocumentProcessingStatus(documentId);
        setProcessingStatuses((prev) => ({
          ...prev,
          [documentId]: statusResponse,
        }));
        return statusResponse;
      } catch (error) {
        console.error(`Failed to fetch processing status for document ${documentId}`, error);
        return null;
      }
    },
    []
  );

  const fetchDocumentChunks = useCallback(
    async (documentId: number, includeEmbeddings: boolean = false): Promise<DocumentChunksResponse | null> => {
      try {
        return await ragAPI.getDocumentChunks(documentId, includeEmbeddings);
      } catch (error) {
        console.error(`Failed to fetch document chunks for document ${documentId}`, error);
        return null;
      }
    },
    []
  );

  const generateCarePlan = useCallback(async (): Promise<CarePlanRAGResponse | null> => {
    try {
      assertParticipant();
      setCarePlanLoading(true);
      setCarePlanError(null);
      const response = await ragAPI.generateCarePlanWithRAG(participantId as number);
      setCarePlanResult(response);
      return response;
    } catch (error) {
      console.error("Failed to generate RAG care plan", error);
      const message = error instanceof Error ? error.message : "Care plan generation failed";
      setCarePlanError(message);
      return null;
    } finally {
      setCarePlanLoading(false);
    }
  }, [assertParticipant, participantId]);

  return {
    status,
    statusLoading,
    statusError,
    lastAnswer,
    answerLoading,
    answerError,
    searchResults,
    searchLoading,
    searchError,
    carePlanResult,
    carePlanLoading,
    carePlanError,
    processingStatuses,
    refreshStatus,
    askQuestion,
    searchDocuments,
    fetchProcessingStatus,
    fetchDocumentChunks,
    generateCarePlan,
  };
};
