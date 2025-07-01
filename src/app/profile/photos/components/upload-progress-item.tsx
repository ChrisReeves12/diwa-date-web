'use client';

import { UploadProgress } from '@/types/upload-progress.interface';

interface UploadProgressItemProps {
  upload: UploadProgress;
  onRetry?: (uploadId: string) => void;
  onCancel?: (uploadId: string) => void;
}

export function UploadProgressItem({ upload, onRetry, onCancel }: UploadProgressItemProps) {
  const getStatusText = () => {
    switch (upload.status) {
      case 'pending':
        return 'Preparing...';
      case 'processing':
        return 'Processing image...';
      case 'uploading':
        return `Uploading... ${Math.round(upload.progress)}%`;
      case 'success':
        return 'Upload complete!';
      case 'error':
        return upload.error || 'Upload failed';
      default:
        return 'Unknown status';
    }
  };

  const getStatusIcon = () => {
    switch (upload.status) {
      case 'pending':
      case 'processing':
      case 'uploading':
        return <i className="las la-spinner la-spin"></i>;
      case 'success':
        return <i className="las la-check-circle" style={{ color: 'var(--success-color, #4caf50)' }}></i>;
      case 'error':
        return <i className="las la-exclamation-circle" style={{ color: 'var(--error-color, #f44336)' }}></i>;
      default:
        return null;
    }
  };

  return (
    <div className={`upload-progress-item ${upload.status}`}>
      <div className="upload-preview">
        {upload.dataUrl ? (
          <img src={upload.dataUrl} alt="Upload preview" />
        ) : (
          <div className="no-preview">
            <i className="las la-image"></i>
          </div>
        )}
      </div>

      <div className="upload-details">
        <div className="file-name">{upload.file.name}</div>
        <div className="file-size">
          {(upload.file.size / (1024 * 1024)).toFixed(1)} MB
        </div>
        
        <div className="status-container">
          <div className="status-text">
            {getStatusIcon()}
            <span>{getStatusText()}</span>
          </div>
          
          {upload.status === 'uploading' && (
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${upload.progress}%` }}
              ></div>
            </div>
          )}
        </div>
      </div>

      <div className="upload-actions">
        {upload.status === 'error' && onRetry && (
          <button 
            className="btn-retry"
            onClick={() => onRetry(upload.id)}
            title="Retry upload"
          >
            <i className="las la-redo-alt"></i>
          </button>
        )}
        
        {(upload.status === 'pending' || upload.status === 'processing' || upload.status === 'uploading' || upload.status === 'error') && onCancel && (
          <button 
            className="btn-cancel"
            onClick={() => onCancel(upload.id)}
            title="Cancel upload"
          >
            <i className="las la-times"></i>
          </button>
        )}
      </div>
    </div>
  );
}
