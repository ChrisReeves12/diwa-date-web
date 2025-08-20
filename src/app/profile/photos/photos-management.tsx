'use client';

import './photos-management.scss';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PhotoWithUrl } from '@/types/upload-progress.interface';
import { getUserPhotos, saveCropData } from './photos.actions';
import { showAlert } from '@/util';
import { Button, CircularProgress } from "@mui/material";
import { ArrowLeftIcon, InfoCircleIcon, SaveIcon, TimesIcon, CropIcon, RedoIcon } from "react-line-awesome";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors, TouchSensor,
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
const innerWidth = window.innerWidth;

function SortablePhotoItem({ photoWithUrl, onClick, onDelete }: {
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
    } = useSortable({ id: photoWithUrl.path });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        backgroundImage: `url('${photoWithUrl.croppedImageUrl || photoWithUrl.url}')`,
    };

    return (
        <div
            onClick={onClick}
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="photo-grid-item"
        >
            <button onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                onDelete(e);
            }} className="delete-button">
                <TimesIcon/>
            </button>
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

    // Cropping state
    const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 200, height: 200 });
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [resizeHandle, setResizeHandle] = useState('');
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
    const [captionText, setCaptionText] = useState('');
    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const sensors = useSensors(
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 150,
                tolerance: 5,
            },
        }),
    );

    // Load user photos
    useEffect(() => {
        loadPhotos();
    }, []);

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

                return arrayMove(aPhotos, oldIndex, newIndex);
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

    const confirmImageDelete = () => {
        if (imageToDelete) {
            console.log('Deleting image:', imageToDelete);
            // TODO: Implement actual deletion logic here
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

        setImageSize({ width: displayWidth, height: displayHeight });
        setImageOffset({ x: offsetX, y: offsetY });

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

        setDragStart({ x: x - cropArea.x, y: y - cropArea.y });
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

            setCropArea(prev => ({ ...prev, x: newX, y: newY }));
        } else if (isResizing) {
            // Resize crop area
            let newCropArea = { ...cropArea };
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
        if (!imageBeingEdited || !imageRef.current) return;

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
                // Update local state to show crop has been applied
                setPhotos(prevPhotos =>
                    prevPhotos.map(photo =>
                        photo.path === imageBeingEdited.path
                            ? {
                                ...photo,
                                cropData,
                                caption: captionText,
                                // For now, show original image until server processing is done
                                croppedImageUrl: photo.url
                            }
                            : photo
                    )
                );

                setImageBeingEdited(undefined);
                setCaptionText('');
                showAlert('Photo updated successfully!', 'success');
            }
        } catch (error) {
            console.error('Error saving crop data:', error);
            showAlert('Failed to save crop. Please try again.');
        }
    };

    const handleCancelEdit = () => {
        setImageBeingEdited(undefined);
        setCropArea({ x: 0, y: 0, width: 200, height: 200 });
        setImageOffset({ x: 0, y: 0 });
        setImageSize({ width: 0, height: 0 });
        setCaptionText('');
    };

    const resetCrop = () => {
        handleImageLoad();
    }

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
                            <input multiple={true} style={{display: 'none'}} ref={fileInputRef} type="file"
                                   accept="image/*"/>
                            {photos.length > 1 &&
                                <div className="drag-instructions">Tap photo to edit, drag to sort.</div>}
                            {photos.length < MAX_PHOTOS &&
                                <Button onClick={() => fileInputRef.current?.click()} variant="contained" type="button">Upload
                                    Photos</Button>}
                        </div>
                    </>
                }

                {!isLoading && !!imageBeingEdited && <div className="photo-editing-container">
                    <div className="back-button-container">
                        <button className="back-button" onClick={handleCancelEdit}>
                            <TimesIcon/> <div className="label">Cancel</div>
                        </button>
                        <button className="save-button" onClick={handleSaveCrop}>
                            <SaveIcon/> <div className="label">Save</div>
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
                        />
                    </div>
                    <h4>Crop & Position</h4>
                    <div
                        className="photo-crop-container"
                        ref={containerRef}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
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
                            }} />
                            <div className="crop-dark" style={{
                                top: cropArea.y + cropArea.height,
                                left: 0,
                                right: 0,
                                bottom: 0
                            }} />
                            <div className="crop-dark" style={{
                                top: cropArea.y,
                                left: 0,
                                width: cropArea.x,
                                height: cropArea.height
                            }} />
                            <div className="crop-dark" style={{
                                top: cropArea.y,
                                left: cropArea.x + cropArea.width,
                                right: 0,
                                height: cropArea.height
                            }} />

                            {/* Crop area with handles */}
                            <div
                                className="crop-area"
                                style={{
                                    left: cropArea.x,
                                    top: cropArea.y,
                                    width: cropArea.width,
                                    height: cropArea.height
                                }}
                                onPointerDown={(e) => handlePointerDown(e)}
                            >
                                {/* Corner handles */}
                                <div className="crop-handle corner nw" onPointerDown={(e) => handlePointerDown(e, 'nw')} />
                                <div className="crop-handle corner ne" onPointerDown={(e) => handlePointerDown(e, 'ne')} />
                                <div className="crop-handle corner sw" onPointerDown={(e) => handlePointerDown(e, 'sw')} />
                                <div className="crop-handle corner se" onPointerDown={(e) => handlePointerDown(e, 'se')} />

                                {/* Grid lines */}
                                <div className="crop-grid">
                                    <div className="grid-line horizontal" style={{ top: '33.33%' }} />
                                    <div className="grid-line horizontal" style={{ top: '66.66%' }} />
                                    <div className="grid-line vertical" style={{ left: '33.33%' }} />
                                    <div className="grid-line vertical" style={{ left: '66.66%' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="crop-actions">
                        <button className="reset-button" onClick={resetCrop}>
                            <RedoIcon /> Reset Crop
                        </button>
                    </div>
                </div>}
            </div>

            {/* Cancel Image Dialog */}
            <Dialog open={!!imageToDelete} onClose={cancelImageDelete}>
                <DialogTitle>Delete Photo</DialogTitle>
                <DialogContent>
                    Are you sure you want to delete this photo? This action cannot be undone.
                </DialogContent>
                <DialogActions>
                    <Button onClick={cancelImageDelete} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={confirmImageDelete} color="error" variant="contained">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
