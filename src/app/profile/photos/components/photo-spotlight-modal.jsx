"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhotoSpotlightModal = PhotoSpotlightModal;
require("./photo-spotlight-modal.scss");
const react_1 = require("react");
const image_cropper_1 = require("./image-cropper");
const image_processing_1 = require("@/lib/image-processing");
function PhotoSpotlightModal({ isOpen, photo, onClose, onEdit, onDelete, onMakeMain, onCropComplete, onPhotoReplaced, onCaptionUpdate, isMainPhoto = false }) {
    const [imageLoaded, setImageLoaded] = (0, react_1.useState)(false);
    const [isEditMode, setIsEditMode] = (0, react_1.useState)(false);
    const [imageFile, setImageFile] = (0, react_1.useState)(null);
    const [cropArea, setCropArea] = (0, react_1.useState)({ x: 0, y: 0, width: 0, height: 0 });
    const [selectedAspectRatio, setSelectedAspectRatio] = (0, react_1.useState)(image_processing_1.ASPECT_RATIOS.SQUARE);
    const [preview, setPreview] = (0, react_1.useState)(null);
    const [isProcessing, setIsProcessing] = (0, react_1.useState)(false);
    const [caption, setCaption] = (0, react_1.useState)('');
    const [isEditingCaption, setIsEditingCaption] = (0, react_1.useState)(false);
    const [originalCaption, setOriginalCaption] = (0, react_1.useState)('');
    (0, react_1.useEffect)(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);
    (0, react_1.useEffect)(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                if (isEditMode) {
                    setIsEditMode(false);
                }
                else {
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
    (0, react_1.useEffect)(() => {
        if (photo) {
            const photoCaption = photo.caption || '';
            setCaption(photoCaption);
            setOriginalCaption(photoCaption);
            setIsEditingCaption(false);
        }
    }, [photo]);
    // Load image file when entering edit mode
    (0, react_1.useEffect)(() => {
        if (isEditMode && (photo === null || photo === void 0 ? void 0 : photo.url) && !imageFile) {
            loadImageFromUrl(photo.url);
        }
    }, [isEditMode, photo === null || photo === void 0 ? void 0 : photo.url, imageFile]);
    const loadImageFromUrl = async (url) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const file = new File([blob], 'photo.jpg', { type: blob.type });
            setImageFile(file);
        }
        catch (error) {
            console.error('Failed to load image for editing:', error);
        }
    };
    const handleCropAreaChange = (0, react_1.useCallback)((newCropArea) => {
        setCropArea(newCropArea);
        if (imageFile && newCropArea.width > 0 && newCropArea.height > 0) {
            (0, image_processing_1.getCropPreview)(imageFile, newCropArea)
                .then(setPreview)
                .catch(console.error);
        }
    }, [imageFile]);
    const handleAspectRatioChange = (0, react_1.useCallback)((ratio) => {
        setSelectedAspectRatio(ratio);
    }, []);
    const handleSaveCrop = async () => {
        if (!imageFile || cropArea.width === 0 || cropArea.height === 0 || !photo) {
            return;
        }
        try {
            setIsProcessing(true);
            const processedImage = await (0, image_processing_1.cropImage)(imageFile, cropArea);
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
        }
        catch (error) {
            console.error('Failed to replace photo:', error);
            alert('Failed to replace photo. Please try again.');
        }
        finally {
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
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget && !isEditMode) {
            onClose();
        }
    };
    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this photo?')) {
            onDelete === null || onDelete === void 0 ? void 0 : onDelete();
            onClose();
        }
    };
    const handleMakeMain = () => {
        onMakeMain === null || onMakeMain === void 0 ? void 0 : onMakeMain();
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
        if (!photo)
            return;
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
        }
        catch (error) {
            console.error('Update caption error:', error);
            alert('Failed to update caption. Please try again.');
            setCaption(originalCaption);
            setIsEditingCaption(false);
        }
    };
    const handleCaptionChange = (e) => {
        const value = e.target.value;
        if (value.length <= 200) {
            setCaption(value);
        }
    };
    return (<div className="photo-spotlight-overlay" onClick={handleBackdropClick}>
      <div className={`photo-spotlight-modal ${isEditMode ? 'edit-mode' : ''}`}>
        {/* Header */}
        <div className="spotlight-header">
          <div className="photo-info">
            {!isEditMode && isMainPhoto && (<div className="main-photo-indicator">
                <i className="las la-star"></i>
                <span>Main Photo</span>
              </div>)}
            {!isEditMode && (<div className="upload-date">
                Uploaded {new Date(photo.uploadedAt).toLocaleDateString()}
              </div>)}
            {isEditMode && (<div className="edit-mode-title">
                <i className="las la-crop"></i>
                <span>Crop Photo</span>
              </div>)}
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
              {!imageLoaded && (<div className="photo-loading">
                  <i className="las la-spinner la-spin"></i>
                  <p>Loading photo...</p>
                </div>)}
              
              <img src={photo.url || ''} alt="Photo preview" onLoad={() => setImageLoaded(true)} style={{ display: imageLoaded ? 'block' : 'none' }}/>
            </>) : (
        // Edit Mode
        <div className="edit-container">
              {imageFile ? (<div className="crop-section">
                  <image_cropper_1.ImageCropper imageFile={imageFile} aspectRatio={selectedAspectRatio} onCropChange={handleCropAreaChange}/>
                </div>) : (<div className="loading-image">
                  <i className="las la-spinner la-spin"></i>
                  <p>Loading image for editing...</p>
                </div>)}
            </div>)}
        </div>

        {/* Edit Mode Controls */}
        {isEditMode && (<div className="edit-controls">
            <div className="aspect-ratio-controls">
              <label>Aspect Ratio:</label>
              <div className="ratio-buttons">
                <button className={selectedAspectRatio === image_processing_1.ASPECT_RATIOS.SQUARE ? 'active' : ''} onClick={() => handleAspectRatioChange(image_processing_1.ASPECT_RATIOS.SQUARE)}>
                  Square
                </button>
                <button className={selectedAspectRatio === image_processing_1.ASPECT_RATIOS.LANDSCAPE ? 'active' : ''} onClick={() => handleAspectRatioChange(image_processing_1.ASPECT_RATIOS.LANDSCAPE)}>
                  Landscape
                </button>
              </div>
            </div>

            {preview && (<div className="crop-preview">
                <label>Preview:</label>
                <div className="preview-container">
                  <img src={preview} alt="Crop preview"/>
                </div>
              </div>)}
          </div>)}

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
                
                {onCropComplete && (<button className="action-btn edit-btn" onClick={handleStartEdit}>
                    <i className="las la-crop"></i>
                    <span>Crop Photo</span>
                  </button>)}
              </div>

              <div className="action-group">
                {!isMainPhoto && onMakeMain && (<button className="action-btn main-btn" onClick={handleMakeMain}>
                    <i className="las la-star"></i>
                    <span>Make Main</span>
                  </button>)}
                
                {onDelete && (<button className="action-btn delete-btn" onClick={handleDelete}>
                    <i className="las la-trash"></i>
                    <span>Delete</span>
                  </button>)}
              </div>
            </>) : (
        // Edit Mode Actions
        <div className="edit-actions">
              <button className="action-btn cancel-btn" onClick={handleCancelEdit} disabled={isProcessing}>
                <i className="las la-times"></i>
                <span>Cancel</span>
              </button>
              
              <button className="action-btn save-btn" onClick={handleSaveCrop} disabled={isProcessing || cropArea.width === 0}>
                {isProcessing ? (<>
                    <i className="las la-spinner la-spin"></i>
                    <span>Processing...</span>
                  </>) : (<>
                    <i className="las la-check"></i>
                    <span>Save Crop</span>
                  </>)}
              </button>
            </div>)}
        </div>

        {/* Photo Caption */}
        {!isEditMode && (<div className="spotlight-caption">
            {isEditingCaption ? (<div className="caption-edit">
                <div className="caption-edit-header">
                  <label>Photo Caption</label>
                  <span className="character-count">{caption.length}/200</span>
                </div>
                <textarea value={caption} onChange={handleCaptionChange} placeholder="Add a caption to your photo..." maxLength={200} rows={3}/>
                <div className="caption-edit-actions">
                  <button className="caption-btn cancel-btn" onClick={handleCancelCaptionEdit}>
                    Cancel
                  </button>
                  <button className="caption-btn save-btn" onClick={handleSaveCaption}>
                    Save
                  </button>
                </div>
              </div>) : (<div className="caption-display">
                {caption ? (<div className="caption-content">
                    <p>{caption}</p>
                    <button className="edit-caption-btn" onClick={handleStartCaptionEdit} title="Edit caption">
                      <i className="las la-edit"></i>
                    </button>
                  </div>) : (<div className="no-caption">
                    <button className="add-caption-btn" onClick={handleStartCaptionEdit}>
                      <i className="las la-plus"></i>
                      <span>Add a caption</span>
                    </button>
                  </div>)}
              </div>)}
          </div>)}
      </div>
    </div>);
}
//# sourceMappingURL=photo-spotlight-modal.jsx.map