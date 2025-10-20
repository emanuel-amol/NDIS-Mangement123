// frontend/src/components/documents/DocumentUpload.tsx - ENHANCED VERSION WITH WORKFLOW INTEGRATION
import React, { useState, useCallback, useEffect } from 'react';
import { Upload, X, FileText, AlertCircle, Calendar, Eye, EyeOff, CheckCircle, Image, FileIcon } from 'lucide-react';
import { DocumentService } from '../../services/documentService';
import { DocumentCategory, DocumentMetadata } from '../../types/document.types';

// Enhanced interface for file upload results with workflow integration
interface FileUploadResult {
  success: boolean;
  document?: DocumentMetadata;
  workflow?: {
    id: number;
    type: string;
    status: string;
    requires_approval: boolean;
  };
  error?: string;
}

interface DocumentUploadProps {
  participantId: number;
  onUploadSuccess?: (document: DocumentMetadata) => void;
  onClose?: () => void;
  isOpen: boolean;
  defaultCategory?: string;
  allowedCategories?: string[];
  maxFiles?: number;
  showProgress?: boolean;
}

interface UploadedFile {
  file: File;
  preview?: string;
  error?: string;
  id: string;
  uploading?: boolean;
  progress?: number;
  completed?: boolean;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  participantId,
  onUploadSuccess,
  onClose,
  isOpen,
  defaultCategory,
  allowedCategories,
  maxFiles = 10,
  showProgress = true
}) => {
  const [uploadData, setUploadData] = useState({
    title: '',
    category: defaultCategory || '',
    description: '',
    tags: [] as string[],
    visible_to_support_worker: false,
    expiry_date: '',
    requires_approval: true
  });

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});

  const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/plain'
  ];

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  // Load categories when component mounts
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const fetchedCategories = await DocumentService.getDocumentCategories();
      
      // Filter categories if allowedCategories is specified
      const filteredCategories = allowedCategories 
        ? fetchedCategories.filter(cat => allowedCategories.includes(cat.category_id))
        : fetchedCategories;
      
      setCategories(filteredCategories);
      
      // Set default category if not already set
      if (!uploadData.category && filteredCategories.length > 0) {
        setUploadData(prev => ({ 
          ...prev, 
          category: defaultCategory || filteredCategories[0].category_id 
        }));
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      // Set fallback categories
      setCategories([
        { id: 1, category_id: 'service_agreements', name: 'Service Agreements', description: '', is_required: true, sort_order: 1, is_active: true, config: {} },
        { id: 2, category_id: 'medical_consent', name: 'Medical Consent', description: '', is_required: true, sort_order: 2, is_active: true, config: {} },
        { id: 3, category_id: 'intake_documents', name: 'Intake Documents', description: '', is_required: false, sort_order: 3, is_active: true, config: {} },
        { id: 4, category_id: 'general_documents', name: 'General Documents', description: '', is_required: false, sort_order: 4, is_active: true, config: {} }
      ]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return `File type ${file.type} is not supported. Allowed types: PDF, Images, Word documents, Excel files, Text files.`;
    }

    if (file.size > MAX_FILE_SIZE) {
      return `File size ${formatFileSize(file.size)} exceeds the maximum limit of ${formatFileSize(MAX_FILE_SIZE)}.`;
    }

    return null;
  }, []);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newFiles: UploadedFile[] = [];
    const currentFileCount = uploadedFiles.length;

    for (let i = 0; i < files.length && newFiles.length + currentFileCount < maxFiles; i++) {
      const file = files[i];
      const error = validateFile(file);
      const fileId = `${Date.now()}-${i}`;

      // Create preview for images
      let preview = undefined;
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }

      newFiles.push({
        file,
        preview,
        error,
        id: fileId,
        uploading: false,
        progress: 0,
        completed: false
      });
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Auto-populate title if empty and only one file
    if (!uploadData.title && newFiles.length === 1 && !newFiles[0].error) {
      const fileName = newFiles[0].file.name.split('.')[0];
      setUploadData(prev => ({ ...prev, title: fileName }));
    }
  }, [uploadedFiles.length, maxFiles, uploadData.title, validateFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const addTag = () => {
    if (tagInput.trim() && !uploadData.tags.includes(tagInput.trim())) {
      setUploadData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setUploadData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Enhanced uploadSingleFile function with workflow integration
  const uploadSingleFile = async (uploadFile: UploadedFile): Promise<DocumentMetadata | null> => {
    if (uploadFile.error) return null;

    try {
      // Update file status
      setUploadedFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, uploading: true, progress: 0 } : f
      ));

      const formData = new FormData();
      formData.append('file', uploadFile.file);
      formData.append('title', uploadData.title || uploadFile.file.name.split('.')[0]);
      formData.append('category', uploadData.category);
      formData.append('description', uploadData.description);
      formData.append('tags', uploadData.tags.join(','));
      formData.append('visible_to_support_worker', uploadData.visible_to_support_worker.toString());
      formData.append('expiry_date', uploadData.expiry_date);
      formData.append('requires_approval', uploadData.requires_approval.toString());

      const response = await fetch(`${DocumentService.API_BASE_URL}/participants/${participantId}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        
        // Handle workflow response
        if (result.workflow) {
          if (result.workflow.requires_approval) {
            alert(`Document uploaded successfully!\nStatus: Pending approval\nWorkflow ID: ${result.workflow.id}`);
          } else {
            alert('Document uploaded and auto-approved successfully!');
          }
        } else {
          alert('Document uploaded successfully!');
        }
        
        // Mark file as completed
        setUploadedFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? { ...f, uploading: false, progress: 100, completed: true } : f
        ));

        return result;
      } else {
        const error = await response.json();
        
        // Mark file as failed
        setUploadedFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? { ...f, uploading: false, error: error.detail || 'Upload failed' } : f
        ));

        return null;
      }
    } catch (error) {
      console.error('Upload error:', error);
      
      // Mark file as failed
      setUploadedFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { 
          ...f, 
          uploading: false, 
          error: error instanceof Error ? error.message : 'Upload failed' 
        } : f
      ));

      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (uploadedFiles.length === 0) {
      alert('Please select at least one file to upload');
      return;
    }

    if (!uploadData.title.trim() || !uploadData.category) {
      alert('Please fill in all required fields');
      return;
    }

    const validFiles = uploadedFiles.filter(f => !f.error && !f.completed);
    if (validFiles.length === 0) {
      alert('No valid files to upload');
      return;
    }

    setUploading(true);

    try {
      const results = await Promise.all(validFiles.map(uploadSingleFile));
      const successfulUploads = results.filter(Boolean);

      if (successfulUploads.length > 0) {
        alert(`${successfulUploads.length} document(s) uploaded successfully!`);
        
        // Notify parent component
        successfulUploads.forEach(doc => {
          if (doc && onUploadSuccess) {
            onUploadSuccess(doc);
          }
        });

        // Reset form after successful uploads
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        alert('No documents were uploaded successfully. Please check the errors and try again.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    // Clean up preview URLs
    uploadedFiles.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });

    setUploadData({
      title: '',
      category: defaultCategory || '',
      description: '',
      tags: [],
      visible_to_support_worker: false,
      expiry_date: '',
      requires_approval: true
    });
    setUploadedFiles([]);
    setTagInput('');
    setUploading(false);
    onClose?.();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image size={24} className="text-blue-500" />;
    if (mimeType.includes('pdf')) return <FileText size={24} className="text-red-500" />;
    if (mimeType.includes('word')) return <FileText size={24} className="text-blue-600" />;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <FileIcon size={24} className="text-green-600" />;
    return <FileText size={24} className="text-gray-500" />;
  };

  const getSelectedCategory = () => {
    return categories.find(cat => cat.category_id === uploadData.category);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-gray-900">Upload Documents</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={uploading}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* File Upload Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Files <span className="text-red-500">*</span>
              <span className="text-xs text-gray-500 ml-2">
                (Max {maxFiles} files, 10MB each)
              </span>
            </label>
            
            {uploadedFiles.length === 0 ? (
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  dragActive 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  PDF, JPG, PNG, DOCX, XLSX, TXT files up to 10MB
                </p>
                
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.docx,.doc,.xlsx,.xls,.txt"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  disabled={uploading}
                />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Add more files button */}
                {uploadedFiles.length < maxFiles && (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <button
                      type="button"
                      onClick={() => document.getElementById('additional-file-upload')?.click()}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      disabled={uploading}
                    >
                      + Add more files ({uploadedFiles.length}/{maxFiles})
                    </button>
                    <input
                      id="additional-file-upload"
                      type="file"
                      multiple
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.docx,.doc,.xlsx,.xls,.txt"
                      onChange={(e) => handleFileSelect(e.target.files)}
                      disabled={uploading}
                    />
                  </div>
                )}

                {/* File list */}
                <div className="space-y-3">
                  {uploadedFiles.map((uploadFile) => (
                    <div key={uploadFile.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          {uploadFile.preview ? (
                            <img 
                              src={uploadFile.preview} 
                              alt="Preview" 
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            getFileIcon(uploadFile.file.type)
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {uploadFile.file.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatFileSize(uploadFile.file.size)}
                            </p>
                            
                            {/* Progress bar */}
                            {uploadFile.uploading && showProgress && (
                              <div className="mt-2">
                                <div className="bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadFile.progress || 0}%` }}
                                  ></div>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  Uploading... {uploadFile.progress || 0}%
                                </p>
                              </div>
                            )}
                            
                            {/* Status indicators */}
                            {uploadFile.completed && (
                              <div className="flex items-center mt-1">
                                <CheckCircle size={16} className="text-green-600 mr-1" />
                                <span className="text-sm text-green-600">Uploaded successfully</span>
                              </div>
                            )}
                            
                            {uploadFile.error && (
                              <div className="flex items-center mt-1">
                                <AlertCircle size={16} className="text-red-600 mr-1" />
                                <span className="text-sm text-red-600">{uploadFile.error}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {!uploadFile.uploading && !uploadFile.completed && (
                          <button
                            type="button"
                            onClick={() => removeFile(uploadFile.id)}
                            className="text-red-500 hover:text-red-700 ml-3"
                          >
                            <X size={20} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Document Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={uploadData.title}
                onChange={(e) => setUploadData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter document title"
                required
                disabled={uploading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Will be used for all uploaded files if multiple
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              {loadingCategories ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                  Loading categories...
                </div>
              ) : (
                <select
                  value={uploadData.category}
                  onChange={(e) => setUploadData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={uploading}
                >
                  <option value="">Select category</option>
                  {categories.map(category => (
                    <option key={category.category_id} value={category.category_id}>
                      {category.name}
                      {category.is_required && ' (Required)'}
                    </option>
                  ))}
                </select>
              )}
              
              {getSelectedCategory() && (
                <p className="text-xs text-gray-500 mt-1">
                  {getSelectedCategory()?.description}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={uploadData.description}
              onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional description of the document(s)"
              disabled={uploading}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {uploadData.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                    disabled={uploading}
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add tags (press Enter)"
                disabled={uploading}
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                disabled={uploading}
              >
                Add
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiry Date (Optional)
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="date"
                  value={uploadData.expiry_date}
                  onChange={(e) => setUploadData(prev => ({ ...prev, expiry_date: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={uploading}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={uploadData.visible_to_support_worker}
                  onChange={(e) => setUploadData(prev => ({ 
                    ...prev, 
                    visible_to_support_worker: e.target.checked 
                  }))}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={uploading}
                />
                <span className="text-sm text-gray-700 flex items-center">
                  {uploadData.visible_to_support_worker ? (
                    <Eye size={16} className="mr-1" />
                  ) : (
                    <EyeOff size={16} className="mr-1" />
                  )}
                  Visible to assigned support workers
                </span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={uploadData.requires_approval}
                  onChange={(e) => setUploadData(prev => ({ 
                    ...prev, 
                    requires_approval: e.target.checked 
                  }))}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={uploading}
                />
                <span className="text-sm text-gray-700">
                  Requires approval before activation
                </span>
              </label>
            </div>
          </div>

          {/* Upload Progress Summary */}
          {uploading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                <div>
                  <p className="text-sm font-medium text-blue-800">Uploading Documents</p>
                  <p className="text-sm text-blue-600">
                    {uploadedFiles.filter(f => f.completed).length} of {uploadedFiles.length} files completed
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || uploadedFiles.length === 0 || !uploadData.title || !uploadData.category}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Upload {uploadedFiles.length} Document{uploadedFiles.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};