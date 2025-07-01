"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhotosManagement = PhotosManagement;
require("./photos-management.scss");
const react_1 = require("react");
const photo_upload_dropzone_1 = require("./components/photo-upload-dropzone");
const upload_progress_item_1 = require("./components/upload-progress-item");
const photo_grid_item_1 = require("./components/photo-grid-item");
const crop_modal_1 = require("./components/crop-modal");
const photo_spotlight_modal_1 = require("./components/photo-spotlight-modal");
const image_processing_1 = require("@/lib/image-processing");
const photos_actions_1 = require("./photos.actions");
const current_user_context_1 = require("@/common/context/current-user-context");
const uuid_1 = require("uuid");
const core_1 = require("@dnd-kit/core");
const sortable_1 = require("@dnd-kit/sortable");
function PhotosManagement({ currentUser }) {
    const [photos, setPhotos] = (0, react_1.useState)([]);
    const [mainPhoto, setMainPhoto] = (0, react_1.useState)(null);
    const [uploads, setUploads] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [fixingPermissions, setFixingPermissions] = (0, react_1.useState)(false);
    const [cropModalOpen, setCropModalOpen] = (0, react_1.useState)(false);
    const [fileToProcess, setFileToProcess] = (0, react_1.useState)(null);
    const [spotlightModalOpen, setSpotlightModalOpen] = (0, react_1.useState)(false);
    const [selectedPhoto, setSelectedPhoto] = (0, react_1.useState)(null);
    // Get current user context for updating user data
    const { refreshUser } = (0, current_user_context_1.useCurrentUserContext)();
    const sensors = (0, core_1.useSensors)((0, core_1.useSensor)(core_1.PointerSensor), (0, core_1.useSensor)(core_1.KeyboardSensor, {
        coordinateGetter: sortable_1.sortableKeyboardCoordinates,
    }));
    // Load user photos on component mount
    (0, react_1.useEffect)(() => {
        loadPhotos();
    }, []);
    const loadPhotos = async () => {
        try {
            setLoading(true);
            const result = await (0, photos_actions_1.getUserPhotos)();
            setPhotos(result.photos);
            setMainPhoto(result.mainPhoto || null);
        }
        catch (err) {
            setError('Failed to load photos');
            console.error('Load photos error:', err);
        }
        finally {
            setLoading(false);
        }
    };
    const handleFilesSelected = (0, react_1.useCallback)(async (files) => {
        // For now, handle one file at a time with cropping
        if (files.length > 0) {
            setFileToProcess(files[0]);
            setCropModalOpen(true);
        }
    }, []);
    const handleCropComplete = (0, react_1.useCallback)(async (croppedFile, caption) => {
        const upload = {
            id: (0, uuid_1.v4)(),
            file: croppedFile,
            progress: 0,
            status: 'pending',
            caption: caption || '',
        };
        setUploads(prev => [...prev, upload]);
        await processUpload(upload);
    }, []);
    const handleCropModalClose = (0, react_1.useCallback)(() => {
        setCropModalOpen(false);
        setFileToProcess(null);
    }, []);
    const handlePhotoClick = (0, react_1.useCallback)((photo) => {
        setSelectedPhoto(photo);
        setSpotlightModalOpen(true);
    }, []);
    const handleSpotlightModalClose = (0, react_1.useCallback)(() => {
        setSpotlightModalOpen(false);
        setSelectedPhoto(null);
    }, []);
    const handlePhotoReplaced = (0, react_1.useCallback)(async () => {
        // Reload photos to show the updated photo
        await loadPhotos();
        // Refresh user context to update profile photos in notification center
        await refreshUser();
    }, [refreshUser]);
    const processUpload = async (upload) => {
        try {
            // Update status to processing
            updateUploadStatus(upload.id, { status: 'processing' });
            // Process the image
            const processedImage = await (0, image_processing_1.processImage)(upload.file);
            updateUploadStatus(upload.id, {
                status: 'uploading',
                dataUrl: processedImage.dataUrl
            });
            // Create form data for server upload
            const formData = new FormData();
            formData.append('file', processedImage.file);
            formData.append('caption', upload.caption || '');
            // Upload directly to our server (which handles S3 upload)
            const uploadResponse = await fetch('/api/photos/upload', {
                method: 'POST',
                body: formData,
            });
            if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json();
                throw new Error(errorData.error || 'Failed to upload photo');
            }
            const result = await uploadResponse.json();
            updateUploadStatus(upload.id, {
                status: 'success',
                progress: 100
            });
            // Reload photos to show the new upload
            await loadPhotos();
            // Refresh user context to update profile photos in notification center
            await refreshUser();
            // Remove successful upload from list after a delay
            setTimeout(() => {
                setUploads(prev => prev.filter(u => u.id !== upload.id));
            }, 2000);
        }
        catch (error) {
            console.error('Upload error:', error);
            updateUploadStatus(upload.id, {
                status: 'error',
                error: error instanceof Error ? error.message : 'Upload failed'
            });
        }
    };
    const uploadToS3 = async (file, uploadUrl, uploadId) => {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const progress = (event.loaded / event.total) * 100;
                    updateUploadStatus(uploadId, { progress });
                }
            });
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve();
                }
                else {
                    reject(new Error(`Upload failed with status ${xhr.status}`));
                }
            });
            xhr.addEventListener('error', () => {
                reject(new Error('Upload failed'));
            });
            xhr.open('PUT', uploadUrl);
            xhr.setRequestHeader('Content-Type', file.type);
            xhr.send(file);
        });
    };
    const updateUploadStatus = (uploadId, updates) => {
        setUploads(prev => prev.map(upload => upload.id === uploadId ? Object.assign(Object.assign({}, upload), updates) : upload));
    };
    const handleRetryUpload = (uploadId) => {
        const upload = uploads.find(u => u.id === uploadId);
        if (upload) {
            updateUploadStatus(uploadId, {
                status: 'pending',
                progress: 0,
                error: undefined
            });
            processUpload(upload);
        }
    };
    const handleCancelUpload = (uploadId) => {
        setUploads(prev => prev.filter(u => u.id !== uploadId));
    };
    const handleDeletePhoto = async (photoPath) => {
        try {
            const response = await fetch('/api/photos/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ photoPath }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete photo');
            }
            // Reload photos
            await loadPhotos();
        }
        catch (error) {
            console.error('Delete photo error:', error);
            alert('Failed to delete photo. Please try again.');
        }
    };
    const handleMakeMainPhoto = async (photoPath) => {
        try {
            // Reorder photos to put this one first
            const currentPhotos = [...photos];
            const photoIndex = currentPhotos.findIndex(p => p.path === photoPath);
            if (photoIndex > 0) {
                // Move the selected photo to the first position
                const [photo] = currentPhotos.splice(photoIndex, 1);
                currentPhotos.unshift(photo);
                // Update the local state immediately for better UX
                setPhotos(currentPhotos);
                setMainPhoto(photoPath);
                // Send reorder request to server
                const photoOrder = currentPhotos.map(p => p.path);
                await reorderPhotos(photoOrder);
                // Refresh user context to update profile photos in notification center
                await refreshUser();
            }
            else if (photoIndex === 0) {
                // Photo is already first, just update main photo if needed
                if (mainPhoto !== photoPath) {
                    setMainPhoto(photoPath);
                    // Still need to call reorder to update the server
                    const photoOrder = currentPhotos.map(p => p.path);
                    await reorderPhotos(photoOrder);
                    // Refresh user context to update profile photos in notification center
                    await refreshUser();
                }
            }
        }
        catch (error) {
            console.error('Make main photo error:', error);
            alert('Failed to set main photo. Please try again.');
            // Reload photos to revert any optimistic updates
            await loadPhotos();
        }
    };
    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = photos.findIndex(photo => photo.path === active.id);
            const newIndex = photos.findIndex(photo => photo.path === over.id);
            const newPhotos = (0, sortable_1.arrayMove)(photos, oldIndex, newIndex);
            setPhotos(newPhotos);
            // Send reorder request to server
            const photoOrder = newPhotos.map(photo => photo.path);
            await reorderPhotos(photoOrder);
            // If the first photo changed, refresh user context
            if (newIndex === 0 || oldIndex === 0) {
                await refreshUser();
            }
        }
    };
    const reorderPhotos = async (photoOrder) => {
        try {
            const response = await fetch('/api/photos/reorder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ photoOrder }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to reorder photos');
            }
            const result = await response.json();
            setMainPhoto(result.mainPhoto);
        }
        catch (error) {
            console.error('Reorder photos error:', error);
            // Reload photos to revert changes
            await loadPhotos();
        }
    };
    const handleFixPermissions = async () => {
        try {
            setFixingPermissions(true);
            const response = await fetch('/api/photos/fix-permissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fix photo permissions');
            }
            const result = await response.json();
            alert(`Successfully fixed permissions for ${result.fixedCount} photos!`);
            // Reload photos to refresh URLs
            await loadPhotos();
        }
        catch (error) {
            console.error('Fix permissions error:', error);
            alert('Failed to fix photo permissions. Please try again.');
        }
        finally {
            setFixingPermissions(false);
        }
    };
    if (loading) {
        return (<div className="photos-management">
                <div className="loading-state">
                    <i className="las la-spinner la-spin"></i>
                    <p>Loading photos...</p>
                </div>
            </div>);
    }
    return (<div className="photos-management">
            <div className="photos-header">
                <div className="header-content">
                    <h2>Photo Management</h2>
                    <p>Upload and manage your profile photos. The first photo will be your main profile photo.</p>
                </div>
                <div className="header-actions">
                    <button className="fix-permissions-btn" onClick={handleFixPermissions} disabled={fixingPermissions}>
                        {fixingPermissions ? (<>
                                <i className="las la-spinner la-spin"></i>
                                Fixing...
                            </>) : (<>
                                <i className="las la-shield-alt"></i>
                                Fix Photo Permissions
                            </>)}
                    </button>
                </div>
            </div>

            {error && (<div className="error-message">
                    {error}
                    <button onClick={loadPhotos}>Retry</button>
                </div>)}

            {/* Upload Section */}
            <div className="upload-section">
                <photo_upload_dropzone_1.PhotoUploadDropzone onFilesSelected={handleFilesSelected} maxPhotos={10} currentPhotoCount={photos.length}/>

                {/* Upload Progress */}
                {uploads.length > 0 && (<div className="upload-progress-section">
                        <h3>Uploading Photos</h3>
                        <div className="upload-progress-list">
                            {uploads.map(upload => (<upload_progress_item_1.UploadProgressItem key={upload.id} upload={upload} onRetry={handleRetryUpload} onCancel={handleCancelUpload}/>))}
                        </div>
                    </div>)}
            </div>

            {/* Photos Grid */}
            {photos.length > 0 && (<div className="photos-grid-section">
                    <h3>Your Photos ({photos.length}/10)</h3>
                    <p className="grid-instructions">
                        Drag photos to reorder them. The first photo is your main profile photo.
                    </p>
                    
                    <core_1.DndContext sensors={sensors} collisionDetection={core_1.closestCenter} onDragEnd={handleDragEnd}>
                        <sortable_1.SortableContext items={photos.map(p => p.path)} strategy={sortable_1.rectSortingStrategy}>
                            <div className="photos-grid">
                                {photos.map((photo) => (<photo_grid_item_1.PhotoGridItem key={photo.path} photo={photo} isMainPhoto={photo.path === mainPhoto} onDelete={handleDeletePhoto} onMakeMain={handleMakeMainPhoto} onPhotoClick={handlePhotoClick}/>))}
                            </div>
                        </sortable_1.SortableContext>
                    </core_1.DndContext>
                </div>)}

            {photos.length === 0 && !loading && (<div className="no-photos-state">
                    <div className="no-photos-icon">
                        <i className="las la-camera"></i>
                    </div>
                    <h3>No Photos Yet</h3>
                    <p>Upload your first photo to get started!</p>
                </div>)}

            {/* Crop Modal */}
            <crop_modal_1.CropModal isOpen={cropModalOpen} imageFile={fileToProcess} onClose={handleCropModalClose} onCropComplete={handleCropComplete}/>

            {/* Photo Spotlight Modal */}
            <photo_spotlight_modal_1.PhotoSpotlightModal isOpen={spotlightModalOpen} photo={selectedPhoto} onClose={handleSpotlightModalClose} onDelete={() => selectedPhoto && handleDeletePhoto(selectedPhoto.path)} onMakeMain={() => selectedPhoto && handleMakeMainPhoto(selectedPhoto.path)} onCropComplete={handleCropComplete} onPhotoReplaced={handlePhotoReplaced} onCaptionUpdate={loadPhotos} isMainPhoto={(selectedPhoto === null || selectedPhoto === void 0 ? void 0 : selectedPhoto.path) === mainPhoto}/>
        </div>);
}
//# sourceMappingURL=photos-management.jsx.map