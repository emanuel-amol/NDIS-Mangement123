import React, { useState, useRef } from 'react';

interface FileUploadProps {
  onFilesUploaded?: (files: UploadedFile[]) => void;
  referralId?: number;
  multiple?: boolean;
  accept?: string;
  maxSize?: number; // in MB
}

interface UploadedFile {
  file_id: string;
  original_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
  description?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  onFilesUploaded, 
  referralId, 
  multiple = true, 
  accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt",
  maxSize = 10
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file size (convert MB to bytes)
    if (file.size > maxSize * 1024 * 1024) {
      return `File ${file.name} is too large. Maximum size: ${maxSize}MB`;
    }

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      return `File ${file.name} has unsupported format. Allowed: PDF, images, Word documents, text files`;
    }

    return null;
  };

  const uploadFiles = async (files: FileList) => {
    setUploading(true);
    const uploadPromises: Promise<UploadedFile | null>[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        alert(validationError);
        continue;
      }

      uploadPromises.push(uploadSingleFile(file));
    }

    try {
      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter((result): result is UploadedFile => result !== null);
      
      setUploadedFiles(prev => [...prev, ...successfulUploads]);
      onFilesUploaded?.(successfulUploads);
      
      if (successfulUploads.length > 0) {
        alert(`Successfully uploaded ${successfulUploads.length} file(s)`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Some files failed to upload. Please try again.');
    } finally {
      setUploading(false);
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const uploadSingleFile = async (file: File): Promise<UploadedFile | null> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', `Uploaded with referral form`);
    
    if (referralId) {
      formData.append('referral_id', referralId.toString());
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/files/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to upload ${file.name}`);
      }

      const result = await response.json();
      return result.file;
    } catch (error) {
      console.error(`Error uploading ${file.name}:`, error);
      return null;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
    }
  };

  const removeFile = async (fileId: string) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/files/file/${fileId}?referral_id=${referralId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setUploadedFiles(prev => prev.filter(file => file.file_id !== fileId));
        alert('File deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={uploading}
        />
        
        {uploading ? (
          <div className="space-y-2">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="text-sm text-gray-600">Uploading files...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-gray-600">
              Drag and drop files here, or{' '}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                browse
              </button>
            </p>
            <p className="text-xs text-gray-500">
              Supported: PDF, Images (JPG, PNG, GIF), Word documents, Text files
              <br />
              Maximum size: {maxSize}MB per file
            </p>
          </div>
        )}
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Uploaded Files:</h4>
          {uploadedFiles.map((file) => (
            <div key={file.file_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{file.original_name}</p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(file.file_size)} • {new Date(file.uploaded_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex space-x-2">
                <a
                  href={file.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  View
                </a>
                <button
                  type="button"
                  onClick={() => removeFile(file.file_id)}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;