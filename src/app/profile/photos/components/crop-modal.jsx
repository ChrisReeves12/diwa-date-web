"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.CropModal = CropModal;
require("./crop-modal.scss");
const react_1 = require("react");
const image_cropper_1 = require("./image-cropper");
const image_processing_1 = require("@/lib/image-processing");
function CropModal({ isOpen, imageFile, onClose, onCropComplete, initialAspectRatio = image_processing_1.ASPECT_RATIOS.SQUARE }) {
    const [cropArea, setCropArea] = (0, react_1.useState)({ x: 0, y: 0, width: 0, height: 0 });
    const [selectedAspectRatio, setSelectedAspectRatio] = (0, react_1.useState)(initialAspectRatio);
    const [preview, setPreview] = (0, react_1.useState)(null);
    const [isProcessing, setIsProcessing] = (0, react_1.useState)(false);
    const [caption, setCaption] = (0, react_1.useState)('');
    const handleCropChange = (0, react_1.useCallback)(async (newCropArea) => {
        setCropArea(newCropArea);
        // Generate preview
        if (imageFile) {
            try {
                const previewUrl = await (0, image_processing_1.getCropPreview)(imageFile, newCropArea, 200);
                setPreview(previewUrl);
            }
            catch (error) {
                console.error('Failed to generate preview:', error);
            }
        }
    }, [imageFile]);
    const handleAspectRatioChange = (ratio) => {
        setSelectedAspectRatio(ratio);
    };
    const handleCaptionChange = (e) => {
        const value = e.target.value;
        if (value.length <= 200) {
            setCaption(value);
        }
    };
    const handleCrop = async () => {
        if (!imageFile || !cropArea.width || !cropArea.height)
            return;
        setIsProcessing(true);
        try {
            const result = await (0, image_processing_1.cropImage)(imageFile, cropArea, {
                maxWidth: 2048,
                maxHeight: 2048,
                quality: 0.8
            });
            onCropComplete(result.file, caption.trim());
            onClose();
        }
        catch (error) {
            console.error('Failed to crop image:', error);
            alert('Failed to crop image. Please try again.');
        }
        finally {
            setIsProcessing(false);
        }
    };
    const handleCancel = () => {
        setCaption('');
        onClose();
    };
    if (!isOpen || !imageFile) {
        return null;
    }
    return (<div className="crop-modal-overlay">
      <div className="crop-modal">
        <div className="crop-modal-header">
          <h2>Crop Image</h2>
          <button className="close-button" onClick={handleCancel} disabled={isProcessing}>
            <i className="las la-times"></i>
          </button>
        </div>

        <div className="crop-modal-content">
          <div className="crop-controls">
            <div className="aspect-ratio-controls">
              <label>Aspect Ratio:</label>
              <div className="aspect-ratio-buttons">
                <button className={selectedAspectRatio === image_processing_1.ASPECT_RATIOS.SQUARE ? 'active' : ''} onClick={() => handleAspectRatioChange(image_processing_1.ASPECT_RATIOS.SQUARE)}>
                  Square (1:1)
                </button>
                <button className={selectedAspectRatio === image_processing_1.ASPECT_RATIOS.LANDSCAPE ? 'active' : ''} onClick={() => handleAspectRatioChange(image_processing_1.ASPECT_RATIOS.LANDSCAPE)}>
                  Landscape (4:3)
                </button>
              </div>
            </div>

            <div className="caption-controls">
              <div className="caption-header">
                <label>Photo Caption (Optional)</label>
                <span className="character-count">{caption.length}/200</span>
              </div>
              <textarea value={caption} onChange={handleCaptionChange} placeholder="Add a caption to your photo..." maxLength={200} rows={3}/>
            </div>
          </div>

          <div className="crop-workspace">
            <div className="crop-editor">
              <image_cropper_1.ImageCropper imageFile={imageFile} onCropChange={handleCropChange} aspectRatio={selectedAspectRatio}/>
            </div>

            <div className="crop-preview">
              <h3>Preview</h3>
              <div className="preview-container">
                {preview ? (<img src={preview} alt="Crop preview"/>) : (<div className="preview-placeholder">
                    <i className="las la-image"></i>
                    <p>Preview will appear here</p>
                  </div>)}
              </div>
              
              <div className="crop-info">
                <p>Crop Size: {Math.round(cropArea.width)} × {Math.round(cropArea.height)}px</p>
                {selectedAspectRatio && (<p>Aspect Ratio: {selectedAspectRatio === 1 ? '1:1' :
                selectedAspectRatio === 4 / 3 ? '4:3' :
                    selectedAspectRatio === 3 / 4 ? '3:4' :
                        selectedAspectRatio === 16 / 9 ? '16:9' :
                            selectedAspectRatio === 9 / 16 ? '9:16' : 'Custom'}</p>)}
              </div>
            </div>
          </div>
        </div>

        <div className="crop-modal-footer">
          <button className="btn-cancel" onClick={handleCancel} disabled={isProcessing}>
            Cancel
          </button>
          <button className="btn-crop" onClick={handleCrop} disabled={isProcessing || !cropArea.width || !cropArea.height}>
            {isProcessing ? (<>
                <i className="las la-spinner la-spin"></i>
                Processing...
              </>) : ('Crop & Upload')}
          </button>
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=crop-modal.jsx.map