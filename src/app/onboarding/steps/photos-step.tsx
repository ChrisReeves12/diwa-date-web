'use client';

import { useState, useEffect, useRef } from 'react';
import { WizardData } from '../wizard-container';
import { getUserPhotos, uploadPhoto, deletePhoto } from '@/app/profile/photos/photos.actions';
import { PhotoWithUrl } from '@/types/upload-progress.interface';
import { showAlert } from '@/util';
import { CircularProgress } from "@mui/material";
import { TimesIcon } from "react-line-awesome";
import { IoIosImages } from "react-icons/io";
// Removed server action doPhotoReview in favor of API call
import { User } from "@/types";

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
            setPhotos(result.photos);
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
        const uploadPromises = validFiles.map(async (file) => {
            try {
                setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

                const formData = new FormData();
                formData.append('file', file);

                const response = await uploadPhoto(formData);

                if (response.success) {
                    setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
                    filesToReview.push({ imageFile: file, s3Path: response.photo.path });
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

        let hasError = false;
        let successfulUploads = [];

        try {
            const uploadedPhotos = await Promise.all(uploadPromises);
            successfulUploads = uploadedPhotos.filter((photo: any) => photo !== null);

            if (successfulUploads.length > 0) {
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
            setPhotoReviews(prevState => {
                return [...prevState, ...filesToReview.map(p => ({ s3Path: p.s3Path, status: 'Checking photo...' }))];
            });

            try {
                const formData = new FormData();
                for (const f of filesToReview) {
                    formData.append('files', f.imageFile);
                    formData.append('s3Paths', f.s3Path);
                }

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);

                const response = await fetch('/api/photos/review', {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.error || 'Failed to review photos');
                }

                const reviewResults = await response.json();

                setPhotoReviews(prevState => {
                    return prevState.map(p => {
                        const photoReview = (reviewResults.photos || []).find((v: any) => v.s3Path === p.s3Path);
                        if (photoReview) {
                            return { ...p, ...{ status: !photoReview.isRejected ? 'Approved' : 'Photo Not Approved: ' + (photoReview.messages || []).join(', ') } };
                        }

                        return p;
                    });
                });

                setValidPhotoCount(prevState =>
                    prevState + (reviewResults.photos || []).filter((p: any) => !p.isRejected).length);
            } catch (error) {
                console.error('Photo review error:', error);
                showAlert('Photos uploaded but review failed. Please try again.');
            }
        }
    };

    const handleDeletePhoto = async (photoPath: string) => {
        if (isDeleting) return;

        setIsDeleting(true);
        try {
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
    let uploadButtonLabel = 'Upload Photos';
    if (isUploading) {
        uploadButtonLabel = 'Uploading Photos'
    } else if (isCheckingPhotos) {
        uploadButtonLabel = 'Checking Photos'
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

                                        return (
                                            <div className='photo-item-container'>
                                                <div key={photo.path} className="photo-item">
                                                    {photoBeingReviewed?.status?.includes('Checking') &&
                                                        <div className="circle-loader-container">
                                                            <CircularProgress size={50} />
                                                        </div>}
                                                    <div
                                                        className={`photo-display ${photoBeingReviewed?.status?.includes('Checking') ? 'approval-in-progress' : ''}`}
                                                        style={{ backgroundImage: `url('${photo.croppedImageUrl || photo.url}')` }}
                                                    />
                                                    <button
                                                        onClick={() => handleDeletePhoto(photo.path)}
                                                        className="delete-button"
                                                        disabled={isDeleting}>
                                                        <TimesIcon />
                                                    </button>
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
                                                    <div className="progress-text">{progress >= 99 ? 'Complete' : 'Uploading'}</div>
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

