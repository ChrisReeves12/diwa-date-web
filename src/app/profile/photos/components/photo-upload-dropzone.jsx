"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhotoUploadDropzone = PhotoUploadDropzone;
const react_1 = require("react");
const image_processing_1 = require("@/lib/image-processing");
function PhotoUploadDropzone({ onFilesSelected, disabled = false, maxPhotos = 10, currentPhotoCount = 0 }) {
    const [isDragOver, setIsDragOver] = (0, react_1.useState)(false);
    const [errors, setErrors] = (0, react_1.useState)([]);
    const remainingSlots = maxPhotos - currentPhotoCount;
    const isAtLimit = remainingSlots <= 0;
    const handleFiles = (0, react_1.useCallback)((files) => {
        const fileArray = Array.from(files);
        const validFiles = [];
        const newErrors = [];
        // Check if adding these files would exceed the limit
        if (fileArray.length > remainingSlots) {
            newErrors.push(`You can only upload ${remainingSlots} more photo${remainingSlots === 1 ? '' : 's'}. Maximum is ${maxPhotos} photos.`);
            setErrors(newErrors);
            return;
        }
        // Validate each file
        fileArray.forEach((file, index) => {
            const validation = (0, image_processing_1.validateImageFile)(file);
            if (validation.isValid) {
                validFiles.push(file);
            }
            else {
                newErrors.push(`File ${index + 1}: ${validation.error}`);
            }
        });
        setErrors(newErrors);
        if (validFiles.length > 0) {
            onFilesSelected(validFiles);
        }
    }, [onFilesSelected, remainingSlots, maxPhotos]);
    const handleDragOver = (0, react_1.useCallback)((e) => {
        e.preventDefault();
        if (!disabled && !isAtLimit) {
            setIsDragOver(true);
        }
    }, [disabled, isAtLimit]);
    const handleDragLeave = (0, react_1.useCallback)((e) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);
    const handleDrop = (0, react_1.useCallback)((e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (disabled || isAtLimit)
            return;
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFiles(files);
        }
    }, [disabled, isAtLimit, handleFiles]);
    const handleFileInput = (0, react_1.useCallback)((e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFiles(files);
        }
        // Reset the input value so the same file can be selected again
        e.target.value = '';
    }, [handleFiles]);
    const handleClick = (0, react_1.useCallback)(() => {
        if (disabled || isAtLimit)
            return;
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'image/jpeg,image/jpg,image/png,image/gif,image/webp';
        input.onchange = (e) => {
            const target = e.target;
            if (target.files && target.files.length > 0) {
                handleFiles(target.files);
            }
        };
        input.click();
    }, [disabled, isAtLimit, handleFiles]);
    return (<div className="photo-upload-dropzone">
      <div className={`dropzone ${isDragOver ? 'drag-over' : ''} ${disabled || isAtLimit ? 'disabled' : ''}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={handleClick}>
        <div className="dropzone-content">
          <div className="upload-icon">
            <img src="/images/upload-dropzone-icon.png" alt="Upload" width={64} height={64}/>
          </div>
          
          {isAtLimit ? (<div className="limit-reached">
              <h3>Photo Limit Reached</h3>
              <p>You have uploaded the maximum of {maxPhotos} photos.</p>
              <p>Delete some photos to upload new ones.</p>
            </div>) : (<div className="upload-instructions">
              <h3>Upload Photos</h3>
              <p>Drag and drop photos here, or click to select files</p>
              <p className="file-info">
                JPEG, PNG, GIF, WebP • Max 15MB each • {remainingSlots} slot{remainingSlots === 1 ? '' : 's'} remaining
              </p>
            </div>)}
        </div>
      </div>

      {errors.length > 0 && (<div className="upload-errors">
          {errors.map((error, index) => (<div key={index} className="error-message">
              {error}
            </div>))}
        </div>)}
    </div>);
}
//# sourceMappingURL=photo-upload-dropzone.jsx.map