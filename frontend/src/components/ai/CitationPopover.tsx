// frontend/src/components/ai/CitationPopover.tsx
import { useState } from 'react';
import { FileText, X } from 'lucide-react';

interface CitationPopoverProps {
  chunkId: number;
  chunkText: string;
  documentName?: string;
  pageRange?: string;
}

export function CitationPopover({ 
  chunkId, 
  chunkText, 
  documentName, 
  pageRange 
}: CitationPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
      >
        <FileText size={12} />
        <span>Source {chunkId}</span>
      </button>

      {isOpen && (
        <div 
          className="absolute z-50 w-96 p-4 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl"
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText className="text-blue-600" size={16} />
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {documentName || `Document Chunk ${chunkId}`}
                </p>
                {pageRange && (
                  <p className="text-xs text-gray-500">Pages: {pageRange}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-700 leading-relaxed">
              {chunkText.length > 300 
                ? `${chunkText.substring(0, 300)}...` 
                : chunkText}
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
            <span>AI-extracted content</span>
            <span>Chunk ID: {chunkId}</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface InlineCitationProps {
  citations: number[];
  chunks: Array<{ id: number; text: string; meta?: any }>;
}

export function InlineCitation({ citations, chunks }: InlineCitationProps) {
  if (!citations || citations.length === 0) return null;

  return (
    <span className="inline-flex items-center gap-1 ml-1">
      {citations.map((citationId) => {
        const chunk = chunks.find(c => c.id === citationId);
        if (!chunk) return null;

        return (
          <CitationPopover
            key={citationId}
            chunkId={citationId}
            chunkText={chunk.text}
            documentName={chunk.meta?.document_name}
            pageRange={chunk.meta?.page_range}
          />
        );
      })}
    </span>
  );
}