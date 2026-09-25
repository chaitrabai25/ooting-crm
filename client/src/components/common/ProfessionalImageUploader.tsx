import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Star,
  ChevronLeft,
  ChevronRight,
  Info,
  Maximize2,
} from 'lucide-react';
import {
  IMAGE_STANDARDS,
  ImageStandardSpec,
  calculateAspectRatioDisplay,
} from '../../config/imageStandards.js';

export interface UploadedImageMeta {
  id: string;
  url: string;
  name: string;
  width?: number;
  height?: number;
  aspectRatioDisplay?: string;
  aspectRatioNumeric?: number;
  fileSizeBytes?: number;
  fileSizeDisplay?: string;
  isFeatured?: boolean;
  aspectWarning?: string | null;
}

interface ProfessionalImageUploaderProps {
  specId?: keyof typeof IMAGE_STANDARDS;
  category?: keyof typeof IMAGE_STANDARDS;
  customSpec?: Partial<ImageStandardSpec>;
  images?: (UploadedImageMeta | string)[];
  onChange?: (images: UploadedImageMeta[]) => void;
  onUrlListChange?: (urls: string[]) => void;
  // Fallback single-image compatibility
  value?: string;
  onSingleChange?: (url: string) => void;
  className?: string;
  label?: string;
  disabled?: boolean;
  maxImages?: number;
  helperText?: string;
}

export const ProfessionalImageUploader: React.FC<ProfessionalImageUploaderProps> = ({
  specId,
  category,
  customSpec,
  images = [],
  onChange,
  onUrlListChange,
  value,
  onSingleChange,
  className = '',
  label,
  disabled = false,
  maxImages,
  helperText,
}) => {
  const chosenKey = specId || category || 'ITINERARY_DAY';
  const baseSpec = IMAGE_STANDARDS[chosenKey] || IMAGE_STANDARDS.ITINERARY_DAY;
  const spec: ImageStandardSpec = {
    ...baseSpec,
    ...customSpec,
    ...(maxImages ? { maxImages } : {}),
    ...(helperText ? { usageContext: helperText } : {}),
  };

  const [isDragging, setIsDragging] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Normalize images prop (which may be UploadedImageMeta[] or string[]) to UploadedImageMeta[]
  const activeImages: UploadedImageMeta[] = (images || []).map((img, idx) => {
    if (typeof img === 'string') {
      return {
        id: `img_${idx}_${img.slice(-8)}`,
        url: img,
        name: `Photo ${idx + 1}`,
        isFeatured: idx === 0,
      };
    }
    return img;
  });

  if (activeImages.length === 0 && value) {
    activeImages.push({
      id: 'single_0',
      url: value,
      name: 'Uploaded Image',
      isFeatured: true,
    });
  }

  const broadcastChange = (list: UploadedImageMeta[]) => {
    if (onChange) onChange(list);
    if (onUrlListChange) onUrlListChange(list.map((item) => item.url));
    if (onSingleChange) onSingleChange(list[0]?.url || '');
  };

  const handleProcessFile = (file: File): Promise<UploadedImageMeta> => {
    return new Promise((resolve, reject) => {
      // Size check
      if (file.size > spec.maxSizeBytes) {
        alert(
          `File "${file.name}" exceeds the maximum limit of ${spec.maxSizeDisplay} (${(
            file.size /
            (1024 * 1024)
          ).toFixed(1)} MB).`
        );
        return reject(new Error('File too large'));
      }

      // Convert to Data URL for reliable zero-latency storage & cross-platform persistence
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const img = new Image();
        img.onload = () => {
          const width = img.naturalWidth;
          const height = img.naturalHeight;
          const actualRatio = width / height;
          const ratioDisplay = calculateAspectRatioDisplay(width, height);
          const sizeKb = Math.round(file.size / 1024);
          const sizeDisplay =
            sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

          // Check if aspect ratio significantly deviates from recommended
          let aspectWarning: string | null = null;
          if (
            spec.orientation !== 'Flexible' &&
            Math.abs(actualRatio - spec.aspectRatioNumeric) > spec.tolerance
          ) {
            aspectWarning = `Recommended ratio is ${spec.aspectRatioDisplay}. Your image is ${ratioDisplay}. The complete image will be preserved without cropping.`;
          }

          const meta: UploadedImageMeta = {
            id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            url: dataUrl,
            name: file.name,
            width,
            height,
            aspectRatioDisplay: ratioDisplay,
            aspectRatioNumeric: actualRatio,
            fileSizeBytes: file.size,
            fileSizeDisplay: sizeDisplay,
            isFeatured: activeImages.length === 0,
            aspectWarning,
          };
          resolve(meta);
        };
        img.onerror = () => reject(new Error('Failed to read image dimensions'));
        img.src = dataUrl;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || disabled) return;

    try {
      const fileArr = Array.from(files);
      const targets = spec.allowMultiple ? fileArr : [fileArr[0]];
      const processed: UploadedImageMeta[] = [];

      for (const f of targets) {
        try {
          const meta = await handleProcessFile(f);
          processed.push(meta);
        } catch {
          // handled in handleProcessFile
        }
      }

      if (processed.length === 0) return;

      if (!spec.allowMultiple) {
        // Single mode
        broadcastChange(processed.slice(0, 1));
      } else {
        // Multi mode
        const updated = [...activeImages, ...processed];
        broadcastChange(updated);
      }
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = (index: number) => {
    if (disabled) return;
    const updated = activeImages.filter((_, i) => i !== index);
    if (updated.length > 0 && !updated.some((img) => img.isFeatured)) {
      updated[0].isFeatured = true;
    }
    broadcastChange(updated);
  };

  const handleSetFeatured = (index: number) => {
    if (disabled) return;
    const updated = activeImages.map((img, i) => ({
      ...img,
      isFeatured: i === index,
    }));
    broadcastChange(updated);
  };

  const handleMove = (index: number, direction: 'left' | 'right') => {
    if (disabled) return;
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activeImages.length) return;
    const reordered = [...activeImages];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;
    broadcastChange(reordered);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 1. Professional Standard Guidance Card */}
      <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-xs space-y-2">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
            <ImageIcon className="w-4 h-4 text-brand-600 flex-shrink-0" />
            <span>{label || spec.name}</span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200">
            {spec.orientation}
          </span>
        </div>

        {/* Specification Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
          <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200/70 dark:border-slate-700">
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
              Recommended Format
            </span>
            <span className="font-extrabold text-slate-900 dark:text-white block mt-0.5">
              {spec.recommendedWidth} × {spec.recommendedHeight} px
            </span>
            <span className="text-slate-500 font-medium text-[10px]">
              Ratio: {spec.aspectRatioDisplay}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200/70 dark:border-slate-700">
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
              Accepted Types
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
              {spec.acceptedFormatsDisplay}
            </span>
            <span className="text-slate-500 text-[10px]">Max size: {spec.maxSizeDisplay}</span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200/70 dark:border-slate-700">
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
              Quality Standard
            </span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400 block mt-0.5">
              High Resolution
            </span>
            <span className="text-slate-500 text-[10px]">
              {spec.allowMultiple ? 'Multiple photos allowed' : 'Single photo'}
            </span>
          </div>
        </div>

        {/* Guidance Notice */}
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed italic pt-0.5">
          {spec.guidanceText}
        </p>
      </div>

      {/* 2. Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => {
          if (!disabled && fileInputRef.current) fileInputRef.current.click();
        }}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-slate-50'
            : isDragging
            ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/20 shadow-sm'
            : 'border-slate-300 dark:border-slate-700 hover:border-brand-500 hover:bg-slate-50/70 dark:hover:bg-slate-850'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={spec.acceptedMimeTypes.join(',')}
          multiple={spec.allowMultiple}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled}
        />
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-600 flex items-center justify-center">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-xs text-slate-900 dark:text-white">
              {activeImages.length > 0 && spec.allowMultiple
                ? 'Add More Photos'
                : 'Choose or Drag Image'}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Recommended: {spec.recommendedWidth} × {spec.recommendedHeight} px ({spec.aspectRatioDisplay})
            </span>
          </div>
        </div>
      </div>

      {/* 3. Image Previews & Gallery Cards */}
      {activeImages.length > 0 && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>
              {activeImages.length} {activeImages.length === 1 ? 'Image' : 'Images'} Uploaded
            </span>
            {spec.allowMultiple && (
              <span className="text-[11px] text-slate-400 font-normal">
                Click star to set as featured cover photo
              </span>
            )}
          </div>

          <div
            className={`grid gap-3.5 ${
              activeImages.length === 1
                ? 'grid-cols-1 max-w-md'
                : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
            }`}
          >
            {activeImages.map((img, idx) => (
              <div
                key={img.id || idx}
                className={`relative group bg-white dark:bg-slate-900 rounded-xl border overflow-hidden shadow-xs transition-all ${
                  img.isFeatured
                    ? 'border-brand-500 ring-2 ring-brand-500/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Image Container with contain-style proportional scaling (NO CROPPING) */}
                <div className="w-full h-48 bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-1.5 relative overflow-hidden">
                  <img
                    src={img.url}
                    alt={img.name}
                    className="max-w-full max-h-full object-contain rounded-lg transition-transform duration-200 group-hover:scale-[1.02]"
                  />

                  {/* Featured Badge */}
                  {img.isFeatured && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-brand-600 text-white font-bold text-[10px] rounded-md shadow-xs flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" />
                      Featured
                    </span>
                  )}

                  {/* Lightbox / Zoom Action */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxUrl(img.url);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    title="View Full Resolution"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Metadata & Controls Bar */}
                <div className="p-2.5 bg-white dark:bg-slate-900 space-y-2 text-[11px]">
                  <div className="flex items-center justify-between gap-1 text-slate-600 dark:text-slate-400">
                    <span className="truncate font-semibold text-slate-800 dark:text-slate-200 max-w-[140px]" title={img.name}>
                      {img.name}
                    </span>
                    {img.fileSizeDisplay && (
                      <span className="text-[10px] text-slate-400 flex-shrink-0">
                        {img.fileSizeDisplay}
                      </span>
                    )}
                  </div>

                  {/* Dimensions & Ratio Pill */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    {img.width && img.height && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-slate-700 dark:text-slate-300">
                        {img.width} × {img.height} px
                      </span>
                    )}
                    {img.aspectRatioDisplay && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-400">
                        {img.aspectRatioDisplay}
                      </span>
                    )}
                  </div>

                  {/* Non-blocking Aspect Ratio Advisory Warning if applicable */}
                  {img.aspectWarning && (
                    <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[10px] text-amber-800 dark:text-amber-300 flex items-start gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <span>{img.aspectWarning}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                    {/* Reorder Buttons (Multi-mode) */}
                    {spec.allowMultiple && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMove(idx, 'left')}
                          disabled={idx === 0 || disabled}
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 rounded"
                          title="Move Left"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(idx, 'right')}
                          disabled={idx === activeImages.length - 1 || disabled}
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 rounded"
                          title="Move Right"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        {spec.allowFeatured && !img.isFeatured && (
                          <button
                            type="button"
                            onClick={() => handleSetFeatured(idx)}
                            className="p-1 text-slate-400 hover:text-amber-500 rounded"
                            title="Set as Featured Cover"
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Delete Action */}
                    <button
                      type="button"
                      onClick={() => handleDelete(idx)}
                      disabled={disabled}
                      className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded text-[11px] font-semibold transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-70 bg-black/85 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-transparent flex flex-col items-center">
            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-10 right-0 p-1.5 text-white hover:text-red-400"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={lightboxUrl}
              alt="Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};
