'use client';

import { PhotoWithUrl } from '@/types/upload-progress.interface';
import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PhotoGridItemProps {
  photo: PhotoWithUrl;
  isMainPhoto: boolean;
  onDelete: (photoPath: string) => void;
  onMakeMain: (photoPath: string) => void;
  onPhotoClick: (photo: PhotoWithUrl) => void;
}

export function PhotoGridItem({ 
  photo, 
  isMainPhoto, 
  onDelete, 
  onMakeMain,
  onPhotoClick
}: PhotoGridItemProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.path });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this photo?')) {
      onDelete(photo.path);
    }
  };

  const handleMakeMain = () => {
    if (!isMainPhoto) {
      onMakeMain(photo.path);
    }
  };

  const handlePhotoClick = () => {
    onPhotoClick(photo);
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`photo-grid-item ${isDragging ? 'dragging' : ''} ${isMainPhoto ? 'main-photo' : ''}`}
    >
      {/* Drag handle */}
      <div className="drag-handle" {...attributes} {...listeners}>
        <img src="/images/photo-sort-handle.svg" alt="Drag to reorder" />
      </div>

      {/* Main photo badge */}
      {isMainPhoto && (
        <div className="main-photo-badge">
          <i className="las la-star"></i>
          <span>Main Photo</span>
        </div>
      )}

      {/* Photo container */}
      <div className="photo-container" onClick={handlePhotoClick}>
        {!imageLoaded && !imageError && (
          <div className="photo-loading">
            <i className="las la-spinner la-spin"></i>
          </div>
        )}
        
        {imageError ? (
          <div className="photo-error">
            <i className="las la-exclamation-triangle"></i>
            <span>Failed to load</span>
          </div>
        ) : (
          photo.url && (
            <img
              src={photo.url}
              alt="User photo"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              style={{ display: imageLoaded ? 'block' : 'none' }}
            />
          )
        )}
      </div>

      {/* Photo actions */}
      <div className="photo-actions">
        {!isMainPhoto && (
          <button
            className="btn-make-main"
            onClick={handleMakeMain}
            title="Make main photo"
          >
            <i className="las la-star"></i>
          </button>
        )}
        
        <button
          className="btn-delete"
          onClick={handleDelete}
          title="Delete photo"
        >
          <i className="las la-trash"></i>
        </button>
      </div>

      {/* Photo info */}
      <div className="photo-info">
        <div className="upload-date">
          {new Date(photo.uploadedAt).toLocaleDateString()}
        </div>
        {photo.caption && (
          <div className="photo-caption">
            {photo.caption}
          </div>
        )}
      </div>
    </div>
  );
}
