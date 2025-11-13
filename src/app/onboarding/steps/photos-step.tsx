'use client';

import { useState, useEffect, useRef } from 'react';
import { WizardData } from '../wizard-container';
import { getUserPhotos, uploadPhoto, deletePhoto } from '@/app/profile/photos/photos.actions';
import { PhotoWithUrl } from '@/types/upload-progress.interface';
import { showAlert } from '@/util';
import { CircularProgress, Tooltip } from "@mui/material";
import { TimesIcon } from "react-line-awesome";
import { IoIosImages } from "react-icons/io";
// Removed server action doPhotoReview in favor of API call
import { User } from "@/types";
import _ from 'lodash';

// Ensure rejected photos are always last while preserving relative order
function moveRejectedToEnd(list: PhotoWithUrl[]): PhotoWithUrl[] {
    const approved = list.filter(p => !p.isRejected);
    const rejected = list.filter(p => p.isRejected);
    return [...approved, ...rejected];
}

interface PhotosStepProps {
    data: WizardData;
    updateData: (field: keyof WizardData, value: any) => void;
    onValidationChange: (isValid: boolean) => void;
    currentUser: User
}

export function PhotosStep({
    currentUser,
    onValidationChange
}: PhotosStepProps) {
    const MIN_PHOTOS = 3;
    const MAX_PHOTOS = 10;
    const REVIEW_GROUP_SIZE = 8;
    const UPLOAD_GROUP_SIZE = 5;
    const [photos, setPhotos] = useState<PhotoWithUrl[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
    const [photoReviews, setPhotoReviews] = useState<{ s3Path: string, status: string }[]>([]);
    const [validPhotoCount, setValidPhotoCount] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load photos on mount
    useEffect(() => {
        loadPhotos();
    }, []);

    useEffect(() => {
        onValidationChange(validPhotoCount >= MIN_PHOTOS);
    }, [validPhotoCount]);

    const loadPhotos = async () => {
        try {
            setIsLoading(true);
            const result = await getUserPhotos();
            setPhotos(moveRejectedToEnd(result.photos));
            setPhotoReviews((result.photos || []).map(p => {
                const status = Array.isArray(p.messages) && p.messages.length > 0 && p.isRejected ?
                    (p.messages || []).join(', ') : 'Approved';

                return {
                    s3Path: p.path,
                    status
                }
            }));

            setValidPhotoCount((result.photos || []).filter(p => !p.isRejected).length);

            return result.photos;
        } catch (err) {
            showAlert('An error occurred while loading photos. Please try again later.');
            console.error('Load photos error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        // Validate files
        const validFiles: File[] = [];
        const filesToReview: { imageFile: File, s3Path: string }[] = [];
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

            if (file.size === 0) {
                showAlert(`File ${file.name} appears to be empty.`);
                continue;
            }

            validFiles.push(file);
        }

        if (validFiles.length === 0) {
            event.target.value = '';
            return;
        }

        // Check if adding these files would exceed max photos
        if (photos.length + validFiles.length > MAX_PHOTOS) {
            showAlert(`You can only upload ${MAX_PHOTOS - photos.length} more photo(s). Maximum of ${MAX_PHOTOS} photos allowed.`);
            event.target.value = '';
            return;
        }

        setIsUploading(true);
        // Pre-populate progress entries for all files as queued
        setUploadProgress(prev => {
            const next = { ...prev } as { [key: string]: number };
            for (const file of validFiles) {
                if (next[file.name] === undefined) next[file.name] = -1; // -1 indicates queued
            }
            return next;
        });
        let hasError = false;
        let successfulCount = 0;

        try {
            const chunks = _.chunk(validFiles, UPLOAD_GROUP_SIZE);
            for (const chunk of chunks) {
                const uploadChunkPromises = chunk.map(async (file) => {
                    try {
                        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

                        const formData = new FormData();
                        formData.append('file', file);

                        const response = await uploadPhoto(formData);

                        if (response.success) {
                            setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
                            filesToReview.push({ imageFile: file, s3Path: response.photo.path });
                            successfulCount += 1;
                            return response.photo;
                        }

                        throw new Error(response.message || 'Upload failed');
                    } catch (error) {
                        console.error(`Upload error for ${file.name}:`, error);

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

                await Promise.all(uploadChunkPromises);
            }

            if (successfulCount > 0) {
                await loadPhotos();
            }
        } catch (error) {
            hasError = true;
            console.error('Upload process error:', error);
            showAlert('An error occurred during upload. Please try again.');
        } finally {
            setIsUploading(false);
            setUploadProgress({});
            event.target.value = '';
        }

        // Check photos for approval
        if (!hasError && filesToReview.length > 0) {
            // Mark all as queued first (dedupe by s3Path)
            setPhotoReviews(prevState => {
                const byPath = new Map(prevState.map(p => [p.s3Path, p]));
                for (const f of filesToReview) {
                    const existing = byPath.get(f.s3Path);
                    if (existing) {
                        byPath.set(f.s3Path, { ...existing, status: 'Queued for review...' });
                    } else {
                        byPath.set(f.s3Path, { s3Path: f.s3Path, status: 'Queued for review...' });
                    }
                }
                return Array.from(byPath.values());
            });

            try {
                const chunks = _.chunk(filesToReview, REVIEW_GROUP_SIZE);

                for (const chunk of chunks) {
                    // Mark current chunk as checking
                    setPhotoReviews(prevState => {
                        const byPath = new Map(prevState.map(p => [p.s3Path, p]));
                        for (const f of chunk) {
                            const existing = byPath.get(f.s3Path);
                            if (existing) {
                                byPath.set(f.s3Path, { ...existing, status: 'Checking photo...' });
                            } else {
                                byPath.set(f.s3Path, { s3Path: f.s3Path, status: 'Checking photo...' });
                            }
                        }
                        return Array.from(byPath.values());
                    });
                    const reviewPromises = chunk.map(async (f) => {
                        const formData = new FormData();
                        formData.append('files', f.imageFile);
                        formData.append('s3Paths', f.s3Path);

                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 30000);

                        try {
                            const response = await fetch('/api/photos/review', {
                                method: 'POST',
                                body: formData,
                                signal: controller.signal
                            });

                            if (!response.ok) {
                                const err = await response.json().catch(() => ({}));
                                throw new Error(err.error || 'Failed to review photo');
                            }

                            const reviewResults = await response.json();
                            return { s3Path: f.s3Path, review: (reviewResults.photos || [])[0] };
                        } finally {
                            clearTimeout(timeoutId);
                        }
                    });

                    const chunkResults: { s3Path: string, review: any }[] = await Promise.all(reviewPromises);

                    setPhotoReviews(prevState => {
                        return prevState.map(p => {
                            const r = chunkResults.find(cr => cr.s3Path === p.s3Path);
                            if (r && r.review) {
                                return { ...p, status: !r.review.isRejected ? 'Approved' : (r.review.messages || []).join(', ') };
                            }

                            return p;
                        });
                    });

                    setValidPhotoCount(prevState =>
                        prevState + chunkResults.filter(r => r.review && !r.review.isRejected).length);
                }
                // Reload photos to get updated status from database
                await loadPhotos();
            } catch (error) {
                console.error('Photo review error:', error);
                showAlert('Photos uploaded but review failed. Please try again.');
            }
        }
    };

    const handleDeletePhoto = async (photoPath: string) => {
        if (isDeleting) return;

        const review = photoReviews.find(p => p.s3Path === photoPath);
        const isQueuedOrChecking = !!review && (review.status.includes('Queued') || review.status.includes('Checking'));
        if (isQueuedOrChecking) {
            showAlert('This photo is currently queued or being reviewed and cannot be deleted right now.');
            return;
        }

        setIsDeleting(true);
        try {
            const review2 = photoReviews.find(p => p.s3Path === photoPath);
            const isQueuedOrChecking2 = !!review2 && (review2.status.includes('Queued') || review2.status.includes('Checking'));
            if (isQueuedOrChecking2) {
                showAlert('This photo is currently queued or being reviewed and cannot be deleted right now.');
                return;
            }
            const result = await deletePhoto(photoPath);
            if (result.success) {
                await loadPhotos();
            }
        } catch (error) {
            console.error('Delete photo error:', error);
            showAlert('Failed to delete photo. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    const photosNeeded = Math.max(0, MIN_PHOTOS - validPhotoCount);
    const isCheckingPhotos = photoReviews.some(p => p.status.includes('Checking'));
    let uploadButtonLabel = 'Add Photos';
    if (isUploading) {
        uploadButtonLabel = 'Uploading Photos...'
    } else if (isCheckingPhotos) {
        uploadButtonLabel = 'Checking Photos...'
    }

    return (
        <div className="wizard-step photos-step">
            <div className="step-header">
                <h2>Upload Your Photos</h2>
                <p className="step-description">
                    Upload at least {MIN_PHOTOS} photos to continue. Great photos help others get to know you better!
                </p>
            </div>

            <div className="step-content">
                <div className="photos-upload-section">
                    {isLoading ? (
                        <div className="loader-container">
                            <CircularProgress />
                        </div>
                    ) : (
                        <>
                            <div className="photo-progress-info">
                                {photosNeeded > 0 ? (
                                    <p className="photos-needed">
                                        <IoIosImages className="image-icon" /> <div>You need {photosNeeded} more photo{photosNeeded !== 1 ? 's' : ''} to continue.</div>
                                    </p>
                                ) : (
                                    <p className="photos-complete">
                                        You have enough photos! You can add up to {MAX_PHOTOS - photos.length} more.
                                    </p>
                                )}
                            </div>

                            {photos.length > 0 && (
                                <div className="photo-grid">
                                    {photos.map((photo) => {
                                        const photoBeingReviewed = photoReviews
                                            .find(p => p.s3Path === photo.path);
                                        const isQueuedOrChecking = !!photoBeingReviewed && (photoBeingReviewed.status.includes('Queued') || photoBeingReviewed.status.includes('Checking'));
                                        const isRejectedUi = !!photo.isRejected || (!!photoBeingReviewed && !isQueuedOrChecking && photoBeingReviewed.status !== 'Approved');

                                        return (
                                            <div className='photo-item-container'>
                                                <div key={photo.path} className="photo-item">
                                                    {photoBeingReviewed?.status?.includes('Checking') &&
                                                        <div className="circle-loader-container">
                                                            <CircularProgress size={50} />
                                                        </div>}
                                                    <div
                                                        className={`photo-display ${isQueuedOrChecking ? 'approval-in-progress' : ''} ${isRejectedUi ? 'rejected' : ''}`}
                                                        style={{ backgroundImage: `url('${photo.croppedImageUrl || photo.url}')` }}
                                                    />
                                                    {isQueuedOrChecking ? (
                                                        <Tooltip title="This photo is queued or being reviewed and cannot be deleted.">
                                                            <span>
                                                                <button
                                                                    onClick={() => handleDeletePhoto(photo.path)}
                                                                    className="delete-button"
                                                                    disabled={true}>
                                                                    <TimesIcon />
                                                                </button>
                                                            </span>
                                                        </Tooltip>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleDeletePhoto(photo.path)}
                                                            className="delete-button"
                                                            disabled={isDeleting}>
                                                            <TimesIcon />
                                                        </button>
                                                    )}
                                                </div>
                                                {!!photoBeingReviewed &&
                                                    <div className="approval-status">{photoBeingReviewed.status}</div>}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            <div className="upload-section">
                                <input
                                    multiple={true}
                                    style={{ display: 'none' }}
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    disabled={isUploading || photos.length >= MAX_PHOTOS}
                                />

                                {isUploading && (
                                    <div className="upload-progress">
                                        <div className="upload-status">Uploading photos...</div>
                                        {Object.entries(uploadProgress).map(([fileName, progress]) => (
                                            <div key={fileName} className="file-progress">
                                                <div className="spinner-container">
                                                    <CircularProgress size={20} color="inherit" />
                                                </div>
                                                <div className="file-info-container">
                                                    <div className="file-name">{fileName}</div>
                                                    <div className="progress-text">{progress < 0 ? 'Queued' : (progress >= 99 ? 'Complete' : 'Uploading')}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="button-container">
                                    {photos.length < MAX_PHOTOS && (
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="btn-primary upload-button"
                                            disabled={isUploading || isCheckingPhotos}
                                            type="button"
                                        >
                                            {uploadButtonLabel}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="photo-tips">
                                <h4>Photo Tips:</h4>
                                <ul>
                                    <li>Use clear, recent photos of yourself</li>
                                    <li>Show your face clearly in your photos</li>
                                    <li>Avoid group photos where it's hard to identify you</li>
                                </ul>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

