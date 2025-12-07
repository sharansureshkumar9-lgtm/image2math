import React, { useCallback, useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, X, Plus, FileStack, FileText } from 'lucide-react';
import { UploadedFile } from '../types';

interface ImageUploaderProps {
  onImagesSelected: (files: UploadedFile[]) => void;
  onRemoveImage: (id: string) => void;
  images: UploadedFile[];
  compact?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImagesSelected, onRemoveImage, images, compact = false }) => {
  const [isDragging, setIsDragging] = useState(false);

  const processFiles = useCallback((fileList: FileList | File[]) => {
    const newFiles: UploadedFile[] = [];
    const filesArray = Array.from(fileList);
    
    let processedCount = 0;

    filesArray.forEach(file => {
      if (!file.type.startsWith('image/')) {
        processedCount++;
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const base64 = result.split(',')[1];
        
        newFiles.push({
          id: Math.random().toString(36).substring(7) + Date.now(),
          file,
          previewUrl: result,
          base64,
          mimeType: file.type
        });

        processedCount++;
        if (processedCount === filesArray.length) {
          onImagesSelected(newFiles);
        }
      };
      reader.readAsDataURL(file);
    });
  }, [onImagesSelected]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
      e.preventDefault();
      processFiles(e.clipboardData.files);
    }
  }, [processFiles]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    // Reset input so same file can be selected again if needed
    e.target.value = '';
  };

  const isCompact = compact || images.length > 0;

  return (
    <div className="flex flex-col space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`
          relative flex-shrink-0 w-full flex flex-col items-center justify-center 
          border border-dashed rounded-xl transition-all duration-300 cursor-pointer
          ${isCompact ? 'h-32' : 'h-64'}
          ${isDragging 
            ? 'border-gold-500 bg-gold-500/10 scale-[0.99] shadow-[0_0_20px_rgba(212,175,55,0.1)]' 
            : 'border-neutral-700 bg-neutral-900/50 hover:border-gold-500/50 hover:bg-neutral-800'
          }
        `}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        
        <div className="flex flex-col items-center space-y-3 text-center p-4">
          <div className={`p-3 rounded-full transition-colors ${isDragging ? 'bg-gold-500/20 text-gold-500' : 'bg-neutral-800 text-neutral-500 group-hover:text-gold-500'}`}>
            {isCompact ? <Plus size={24} /> : <FileStack size={32} />}
          </div>
          <div>
            <h3 className="text-base font-serif font-medium text-gray-200">
              {isCompact ? "Add more images" : "Drag & drop equation images here"}
            </h3>
            {!isCompact && (
              <p className="text-sm text-neutral-500 mt-2 font-light">
                Single or multiple files (PNG, JPG, JPEG, WEBP)
              </p>
            )}
          </div>
        </div>
      </div>

      {/* File List (Replacing Image Grid) */}
      {images.length > 0 && (
        <div className="mt-2 pr-2">
          <div className="flex flex-col space-y-2">
            {images.map((img, index) => (
              <div key={img.id} className="flex items-center justify-between p-3 bg-neutral-900/50 rounded-lg border border-neutral-800 hover:bg-neutral-900 transition-colors group">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="flex-shrink-0 w-10 h-10 rounded bg-neutral-800 flex items-center justify-center text-neutral-500 border border-neutral-700">
                     <FileText size={20} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm text-neutral-300 truncate font-medium max-w-[200px] sm:max-w-xs" title={img.file.name}>{img.file.name}</span>
                    <span className="text-xs text-neutral-500">{(img.file.size / 1024).toFixed(0)} KB</span>
                  </div>
                </div>
                <button 
                  onClick={() => onRemoveImage(img.id)}
                  className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-900/10 rounded-full transition-colors"
                  title="Remove file"
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};