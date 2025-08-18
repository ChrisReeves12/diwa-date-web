'use client';

import './photos-management.scss';
import { useState, useEffect } from 'react';
import { PhotoWithUrl } from '@/types/upload-progress.interface';
import { getUserPhotos } from './photos.actions';
import { showAlert } from '@/util';

export function PhotosManagement() {
    const [photos, setPhotos] = useState<PhotoWithUrl[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load user photos
    useEffect(() => {
        loadPhotos();
    }, []);

    const loadPhotos = async () => {
        try {
            setLoading(true);
            const result = await getUserPhotos();
            setPhotos(result.photos);
        } catch (err) {
            showAlert('An error occurred while loading photos. Please try again later.');
            console.error('Load photos error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="photos-management">
            {error && (
                <div className="error-message">
                    {error}
                    <button onClick={loadPhotos}>Retry</button>
                </div>
            )}
        </div>
    );
}
