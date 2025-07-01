export interface UploadProgress {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'processing' | 'uploading' | 'success' | 'error';
  error?: string;
  s3Key?: string;
  fileId?: string;
  uploadUrl?: string;
  dataUrl?: string;
  caption?: string;
}

export interface PhotoWithUrl {
  path: string;
  caption?: string;
  isHidden: boolean;
  sortOrder: number;
  uploadedAt: string;
  url: string | null;
}
