'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { CropArea, ASPECT_RATIOS } from '@/lib/image-processing';

interface ImageCropperProps {
  imageFile: File;
  onCropChange: (cropArea: CropArea) => void;
  aspectRatio?: number;
  className?: string;
}

export function ImageCropper({ 
  imageFile, 
  onCropChange, 
  aspectRatio,
  className = '' 
}: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<'move' | 'resize' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 0, height: 0 });

  // Load and display the image
  useEffect(() => {
    const img = new Image();
    const canvas = canvasRef.current;
    
    if (!canvas) return;

    img.onload = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Calculate scale to fit image in container
      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const imageAspectRatio = img.width / img.height;
      const containerAspectRatio = containerWidth / containerHeight;

      let displayWidth: number;
      let displayHeight: number;

      if (imageAspectRatio > containerAspectRatio) {
        displayWidth = containerWidth;
        displayHeight = containerWidth / imageAspectRatio;
      } else {
        displayHeight = containerHeight;
        displayWidth = containerHeight * imageAspectRatio;
      }

      canvas.width = displayWidth;
      canvas.height = displayHeight;

      const newScale = displayWidth / img.width;
      setScale(newScale);
      setImage(img);

      // Calculate initial crop area
      const initialCrop = calculateInitialCrop(img.width, img.height, aspectRatio);
      setCropArea(initialCrop);
      onCropChange(initialCrop);

      // Draw the image
      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
      setImageLoaded(true);
    };

    img.src = URL.createObjectURL(imageFile);

    return () => {
      URL.revokeObjectURL(img.src);
    };
  }, [imageFile, aspectRatio, onCropChange]);

  // Redraw canvas when crop area changes
  useEffect(() => {
    if (!image || !imageLoaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Draw crop overlay
    drawCropOverlay(ctx, canvas.width, canvas.height);
  }, [cropArea, image, imageLoaded, scale]);

  const calculateInitialCrop = (imageWidth: number, imageHeight: number, aspectRatio?: number): CropArea => {
    if (!aspectRatio) {
      // Free-form crop - use 80% of image centered
      const width = Math.round(imageWidth * 0.8);
      const height = Math.round(imageHeight * 0.8);
      const x = Math.round((imageWidth - width) / 2);
      const y = Math.round((imageHeight - height) / 2);
      return { x, y, width, height };
    }

    // Calculate crop area for specific aspect ratio
    const imageAspectRatio = imageWidth / imageHeight;
    
    let cropWidth: number;
    let cropHeight: number;
    
    if (imageAspectRatio > aspectRatio) {
      cropHeight = Math.round(imageHeight * 0.8);
      cropWidth = Math.round(cropHeight * aspectRatio);
    } else {
      cropWidth = Math.round(imageWidth * 0.8);
      cropHeight = Math.round(cropWidth / aspectRatio);
    }
    
    const x = Math.round((imageWidth - cropWidth) / 2);
    const y = Math.round((imageHeight - cropHeight) / 2);
    
    return { x, y, width: cropWidth, height: cropHeight };
  };

  const drawCropOverlay = (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => {
    // Scale crop area to canvas coordinates
    const scaledCrop = {
      x: cropArea.x * scale,
      y: cropArea.y * scale,
      width: cropArea.width * scale,
      height: cropArea.height * scale
    };

    // Draw dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Clear crop area
    ctx.clearRect(scaledCrop.x, scaledCrop.y, scaledCrop.width, scaledCrop.height);

    // Redraw image in crop area
    if (image) {
      ctx.drawImage(
        image,
        cropArea.x, cropArea.y, cropArea.width, cropArea.height,
        scaledCrop.x, scaledCrop.y, scaledCrop.width, scaledCrop.height
      );
    }

    // Draw crop border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(scaledCrop.x, scaledCrop.y, scaledCrop.width, scaledCrop.height);

    // Draw corner handles
    const handleSize = 8;
    ctx.fillStyle = '#ffffff';
    
    // Top-left
    ctx.fillRect(scaledCrop.x - handleSize/2, scaledCrop.y - handleSize/2, handleSize, handleSize);
    // Top-right
    ctx.fillRect(scaledCrop.x + scaledCrop.width - handleSize/2, scaledCrop.y - handleSize/2, handleSize, handleSize);
    // Bottom-left
    ctx.fillRect(scaledCrop.x - handleSize/2, scaledCrop.y + scaledCrop.height - handleSize/2, handleSize, handleSize);
    // Bottom-right
    ctx.fillRect(scaledCrop.x + scaledCrop.width - handleSize/2, scaledCrop.y + scaledCrop.height - handleSize/2, handleSize, handleSize);

    // Draw grid lines (rule of thirds)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    
    // Vertical lines
    const thirdWidth = scaledCrop.width / 3;
    ctx.beginPath();
    ctx.moveTo(scaledCrop.x + thirdWidth, scaledCrop.y);
    ctx.lineTo(scaledCrop.x + thirdWidth, scaledCrop.y + scaledCrop.height);
    ctx.moveTo(scaledCrop.x + thirdWidth * 2, scaledCrop.y);
    ctx.lineTo(scaledCrop.x + thirdWidth * 2, scaledCrop.y + scaledCrop.height);
    ctx.stroke();

    // Horizontal lines
    const thirdHeight = scaledCrop.height / 3;
    ctx.beginPath();
    ctx.moveTo(scaledCrop.x, scaledCrop.y + thirdHeight);
    ctx.lineTo(scaledCrop.x + scaledCrop.width, scaledCrop.y + thirdHeight);
    ctx.moveTo(scaledCrop.x, scaledCrop.y + thirdHeight * 2);
    ctx.lineTo(scaledCrop.x + scaledCrop.width, scaledCrop.y + thirdHeight * 2);
    ctx.stroke();
  };

  const getMousePosition = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const getHitArea = (mouseX: number, mouseY: number) => {
    const scaledCrop = {
      x: cropArea.x * scale,
      y: cropArea.y * scale,
      width: cropArea.width * scale,
      height: cropArea.height * scale
    };

    const handleSize = 12; // Slightly larger hit area than visual handle

    // Check corner handles
    if (
      mouseX >= scaledCrop.x - handleSize/2 && mouseX <= scaledCrop.x + handleSize/2 &&
      mouseY >= scaledCrop.y - handleSize/2 && mouseY <= scaledCrop.y + handleSize/2
    ) {
      return 'resize-tl';
    }
    if (
      mouseX >= scaledCrop.x + scaledCrop.width - handleSize/2 && mouseX <= scaledCrop.x + scaledCrop.width + handleSize/2 &&
      mouseY >= scaledCrop.y - handleSize/2 && mouseY <= scaledCrop.y + handleSize/2
    ) {
      return 'resize-tr';
    }
    if (
      mouseX >= scaledCrop.x - handleSize/2 && mouseX <= scaledCrop.x + handleSize/2 &&
      mouseY >= scaledCrop.y + scaledCrop.height - handleSize/2 && mouseY <= scaledCrop.y + scaledCrop.height + handleSize/2
    ) {
      return 'resize-bl';
    }
    if (
      mouseX >= scaledCrop.x + scaledCrop.width - handleSize/2 && mouseX <= scaledCrop.x + scaledCrop.width + handleSize/2 &&
      mouseY >= scaledCrop.y + scaledCrop.height - handleSize/2 && mouseY <= scaledCrop.y + scaledCrop.height + handleSize/2
    ) {
      return 'resize-br';
    }

    // Check if inside crop area for moving
    if (
      mouseX >= scaledCrop.x && mouseX <= scaledCrop.x + scaledCrop.width &&
      mouseY >= scaledCrop.y && mouseY <= scaledCrop.y + scaledCrop.height
    ) {
      return 'move';
    }

    return null;
  };

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imageLoaded) return;

    const { x, y } = getMousePosition(e);
    const hitArea = getHitArea(x, y);

    if (hitArea) {
      setIsDragging(true);
      setDragType(hitArea === 'move' ? 'move' : 'resize');
      setDragStart({ x, y });
      e.preventDefault();
    }
  }, [imageLoaded, cropArea, scale]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imageLoaded) return;

    const { x, y } = getMousePosition(e);

    if (isDragging && image) {
      const deltaX = (x - dragStart.x) / scale;
      const deltaY = (y - dragStart.y) / scale;

      const newCrop = { ...cropArea };

      if (dragType === 'move') {
        // Move the crop area
        newCrop.x = Math.max(0, Math.min(image.width - cropArea.width, cropArea.x + deltaX));
        newCrop.y = Math.max(0, Math.min(image.height - cropArea.height, cropArea.y + deltaY));
      } else if (dragType === 'resize') {
        // For simplicity, resize from bottom-right corner
        const newWidth = Math.max(50, Math.min(image.width - cropArea.x, cropArea.width + deltaX));
        let newHeight = Math.max(50, Math.min(image.height - cropArea.y, cropArea.height + deltaY));

        if (aspectRatio) {
          // Maintain aspect ratio
          newHeight = newWidth / aspectRatio;
          if (cropArea.y + newHeight > image.height) {
            newHeight = image.height - cropArea.y;
            newCrop.width = newHeight * aspectRatio;
          } else {
            newCrop.width = newWidth;
          }
          newCrop.height = newHeight;
        } else {
          newCrop.width = newWidth;
          newCrop.height = newHeight;
        }
      }

      setCropArea(newCrop);
      onCropChange(newCrop);
      setDragStart({ x, y });
    } else {
      // Update cursor based on hit area
      const canvas = canvasRef.current;
      if (!canvas) return;

      const hitArea = getHitArea(x, y);
      if (hitArea === 'move') {
        canvas.style.cursor = 'move';
      } else if (hitArea?.startsWith('resize')) {
        canvas.style.cursor = 'nw-resize';
      } else {
        canvas.style.cursor = 'default';
      }
    }
  }, [isDragging, dragType, dragStart, cropArea, scale, aspectRatio, image, imageLoaded, onCropChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragType(null);
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`image-cropper ${className}`}
      style={{ width: '100%', height: '400px', position: 'relative' }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          border: '1px solid #ddd',
          borderRadius: '8px',
          display: 'block',
          margin: '0 auto',
          maxWidth: '100%',
          maxHeight: '100%'
        }}
      />
      {!imageLoaded && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#666'
        }}>
          Loading image...
        </div>
      )}
    </div>
  );
}
