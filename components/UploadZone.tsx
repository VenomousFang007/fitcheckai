import React, { useRef, useState, useEffect } from 'react';
import { CameraIcon, ImageIcon, RefreshIcon, ShareIcon } from './Icons';

interface UploadZoneProps {
  imagePreviewUrl: string | null;
  onImageSelected: (url: string, file: File) => void;
  uploadError?: { title: string; subtitle: string } | null;
  onError?: (title: string, subtitle: string) => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ 
  imagePreviewUrl, 
  onImageSelected,
  uploadError,
  onError
}) => {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [showIdleHint, setShowIdleHint] = useState(false);

  // Timer for Idle Hint
  useEffect(() => {
    // Only set timer if we are in the empty state (no image, no error)
    if (!imagePreviewUrl && !uploadError) {
      const timer = setTimeout(() => {
        setShowIdleHint(true);
      }, 4000); // 4 seconds delay
      return () => clearTimeout(timer);
    } else {
      setShowIdleHint(false);
    }
  }, [imagePreviewUrl, uploadError]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    // 1. Check if file exists
    if (!file) return;

    // 2. Validate File Type (must be image)
    if (!file.type.startsWith('image/')) {
      if (onError) onError("Invalid file type.", "Please upload an image.");
      // Reset input
      event.target.value = '';
      return;
    }

    // 3. Success
    const url = URL.createObjectURL(file);
    onImageSelected(url, file);
    
    // Reset to allow selecting the same file again if needed
    event.target.value = '';
  };

  const triggerGallery = () => {
    galleryInputRef.current?.click();
  };

  const triggerCamera = () => {
    cameraInputRef.current?.click();
  };

  return (
    <div className="relative w-full h-[60vh] transition-all duration-500 ease-out">
      {/* Hidden Inputs */}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={galleryInputRef}
        onChange={handleFileChange}
      />
      
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        ref={cameraInputRef}
        onChange={handleFileChange}
      />

      <div className={`
        relative w-full h-full rounded-[32px] overflow-hidden border transition-all duration-500 backdrop-blur-md
        ${imagePreviewUrl 
          ? 'border-classik-dark/20 shadow-xl' 
          : uploadError ? 'border-red-400/50 bg-red-50/30' : 'bg-white/30 border-white/60 shadow-sm'}
      `}>
        
        {imagePreviewUrl ? (
          <>
            {/* Image Preview */}
            <img 
              src={imagePreviewUrl} 
              alt="Outfit Preview" 
              className="w-full h-full object-cover"
            />
            
            {/* Soft Overlay Gradient */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />

            {/* Change Photo Button (Top Right) */}
            <button 
              onClick={triggerGallery}
              className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-full bg-white/40 backdrop-blur-xl border border-white/60 text-xs font-bold tracking-tight text-classik-black hover:bg-white/60 transition-all active:scale-95 shadow-sm"
            >
              <RefreshIcon className="w-3.5 h-3.5 opacity-70" />
              Change photo
            </button>
          </>
        ) : (
          /* Phase 1: Only Camera/Gallery Visible */
          <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in relative z-10">
             <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-50 pointer-events-none" />
             
             <div className="flex gap-6 z-10 mb-10">
                <button 
                  onClick={triggerCamera}
                  className="group flex flex-col items-center justify-center w-28 h-28 rounded-[24px] bg-white/40 border border-white/60 backdrop-blur-md transition-all duration-500 hover:bg-white/60 hover:border-classik-dark/20 hover:shadow-lg active:scale-95"
                >
                  <CameraIcon className="w-8 h-8 text-classik-black/40 group-hover:text-classik-dark group-hover:scale-110 transition-all duration-500" />
                  <span className="mt-3 text-[10px] font-bold tracking-[0.2em] uppercase text-classik-black/30 group-hover:text-classik-dark transition-colors duration-500">Camera</span>
                </button>

                <button 
                  onClick={triggerGallery}
                  className="group flex flex-col items-center justify-center w-28 h-28 rounded-[24px] bg-white/40 border border-white/60 backdrop-blur-md transition-all duration-500 hover:bg-white/60 hover:border-classik-dark/20 hover:shadow-lg active:scale-95"
                >
                  <ImageIcon className="w-8 h-8 text-classik-black/40 group-hover:text-classik-dark group-hover:scale-110 transition-all duration-500" />
                  <span className="mt-3 text-[10px] font-bold tracking-[0.2em] uppercase text-classik-black/30 group-hover:text-classik-dark transition-colors duration-500">Gallery</span>
                </button>
             </div>

             <div className="flex flex-col items-center gap-3 max-w-[280px]">
               {uploadError ? (
                 <>
                   <p className="text-red-600 text-sm font-bold tracking-wide">
                     {uploadError.title}
                   </p>
                   <p className="text-classik-black/50 text-xs font-medium leading-relaxed">
                     {uploadError.subtitle}
                   </p>
                   <p className="text-classik-dark/70 text-[10px] uppercase font-bold tracking-widest mt-2 cursor-pointer hover:text-classik-dark" onClick={triggerGallery}>
                     Choose another photo
                   </p>
                 </>
               ) : (
                 <>
                   <p className="text-classik-black text-sm font-bold tracking-wide">
                     Upload a photo to begin
                   </p>
                   <p className="text-classik-black/40 text-xs font-medium leading-relaxed">
                     Good lighting. Full outfit. Clear frame.
                   </p>

                   {showIdleHint && (
                     <p className="text-classik-dark/60 text-[10px] font-medium tracking-wide mt-3 animate-fade-in italic">
                       Capture the intent, don't overthink the pose.
                     </p>
                   )}
                 </>
               )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};