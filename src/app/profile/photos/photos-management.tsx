'use client';

import './photos-management.scss';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PhotoWithUrl } from '@/types/upload-progress.interface';
import { getUserPhotos, saveCropData, uploadPhoto, deletePhoto, updatePhotoSortOrder } from './photos.actions';
import { showAlert } from '@/util';
import { Button, CircularProgress } from "@mui/material";
import { InfoCircleIcon, SaveIcon, TimesIcon, RedoIcon, EyeIcon } from "react-line-awesome";
import {
    DndContext,
    closestCenter,
    useSensor,
    useSensors, PointerSensor,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import {
    CSS,
} from '@dnd-kit/utilities';
import { Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { useWebSocket } from '@/hooks/use-websocket';

function SortablePhotoItem({photoWithUrl, onClick, onDelete}: {
    photoWithUrl: PhotoWithUrl,
    onClick: (e: React.MouseEvent) => void,
    onDelete: (e: React.MouseEvent) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({id: photoWithUrl.path});

    const style = {
        transform: CSS.Transform.toString(transform),
        transition
    };

    return (
        <div ref={setNodeRef}
             style={style}
             className={"photo-grid-item" + (photoWithUrl.isUnderReview ? " under-review" : "")}
             onClick={onClick}
             {...attributes}
             {...listeners}>
            <div className="photo-display-container" style={{backgroundImage: `url('${photoWithUrl.croppedImageUrl || photoWithUrl.url}')`}}></div>
            <button onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                onDelete(e);
            }} className="delete-button">
                <TimesIcon/>
            </button>
            {photoWithUrl.isUnderReview && <div className="under-review-label">Under Review</div>}
        </div>
    );
}

interface CropArea {
    x: number;
    y: number;
    width: number;
    height: number;
}

export function PhotosManagement() {
    const MAX_PHOTOS = 10;
    const [photos, setPhotos] = useState<PhotoWithUrl[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [imageBeingEdited, setImageBeingEdited] = useState<PhotoWithUrl | undefined>();
    const [imageToDelete, setImageToDelete] = useState<PhotoWithUrl | undefined>();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const sortTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    // Cropping state
    const [cropArea, setCropArea] = useState<CropArea>({x: 0, y: 0, width: 200, height: 200});
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [isSorting, setIsSorting] = useState(false);
    const [dragStart, setDragStart] = useState({x: 0, y: 0});
    const [resizeHandle, setResizeHandle] = useState('');
    const [imageSize, setImageSize] = useState({width: 0, height: 0});
    const [imageOffset, setImageOffset] = useState({x: 0, y: 0});
    const [captionText, setCaptionText] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
    const [isDeleting, setIsDeleting] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { on, isConnected } = useWebSocket();

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                delay: 150,
                tolerance: 5,
            },
        }),
    );

    // Load user photos
    useEffect(() => {
        loadPhotos();

        // Clean up any pending timeout on unmount
        return () => {
            if (sortTimeoutRef.current) {
                clearTimeout(sortTimeoutRef.current);
            }
        };
    }, []);

    // WebSocket event listeners for photo approval/rejection
    useEffect(() => {
        if (!isConnected) return;

        const handlePhotoApprovalEvents = (data: any) => {
            const approvedPhotos = data.payload?.data?.approvedPhotos || [];
            const rejectedPhotos = data.payload?.data?.rejectedPhotos || [];
            const approvedPhotoPaths = approvedPhotos.map((photo: any) => photo.path);
            const rejectedPhotoPaths = rejectedPhotos.map((photo: any) => photo.path);

            setPhotos(prevPhotos =>
                prevPhotos.map(photo => {
                    if (approvedPhotoPaths.includes(photo.path)) {
                        return {
                            ...photo,
                            isUnderReview: false,
                            isRejected: false
                        };
                    } else if (rejectedPhotoPaths.includes(photo.path)) {
                        const rejectedPhoto = rejectedPhotos.find((rp: any) => rp.path === photo.path);
                        return {
                            ...photo,
                            isUnderReview: false,
                            isRejected: true,
                            messages: rejectedPhoto?.messages || []
                        };
                    }

                    return photo;
                })
            );

            if (data.noticeType === 'account:photosNotApproved') {
                showAlert('Some of your photos were not approved and need attention.');
            }
        };

        const subscription = on('account:notification')
            .subscribe((data: any) => {
                if (['account:photosApproved', 'account:photosNotApproved'].includes(data.payload.noticeType)) {
                    handlePhotoApprovalEvents(data);
                }
            });

        return () => {
            subscription.unsubscribe();
        };
    }, [isConnected, on]);

    const loadPhotos = async () => {
        try {
            setIsLoading(true);
            const result = await getUserPhotos();
            setPhotos(result.photos);
        } catch (err) {
            showAlert('An error occurred while loading photos. Please try again later.');
            console.error('Load photos error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDragEnd = (e: any) => {
        const {active, over} = e;

        if (active.id !== over.id) {
            setPhotos((aPhotos) => {
                const oldIndex = aPhotos.findIndex(photo => photo.path === active.id);
                const newIndex = aPhotos.findIndex(photo => photo.path === over.id);
                let sortedPhotos = arrayMove(aPhotos, oldIndex, newIndex);

                if (!isSorting && !isDeleting && !isUploading && !isResizing) {
                    if (sortTimeoutRef.current) {
                        clearTimeout(sortTimeoutRef.current);
                    }

                    // Check if the first photo is under review, and re-sort if needed
                    if (sortedPhotos[0].isUnderReview) {
                        const firstNonReviewIndex = sortedPhotos.findIndex(photo => !photo.isUnderReview);

                        if (firstNonReviewIndex > 0) {
                            const firstNonReviewPhoto = sortedPhotos[firstNonReviewIndex];
                            sortedPhotos.splice(firstNonReviewIndex, 1);
                            sortedPhotos.unshift(firstNonReviewPhoto);
                        }
                    }

                    // Set new timeout and store the reference
                    sortTimeoutRef.current = setTimeout(() => {
                        setIsSorting(true);
                        updatePhotoSortOrder(sortedPhotos).finally(() => {
                            setIsSorting(false);
                            window.dispatchEvent(new CustomEvent('refresh-user-profile-main-photo'));
                            sortTimeoutRef.current = undefined;
                        });
                    }, 300);

                    return sortedPhotos
                } else {
                    return aPhotos;
                }
            });
        }
    }

    const handleEditImageClick = (photoWithUrl: PhotoWithUrl) => {
        setImageBeingEdited(photoWithUrl);
        setCaptionText(photoWithUrl.caption || '');
    }

    const handleImageDelete = (photoWithUrl: PhotoWithUrl) => {
        setImageToDelete(photoWithUrl);
    }

    const confirmImageDelete = async () => {
        if (!imageToDelete || isDeleting) return;

        setIsDeleting(true);
        try {
            const result = await deletePhoto(imageToDelete.path);

            if (result.success) {
                // Reload photos to get updated list
                await loadPhotos();
                // Dispatch event to refresh user profile main photo in notification center
                window.dispatchEvent(new CustomEvent('refresh-user-profile-main-photo'));
            }
        } catch (error) {
            console.error('Delete photo error:', error);
            showAlert('Failed to delete photo. Please try again.');
        } finally {
            setIsDeleting(false);
            setImageToDelete(undefined);
        }
    }

    const cancelImageDelete = () => {
        setImageToDelete(undefined);
    }

    // Initialize crop area when image loads
    const handleImageLoad = useCallback(() => {
        if (!imageRef.current || !containerRef.current) return;

        const img = imageRef.current;
        const container = containerRef.current;

        const imgWidth = img.naturalWidth;
        const imgHeight = img.naturalHeight;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // Calculate scale to fit image in container
        const scale = Math.min(containerWidth / imgWidth, containerHeight / imgHeight);
        const displayWidth = imgWidth * scale;
        const displayHeight = imgHeight * scale;

        // Calculate image offset (centering in container)
        const offsetX = (containerWidth - displayWidth) / 2;
        const offsetY = (containerHeight - displayHeight) / 2;

        setImageSize({width: displayWidth, height: displayHeight});
        setImageOffset({x: offsetX, y: offsetY});

        // Initialize crop area
        if (imageBeingEdited?.croppedImageData) {
            // Scale crop coordinates from original image size to displayed size
            const scaleX = displayWidth / img.naturalWidth;
            const scaleY = displayHeight / img.naturalHeight;

            const scaledCropArea = {
                x: offsetX + (imageBeingEdited.croppedImageData.x * scaleX),
                y: offsetY + (imageBeingEdited.croppedImageData.y * scaleY),
                width: imageBeingEdited.croppedImageData.width * scaleX,
                height: imageBeingEdited.croppedImageData.height * scaleY
            };

            setCropArea(scaledCropArea);
        } else {
            // Default crop area for new crops
            const cropSize = Math.min(displayWidth, displayHeight) * 0.8;
            setCropArea({
                x: offsetX + (displayWidth - cropSize) / 2,
                y: offsetY + (displayHeight - cropSize) / 2,
                width: cropSize,
                height: cropSize
            });
        }
    }, [imageBeingEdited]);


    // Handle touch/mouse events for dragging crop area
    const handlePointerDown = useCallback((e: React.PointerEvent, handle?: string) => {
        e.preventDefault();
        e.stopPropagation();

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (handle) {
            setIsResizing(true);
            setResizeHandle(handle);
        } else {
            setIsDragging(true);
        }

        setDragStart({x: x - cropArea.x, y: y - cropArea.y});
    }, [cropArea]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDragging && !isResizing) return;

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (isDragging) {
            // Move crop area within image bounds
            const newX = Math.max(imageOffset.x, Math.min(x - dragStart.x, imageOffset.x + imageSize.width - cropArea.width));
            const newY = Math.max(imageOffset.y, Math.min(y - dragStart.y, imageOffset.y + imageSize.height - cropArea.height));

            setCropArea(prev => ({...prev, x: newX, y: newY}));
        } else if (isResizing) {
            // Resize crop area
            const newCropArea = {...cropArea};
            const minSize = 50;

            switch (resizeHandle) {
                case 'nw':
                    newCropArea.width = Math.max(minSize, cropArea.width + (cropArea.x - x));
                    newCropArea.height = newCropArea.width; // Maintain aspect ratio
                    newCropArea.x = Math.max(imageOffset.x, cropArea.x + cropArea.width - newCropArea.width);
                    newCropArea.y = Math.max(imageOffset.y, cropArea.y + cropArea.height - newCropArea.height);
                    break;
                case 'ne':
                    newCropArea.width = Math.max(minSize, Math.min(x - cropArea.x, imageOffset.x + imageSize.width - cropArea.x));
                    newCropArea.height = newCropArea.width;
                    newCropArea.y = Math.max(imageOffset.y, cropArea.y + cropArea.height - newCropArea.height);
                    break;
                case 'sw':
                    newCropArea.width = Math.max(minSize, cropArea.width + (cropArea.x - x));
                    newCropArea.height = newCropArea.width;
                    newCropArea.x = Math.max(imageOffset.x, cropArea.x + cropArea.width - newCropArea.width);
                    break;
                case 'se':
                    newCropArea.width = Math.max(minSize, Math.min(x - cropArea.x, imageOffset.x + imageSize.width - cropArea.x));
                    newCropArea.height = newCropArea.width;
                    break;
            }

            // Ensure crop area stays within image bounds
            if (newCropArea.x + newCropArea.width > imageOffset.x + imageSize.width) {
                newCropArea.width = imageOffset.x + imageSize.width - newCropArea.x;
                newCropArea.height = newCropArea.width;
            }
            if (newCropArea.y + newCropArea.height > imageOffset.y + imageSize.height) {
                newCropArea.height = imageOffset.y + imageSize.height - newCropArea.y;
                newCropArea.width = newCropArea.height;
            }

            setCropArea(newCropArea);
        }
    }, [isDragging, isResizing, dragStart, cropArea, resizeHandle, imageSize, imageOffset]);

    const handlePointerUp = useCallback(() => {
        setIsDragging(false);
        setIsResizing(false);
        setResizeHandle('');
    }, []);

    // Apply crop to image
    const handleSaveCrop = async () => {
        if (!imageBeingEdited || !imageRef.current || isSaving) return;

        setIsSaving(true);
        try {
            const img = imageRef.current;

            // Calculate actual crop dimensions based on natural image size
            const scaleX = img.naturalWidth / imageSize.width;
            const scaleY = img.naturalHeight / imageSize.height;

            // Adjust for image offset and calculate crop data
            const cropData = {
                x: Math.round((cropArea.x - imageOffset.x) * scaleX),
                y: Math.round((cropArea.y - imageOffset.y) * scaleY),
                width: Math.round(cropArea.width * scaleX),
                height: Math.round(cropArea.height * scaleY)
            };

            // Call server action to save crop data
            const result = await saveCropData(imageBeingEdited.path, cropData, captionText);

            if (result.success) {
                // Add cache-busting parameter to force image reload
                const timestamp = Date.now();
                const croppedImageUrlWithCacheBust = result.croppedImageUrl ?
                    `${result.croppedImageUrl}?t=${timestamp}` :
                    result.croppedImageUrl;

                // Update local state to show crop has been applied
                setPhotos(prevPhotos =>
                    prevPhotos.map(photo => {
                            if (photo.path === imageBeingEdited.path)
                                return {
                                    ...photo,
                                    croppedImageData: {
                                        x: result.cropData.x,
                                        y: result.cropData.y,
                                        width: result.cropData.width,
                                        height: result.cropData.height,
                                        croppedImagePath: result.croppedImageUrl!
                                    },
                                    caption: captionText,
                                    croppedImageUrl: croppedImageUrlWithCacheBust,
                                }
                            else {
                                return photo;
                            }
                        }
                    )
                );

                setImageBeingEdited(undefined);
                setCaptionText('');
                // Dispatch event to refresh user profile main photo in notification center
                window.dispatchEvent(new CustomEvent('refresh-user-profile-main-photo'));
            }
        } catch (error) {
            console.error('Error saving crop data:', error);
            showAlert('Failed to save crop. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setImageBeingEdited(undefined);
        setCropArea({x: 0, y: 0, width: 200, height: 200});
        setImageOffset({x: 0, y: 0});
        setImageSize({width: 0, height: 0});
        setCaptionText('');
    };

    const resetCrop = () => {
        handleImageLoad();
    }

    const generateCropPreviewStyles = useCallback(() => {
        if (!imageRef.current || !imageBeingEdited) return {};

        const img = imageRef.current;

        // Calculate actual crop dimensions based on natural image size
        const scaleX = img.naturalWidth / imageSize.width;
        const scaleY = img.naturalHeight / imageSize.height;

        // Adjust for image offset and calculate crop data in original image coordinates
        const cropData = {
            x: Math.round((cropArea.x - imageOffset.x) * scaleX),
            y: Math.round((cropArea.y - imageOffset.y) * scaleY),
            width: Math.round(cropArea.width * scaleX),
            height: Math.round(cropArea.height * scaleY)
        };

        // Calculate the scale needed to fit the crop in the preview
        const maxPreviewSize = Math.min(window.innerWidth * 0.8, window.innerHeight * 0.8);
        const previewScale = Math.min(maxPreviewSize / cropData.width, maxPreviewSize / cropData.height, 1);

        // For the preview, we need to scale the entire image and position it correctly
        const imageDisplayWidth = img.naturalWidth * previewScale;
        const imageDisplayHeight = img.naturalHeight * previewScale;

        // Position to show the cropped area
        const offsetX = -cropData.x * previewScale;
        const offsetY = -cropData.y * previewScale;

        return {
            cropData,
            imageStyles: {
                width: imageDisplayWidth,
                height: imageDisplayHeight,
                position: 'absolute' as const,
                top: offsetY,
                left: offsetX,
                objectFit: 'cover' as const,
            },
            containerStyles: {
                width: cropData.width * previewScale,
                height: cropData.height * previewScale,
                overflow: 'hidden',
                borderRadius: '8px',
                position: 'relative' as const,
                backgroundColor: '#000',
            }
        };
    }, [imageBeingEdited, cropArea, imageSize, imageOffset]);

    const handlePreview = () => {
        setShowPreview(true);
    }

    // Handle preview viewer click to close
    useEffect(() => {
        function handlePreviewClick(event: MouseEvent) {
            if (event.target instanceof Element) {
                if (event.target.closest('.image-viewer-nav') ||
                    event.target.closest('.image-viewer-caption')) {
                    return;
                }
            }
            setShowPreview(false);
        }

        if (showPreview) {
            document.addEventListener("click", handlePreviewClick);
        }

        return () => {
            document.removeEventListener("click", handlePreviewClick);
        };
    }, [showPreview]);

    // Handle keyboard navigation for preview
    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (!showPreview) return;

            if (event.key === 'Escape') {
                setShowPreview(false);
            }
        }

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [showPreview]);

    // Handle file upload
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        // Validate files
        const validFiles: File[] = [];
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            if (!allowedTypes.includes(file.type)) {
                showAlert(`File ${file.name} is not a supported image format. Please use JPG, PNG, or WebP.`);
                continue;
            }

            if (file.size > maxSize) {
                showAlert(`File ${file.name} is too large. Maximum file size is 10MB.`);
                continue;
            }

            // Additional validation for potentially problematic files
            if (file.size === 0) {
                showAlert(`File ${file.name} appears to be empty.`);
                continue;
            }

            validFiles.push(file);
        }

        if (validFiles.length === 0) {
            event.target.value = ''; // Reset file input
            return;
        }

        // Check if adding these files would exceed max photos
        if (photos.length + validFiles.length > MAX_PHOTOS) {
            showAlert(`You can only upload ${MAX_PHOTOS - photos.length} more photo(s). Maximum of ${MAX_PHOTOS} photos allowed.`);
            event.target.value = ''; // Reset file input
            return;
        }

        setIsUploading(true);
        const uploadPromises = validFiles.map(async (file) => {
            try {
                setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

                // Create FormData
                const formData = new FormData();
                formData.append('file', file);

                // Upload file
                const response = await uploadPhoto(formData);

                if (response.success) {
                    setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
                    return response.photo;
                }

                throw new Error(response.message || 'Upload failed');
            } catch (error) {
                console.error(`Upload error for ${file.name}:`, error);

                // Provide more specific error messages
                let errorMessage = `Failed to upload ${file.name}.`;
                if (error instanceof Error) {
                    if (error.message.includes('corrupted') || error.message.includes('Invalid SOS')) {
                        errorMessage = `${file.name} appears to be corrupted. Try taking the photo again.`;
                    } else if (error.message.includes('too large')) {
                        errorMessage = `${file.name} is too large. Please use a smaller image.`;
                    } else if (error.message.includes('Invalid file type')) {
                        errorMessage = `${file.name} is not a supported format.`;
                    }
                }

                showAlert(errorMessage);
                return null;
            }
        });

        try {
            const uploadedPhotos = await Promise.all(uploadPromises);
            const successfulUploads = uploadedPhotos.filter((photo: any) => photo !== null);

            if (successfulUploads.length > 0) {
                // Reload photos to get updated list
                await loadPhotos();
                // Dispatch event to refresh user profile main photo in notification center
                window.dispatchEvent(new CustomEvent('refresh-user-profile-main-photo'));
            }
        } catch (error) {
            console.error('Upload process error:', error);
            showAlert('An error occurred during upload. Please try again.');
        } finally {
            setIsUploading(false);
            setUploadProgress({});
            event.target.value = ''; // Reset file input
        }
    };

    return (
        <>
            <div className="photos-management">
                {isLoading && <div className="loader-container">
                    <CircularProgress/>
                </div>}
                {!isLoading && !imageBeingEdited &&
                    <>
                        {photos.length === 0 &&
                            <div className="no-photos-caption"><InfoCircleIcon/> You have no uploaded photos.</div>}
                        {photos.length > 0 &&
                            <div className="photo-grid-container">
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}>
                                    <SortableContext items={photos.map(p => p.path)} strategy={rectSortingStrategy}>
                                        <div className="photo-grid">
                                            {photos.filter((photoWithUrl) => !!(photoWithUrl.croppedImageUrl || photoWithUrl.url))
                                                .map((photoWithUrl) => (
                                                    <SortablePhotoItem
                                                        onClick={() => handleEditImageClick(photoWithUrl)}
                                                        onDelete={() => handleImageDelete(photoWithUrl)}
                                                        key={photoWithUrl.path}
                                                        photoWithUrl={photoWithUrl}
                                                    />
                                                ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            </div>}
                        <div className="upload-controls-container">
                            <input
                                multiple={true}
                                style={{display: 'none'}}
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                disabled={isUploading}
                            />
                            {photos.length > 1 && !isUploading &&
                                <div className="drag-instructions">Tap photo to edit, drag to sort.</div>}
                            {isUploading &&
                                <div className="upload-progress">
                                    <div className="upload-status">Uploading photos...</div>
                                    {Object.entries(uploadProgress).map(([fileName, progress]) => (
                                        <div key={fileName} className="file-progress">
                                            <div className="file-name">{fileName}</div>
                                            <div className="progress-bar">
                                                <div
                                                    className="progress-fill"
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                            <div className="progress-text">{progress}%</div>
                                        </div>
                                    ))}
                                </div>}
                            {photos.length < MAX_PHOTOS &&
                                <Button
                                    onClick={() => fileInputRef.current?.click()}
                                    variant="contained"
                                    type="button"
                                    disabled={isUploading}
                                    startIcon={isUploading ? <CircularProgress size={16} color="inherit" /> : undefined}
                                >
                                    {isUploading ? 'Uploading...' : 'Upload Photos'}
                                </Button>}
                        </div>
                    </>
                }

                {!isLoading && !!imageBeingEdited && <div className="photo-editing-container">
                    <div className="back-button-container">
                        <button className="back-button" onClick={handleCancelEdit} disabled={isSaving}>
                            <TimesIcon/>
                            <div className="label">Cancel</div>
                        </button>
                        <button className="save-button" onClick={handleSaveCrop} disabled={isSaving}>
                            {isSaving ? <CircularProgress size={16} color="inherit"/> : <SaveIcon/>}
                            <div className="label">{isSaving ? 'Saving...' : 'Save'}</div>
                        </button>
                    </div>
                    <div className="caption-section">
                        <label>Photo Caption (optional)</label>
                        <input
                            type="text"
                            placeholder="Add a caption..."
                            maxLength={100}
                            value={captionText}
                            onChange={(e) => setCaptionText(e.target.value)}
                            disabled={isSaving}
                        />
                    </div>
                    <h4>Crop & Position</h4>
                    <div
                        className={`photo-crop-container ${isSaving ? 'saving' : ''}`}
                        ref={containerRef}
                        onPointerMove={isSaving ? undefined : handlePointerMove}
                        onPointerUp={isSaving ? undefined : handlePointerUp}
                        onPointerLeave={isSaving ? undefined : handlePointerUp}
                    >
                        <img
                            ref={imageRef}
                            src={imageBeingEdited.url}
                            alt="Edit"
                            onLoad={handleImageLoad}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                display: 'block',
                                margin: 'auto'
                            }}
                        />

                        {/* Crop overlay */}
                        <div className="crop-overlay">
                            {/* Dark areas outside crop */}
                            <div className="crop-dark" style={{
                                top: 0,
                                left: 0,
                                right: 0,
                                height: cropArea.y
                            }}/>
                            <div className="crop-dark" style={{
                                top: cropArea.y + cropArea.height,
                                left: 0,
                                right: 0,
                                bottom: 0
                            }}/>
                            <div className="crop-dark" style={{
                                top: cropArea.y,
                                left: 0,
                                width: cropArea.x,
                                height: cropArea.height
                            }}/>
                            <div className="crop-dark" style={{
                                top: cropArea.y,
                                left: cropArea.x + cropArea.width,
                                right: 0,
                                height: cropArea.height
                            }}/>

                            {/* Crop area with handles */}
                            <div
                                className="crop-area"
                                style={{
                                    left: cropArea.x,
                                    top: cropArea.y,
                                    width: cropArea.width,
                                    height: cropArea.height,
                                    pointerEvents: isSaving ? 'none' : 'auto'
                                }}
                                onPointerDown={isSaving ? undefined : (e) => handlePointerDown(e)}
                            >
                                {/* Corner handles */}
                                <div className="crop-handle corner nw"
                                     onPointerDown={(e) => handlePointerDown(e, 'nw')}/>
                                <div className="crop-handle corner ne"
                                     onPointerDown={(e) => handlePointerDown(e, 'ne')}/>
                                <div className="crop-handle corner sw"
                                     onPointerDown={(e) => handlePointerDown(e, 'sw')}/>
                                <div className="crop-handle corner se"
                                     onPointerDown={(e) => handlePointerDown(e, 'se')}/>

                                {/* Grid lines */}
                                <div className="crop-grid">
                                    <div className="grid-line horizontal" style={{top: '33.33%'}}/>
                                    <div className="grid-line horizontal" style={{top: '66.66%'}}/>
                                    <div className="grid-line vertical" style={{left: '33.33%'}}/>
                                    <div className="grid-line vertical" style={{left: '66.66%'}}/>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="crop-actions">
                        <button disabled={isSaving} className="preview-button" onClick={handlePreview}>
                            <EyeIcon/> Preview
                        </button>
                        <button className="reset-button" onClick={resetCrop} disabled={isSaving}>
                            <RedoIcon/> Reset Crop
                        </button>
                    </div>
                </div>}
            </div>

            {/* Delete Image Dialog */}
            <Dialog open={!!imageToDelete} onClose={isDeleting ? undefined : cancelImageDelete}>
                <DialogTitle>Delete Photo</DialogTitle>
                <DialogContent>
                    Are you sure you want to delete this photo? This action cannot be undone.
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={cancelImageDelete}
                        color="primary"
                        disabled={isDeleting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={confirmImageDelete}
                        color="error"
                        variant="contained"
                        disabled={isDeleting}
                        startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : undefined}
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Preview Image Viewer */}
            {showPreview && imageBeingEdited && (() => {
                const previewStyles = generateCropPreviewStyles();
                return (
                    <div
                        className="image-viewer-overlay"
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            zIndex: 10000,
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}
                        onClick={() => setShowPreview(false)}
                    >
                        <div className="image-viewer-content">
                            <div className="image-viewer-image-wrapper">
                                <div className="image-viewer-image-container">
                                    <div
                                        style={previewStyles.containerStyles}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <img
                                            src={imageBeingEdited.url}
                                            alt="Crop Preview"
                                            style={previewStyles.imageStyles}
                                        />
                                    </div>
                                </div>
                                {captionText && (
                                    <div className="image-viewer-caption">
                                        {captionText}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </>
    );
}
