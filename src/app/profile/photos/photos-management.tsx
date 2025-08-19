'use client';

import './photos-management.scss';
import React, { useState, useEffect, useRef } from 'react';
import { PhotoWithUrl } from '@/types/upload-progress.interface';
import { getUserPhotos } from './photos.actions';
import { showAlert } from '@/util';
import { Button, CircularProgress } from "@mui/material";
import { ArrowLeftIcon, InfoCircleIcon, SaveIcon, TimesIcon } from "react-line-awesome";
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

export function PhotosManagement() {
    const MAX_PHOTOS = 10;
    const [photos, setPhotos] = useState<PhotoWithUrl[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [imageBeingEdited, setImageBeingEdited] = useState<PhotoWithUrl | undefined>();
    const [imageToDelete, setImageToDelete] = useState<PhotoWithUrl | undefined>();
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
        console.log(croppedArea, croppedAreaPixels);
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
                        <button className="back-button" onClick={() => setImageBeingEdited(undefined)}>
                            <TimesIcon/> <div className="label">Cancel</div>
                        </button>
                        <button className="save-button">
                            <SaveIcon/> <div className="label">Save Changes</div>
                        </button>
                    </div>
                    <h4>Crop Photo</h4>
                    <div className="photo-crop-container">

                    </div>
                    <h4>Photo Caption</h4>
                    <div className="caption-container">
                        <textarea></textarea>
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
