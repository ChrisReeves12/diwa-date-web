'use client';

import './photos-management.scss';
import { User } from '@/types/user.interface';
import { useState, useEffect, useCallback } from 'react';
import { PhotoUploadDropzone } from './components/photo-upload-dropzone';
import { UploadProgressItem } from './components/upload-progress-item';
import { PhotoGridItem } from './components/photo-grid-item';
import { CropModal } from './components/crop-modal';
import { PhotoSpotlightModal } from './components/photo-spotlight-modal';
import { UploadProgress, PhotoWithUrl } from '@/types/upload-progress.interface';
import { processImage } from '@/lib/image-processing';
import { getUserPhotos } from './photos.actions';
import { useCurrentUserContext } from '@/common/context/current-user-context';
import { v4 as uuidv4 } from 'uuid';
import { showAlert } from '@/util';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
} from '@dnd-kit/sortable';

export function PhotosManagement() {
    const [photos, setPhotos] = useState<PhotoWithUrl[]>([]);
    const [mainPhoto, setMainPhoto] = useState<string | null>(null);
    const [uploads, setUploads] = useState<UploadProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [fileToProcess, setFileToProcess] = useState<File | null>(null);
    const [spotlightModalOpen, setSpotlightModalOpen] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState<PhotoWithUrl | null>(null);

    // Get current user context for updating user data
    const { refreshUser } = useCurrentUserContext();

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Load user photos on component mount
    useEffect(() => {
        loadPhotos();
    }, []);

    const loadPhotos = async () => {
        try {
            setLoading(true);
            const result = await getUserPhotos();
            setPhotos(result.photos);
            setMainPhoto(result.mainPhoto || null);
        } catch (err) {
            setError('Failed to load photos');
            console.error('Load photos error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFilesSelected = useCallback(async (files: File[]) => {
        // For now, handle one file at a time with cropping
        if (files.length > 0) {
            setFileToProcess(files[0]);
            setCropModalOpen(true);
        }
    }, []);

    const handleCropComplete = useCallback(async (croppedFile: File, caption?: string) => {
        const upload: UploadProgress = {
            id: uuidv4(),
            file: croppedFile,
            progress: 0,
            status: 'pending' as const,
            caption: caption || '',
        };

        setUploads(prev => [...prev, upload]);
        await processUpload(upload);
    }, []);

    const handleCropModalClose = useCallback(() => {
        setCropModalOpen(false);
        setFileToProcess(null);
    }, []);

    const handlePhotoClick = useCallback((photo: PhotoWithUrl) => {
        setSelectedPhoto(photo);
        setSpotlightModalOpen(true);
    }, []);

    const handleSpotlightModalClose = useCallback(() => {
        setSpotlightModalOpen(false);
        setSelectedPhoto(null);
    }, []);

    const handlePhotoReplaced = useCallback(async () => {
        // Reload photos to show the updated photo
        await loadPhotos();

        // Refresh user context to update profile photos in notification center
        await refreshUser();
    }, [refreshUser]);

    const processUpload = async (upload: UploadProgress) => {
        try {
            // Update status to processing
            updateUploadStatus(upload.id, { status: 'processing' });

            // Process the image
            const processedImage = await processImage(upload.file);

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

        } catch (error) {
            console.error('Upload error:', error);
            updateUploadStatus(upload.id, {
                status: 'error',
                error: error instanceof Error ? error.message : 'Upload failed'
            });
        }
    };

    const updateUploadStatus = (uploadId: string, updates: Partial<UploadProgress>) => {
        setUploads(prev => prev.map(upload =>
            upload.id === uploadId ? { ...upload, ...updates } : upload
        ));
    };

    const handleRetryUpload = (uploadId: string) => {
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

    const handleCancelUpload = (uploadId: string) => {
        setUploads(prev => prev.filter(u => u.id !== uploadId));
    };

    const handleDeletePhoto = async (photoPath: string) => {
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
        } catch (error) {
            console.error('Delete photo error:', error);
            showAlert('Failed to delete photo. Please try again.');
        }
    };

    const handleMakeMainPhoto = async (photoPath: string) => {
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
            } else if (photoIndex === 0) {
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
        } catch (error) {
            console.error('Make main photo error:', error);
            showAlert('Failed to set main photo. Please try again.');
            // Reload photos to revert any optimistic updates
            await loadPhotos();
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = photos.findIndex(photo => photo.path === active.id);
            const newIndex = photos.findIndex(photo => photo.path === over.id);

            const newPhotos = arrayMove(photos, oldIndex, newIndex);
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

    const reorderPhotos = async (photoOrder: string[]) => {
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
        } catch (error) {
            console.error('Reorder photos error:', error);
            // Reload photos to revert changes
            await loadPhotos();
        }
    };

    const handleFixPermissions = async () => {
        try {
            const response = await fetch('/api/photos/fix-permissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fix photo permissions');
            }

            const result = await response.json();
            showAlert(`Successfully fixed permissions for ${result.fixedCount} photos!`);

            // Reload photos to refresh URLs
            await loadPhotos();
        } catch (error) {
            console.error('Fix permissions error:', error);
            showAlert('Failed to fix photo permissions. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="photos-management">
                <div className="loading-state">
                    <i className="las la-spinner la-spin"></i>
                    <p>Loading photos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="photos-management">
            {error && (
                <div className="error-message">
                    {error}
                    <button onClick={loadPhotos}>Retry</button>
                </div>
            )}

            {/* Upload Section */}
            <div className="upload-section">
                <PhotoUploadDropzone
                    onFilesSelected={handleFilesSelected}
                    maxPhotos={10}
                    currentPhotoCount={photos.length}
                />

                {/* Upload Progress */}
                {uploads.length > 0 && (
                    <div className="upload-progress-section">
                        <h3>Uploading Photos</h3>
                        <div className="upload-progress-list">
                            {uploads.map(upload => (
                                <UploadProgressItem
                                    key={upload.id}
                                    upload={upload}
                                    onRetry={handleRetryUpload}
                                    onCancel={handleCancelUpload}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Photos Grid */}
            {photos.length > 0 && (
                <div className="photos-grid-section">
                    <h3>Your Photos ({photos.length}/10)</h3>
                    <p className="grid-instructions">
                        Drag photos to reorder them. The first photo is your main profile photo.
                    </p>

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext items={photos.map(p => p.path)} strategy={rectSortingStrategy}>
                            <div className="photos-grid">
                                {photos.map((photo) => (
                                    <PhotoGridItem
                                        key={photo.path}
                                        photo={photo}
                                        isMainPhoto={photo.path === mainPhoto}
                                        onDelete={handleDeletePhoto}
                                        onMakeMain={handleMakeMainPhoto}
                                        onPhotoClick={handlePhotoClick}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>
            )}

            {photos.length === 0 && !loading && (
                <div className="no-photos-state">
                    <div className="no-photos-icon">
                        <i className="las la-camera"></i>
                    </div>
                    <h3>No Photos Yet</h3>
                    <p>Upload your first photo to get started!</p>
                </div>
            )}

            {/* Crop Modal */}
            <CropModal
                isOpen={cropModalOpen}
                imageFile={fileToProcess}
                onClose={handleCropModalClose}
                onCropComplete={handleCropComplete}
            />

            {/* Photo Spotlight Modal */}
            <PhotoSpotlightModal
                isOpen={spotlightModalOpen}
                photo={selectedPhoto}
                onClose={handleSpotlightModalClose}
                onDelete={() => selectedPhoto && handleDeletePhoto(selectedPhoto.path)}
                onMakeMain={() => selectedPhoto && handleMakeMainPhoto(selectedPhoto.path)}
                onCropComplete={handleCropComplete}
                onPhotoReplaced={handlePhotoReplaced}
                onCaptionUpdate={loadPhotos}
                isMainPhoto={selectedPhoto?.path === mainPhoto}
            />
        </div>
    );
}
