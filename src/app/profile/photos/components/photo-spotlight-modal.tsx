'use client';

import './photo-spotlight-modal.scss';
import { PhotoWithUrl } from '@/types/upload-progress.interface';
import { useState, useEffect, useCallback } from 'react';
import { ImageCropper } from './image-cropper';
import { CropArea, ASPECT_RATIOS, cropImage, getCropPreview } from '@/lib/image-processing';
import { showAlert } from '@/util';

interface PhotoSpotlightModalProps {
  isOpen: boolean;
  photo: PhotoWithUrl | null;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onMakeMain?: () => void;
  onCropComplete?: (croppedFile: File, caption?: string) => void;
  onPhotoReplaced?: () => void;
  onCaptionUpdate?: () => void;
  isMainPhoto?: boolean;
}

export function PhotoSpotlightModal({
  isOpen,
  photo,
  onClose,
  onEdit,
  onDelete,
  onMakeMain,
  onCropComplete,
  onPhotoReplaced,
  onCaptionUpdate,
  isMainPhoto = false
}: PhotoSpotlightModalProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 0, height: 0 });
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<number | undefined>(ASPECT_RATIOS.SQUARE);
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [caption, setCaption] = useState<string>('');
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [originalCaption, setOriginalCaption] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditMode) {
          setIsEditMode(false);
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, isEditMode, onClose]);

  // Initialize caption when photo changes
  useEffect(() => {
    if (photo) {
      const photoCaption = photo.caption || '';
      setCaption(photoCaption);
      setOriginalCaption(photoCaption);
      setIsEditingCaption(false);
    }
  }, [photo]);

  // Load image file when entering edit mode
  useEffect(() => {
    if (isEditMode && photo?.url && !imageFile) {
      loadImageFromUrl(photo.url);
    }
  }, [isEditMode, photo?.url, imageFile]);

  const loadImageFromUrl = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], 'photo.jpg', { type: blob.type });
      setImageFile(file);
    } catch (error) {
      console.error('Failed to load image for editing:', error);
    }
  };

  const handleCropAreaChange = useCallback((newCropArea: CropArea) => {
    setCropArea(newCropArea);

    if (imageFile && newCropArea.width > 0 && newCropArea.height > 0) {
      getCropPreview(imageFile, newCropArea)
        .then(setPreview)
        .catch(console.error);
    }
  }, [imageFile]);

  const handleAspectRatioChange = useCallback((ratio: number | undefined) => {
    setSelectedAspectRatio(ratio);
  }, []);

  const handleSaveCrop = async () => {
    if (!imageFile || cropArea.width === 0 || cropArea.height === 0 || !photo) {
      return;
    }

    try {
      setIsProcessing(true);
      const processedImage = await cropImage(imageFile, cropArea);

      // Use the replace API to replace the existing photo
      const formData = new FormData();
      formData.append('file', processedImage.file);
      formData.append('originalPhotoPath', photo.path);
      formData.append('caption', caption.trim());

      const response = await fetch('/api/photos/replace', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to replace photo');
      }

      const result = await response.json();

      // Notify parent component that photo was replaced
      if (onPhotoReplaced) {
        onPhotoReplaced();
      }

      setIsEditMode(false);
      onClose();
    } catch (error) {
      console.error('Failed to replace photo:', error);
      showAlert('Failed to replace photo. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setImageFile(null);
    setPreview(null);
    setCropArea({ x: 0, y: 0, width: 0, height: 0 });
  };

  if (!isOpen || !photo) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isEditMode) {
      onClose();
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this photo?')) {
      onDelete?.();
      onClose();
    }
  };

  const handleMakeMain = () => {
    onMakeMain?.();
    onClose();
  };

  const handleStartEdit = () => {
    setIsEditMode(true);
  };

  const handleStartCaptionEdit = () => {
    setIsEditingCaption(true);
  };

  const handleCancelCaptionEdit = () => {
    setCaption(originalCaption);
    setIsEditingCaption(false);
  };

  const handleSaveCaption = async () => {
    if (!photo) return;

    try {
      const response = await fetch('/api/photos/update-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoPath: photo.path,
          caption: caption.trim()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update caption');
      }

      setOriginalCaption(caption.trim());
      setIsEditingCaption(false);

      // Update the photo object with new caption
      if (photo) {
        photo.caption = caption.trim();
      }

      // Trigger refresh of photos list
      if (onCaptionUpdate) {
        onCaptionUpdate();
      }
    } catch (error) {
      console.error('Update caption error:', error);
      showAlert('Failed to update caption. Please try again.');
      setCaption(originalCaption);
      setIsEditingCaption(false);
    }
  };

  const handleCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= 200) {
      setCaption(value);
    }
  };

  return (
    <div className="photo-spotlight-overlay" onClick={handleBackdropClick}>
      <div className={`photo-spotlight-modal ${isEditMode ? 'edit-mode' : ''}`}>
        {/* Header */}
        <div className="spotlight-header">
          <div className="photo-info">
            {!isEditMode && isMainPhoto && (
              <div className="main-photo-indicator">
                <i className="las la-star"></i>
                <span>Main Photo</span>
              </div>
            )}
            {!isEditMode && (
              <div className="upload-date">
                Uploaded {new Date(photo.uploadedAt).toLocaleDateString()}
              </div>
            )}
            {isEditMode && (
              <div className="edit-mode-title">
                <i className="las la-crop"></i>
                <span>Crop Photo</span>
              </div>
            )}
          </div>

          <button className="close-button" onClick={isEditMode ? handleCancelEdit : onClose}>
            <i className="las la-times"></i>
          </button>
        </div>

        {/* Photo Container */}
        <div className="spotlight-photo-container">
          {!isEditMode ? (
            // Preview Mode
            <>
              {!imageLoaded && (
                <div className="photo-loading">
                  <i className="las la-spinner la-spin"></i>
                  <p>Loading photo...</p>
                </div>
              )}

              <img
                src={photo.url || ''}
                alt="Photo preview"
                onLoad={() => setImageLoaded(true)}
                style={{ display: imageLoaded ? 'block' : 'none' }}
              />
            </>
          ) : (
            // Edit Mode
            <div className="edit-container">
              {imageFile ? (
                <div className="crop-section">
                  <ImageCropper
                    imageFile={imageFile}
                    aspectRatio={selectedAspectRatio}
                    onCropChange={handleCropAreaChange}
                  />
                </div>
              ) : (
                <div className="loading-image">
                  <i className="las la-spinner la-spin"></i>
                  <p>Loading image for editing...</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Edit Mode Controls */}
        {isEditMode && (
          <div className="edit-controls">
            <div className="aspect-ratio-controls">
              <label>Aspect Ratio:</label>
              <div className="ratio-buttons">
                <button
                  className={selectedAspectRatio === ASPECT_RATIOS.SQUARE ? 'active' : ''}
                  onClick={() => handleAspectRatioChange(ASPECT_RATIOS.SQUARE)}
                >
                  Square
                </button>
                <button
                  className={selectedAspectRatio === ASPECT_RATIOS.LANDSCAPE ? 'active' : ''}
                  onClick={() => handleAspectRatioChange(ASPECT_RATIOS.LANDSCAPE)}
                >
                  Landscape
                </button>
              </div>
            </div>

            {preview && (
              <div className="crop-preview">
                <label>Preview:</label>
                <div className="preview-container">
                  <img src={preview} alt="Crop preview" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="spotlight-actions">
          {!isEditMode ? (
            // Preview Mode Actions
            <>
              <div className="action-group">
                <button className="action-btn preview-btn" onClick={onClose}>
                  <i className="las la-eye"></i>
                  <span>Profile View</span>
                </button>

                {onCropComplete && (
                  <button className="action-btn edit-btn" onClick={handleStartEdit}>
                    <i className="las la-crop"></i>
                    <span>Crop Photo</span>
                  </button>
                )}
              </div>

              <div className="action-group">
                {!isMainPhoto && onMakeMain && (
                  <button className="action-btn main-btn" onClick={handleMakeMain}>
                    <i className="las la-star"></i>
                    <span>Make Main</span>
                  </button>
                )}

                {onDelete && (
                  <button className="action-btn delete-btn" onClick={handleDelete}>
                    <i className="las la-trash"></i>
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            // Edit Mode Actions
            <div className="edit-actions">
              <button
                className="action-btn cancel-btn"
                onClick={handleCancelEdit}
                disabled={isProcessing}
              >
                <i className="las la-times"></i>
                <span>Cancel</span>
              </button>

              <button
                className="action-btn save-btn"
                onClick={handleSaveCrop}
                disabled={isProcessing || cropArea.width === 0}
              >
                {isProcessing ? (
                  <>
                    <i className="las la-spinner la-spin"></i>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <i className="las la-check"></i>
                    <span>Save Crop</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Photo Caption */}
        {!isEditMode && (
          <div className="spotlight-caption">
            {isEditingCaption ? (
              <div className="caption-edit">
                <div className="caption-edit-header">
                  <label>Photo Caption</label>
                  <span className="character-count">{caption.length}/200</span>
                </div>
                <textarea
                  value={caption}
                  onChange={handleCaptionChange}
                  placeholder="Add a caption to your photo..."
                  maxLength={200}
                  rows={3}
                />
                <div className="caption-edit-actions">
                  <button
                    className="caption-btn cancel-btn"
                    onClick={handleCancelCaptionEdit}
                  >
                    Cancel
                  </button>
                  <button
                    className="caption-btn save-btn"
                    onClick={handleSaveCaption}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="caption-display">
                {caption ? (
                  <div className="caption-content">
                    <p>{caption}</p>
                    <button
                      className="edit-caption-btn"
                      onClick={handleStartCaptionEdit}
                      title="Edit caption"
                    >
                      <i className="las la-edit"></i>
                    </button>
                  </div>
                ) : (
                  <div className="no-caption">
                    <button
                      className="add-caption-btn"
                      onClick={handleStartCaptionEdit}
                    >
                      <i className="las la-plus"></i>
                      <span>Add a caption</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
