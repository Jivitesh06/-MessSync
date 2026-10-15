import React, { useState } from 'react';
import { Upload, Image as ImageIcon, Sparkles, RefreshCw, X, AlertCircle, ArrowRight } from 'lucide-react';
import { defaultOcrProvider, generateSampleChitkaraNoticePhoto, OcrExtractionResult } from '@/services/ocrService';
import { getTodayIST, getWeekBoundaries } from '@/utils/dateUtils';
import { WeekMenu } from '@/types/menu';

interface PhotoUploadViewProps {
  onExtractionComplete: (result: OcrExtractionResult, photoUrl: string, targetMonday: string) => void;
  currentPublishedWeek: WeekMenu;
}

export const PhotoUploadView: React.FC<PhotoUploadViewProps> = ({
  onExtractionComplete,
  currentPublishedWeek,
}) => {
  const todayStr = getTodayIST();
  const { monday: defaultMonday } = getWeekBoundaries(todayStr);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [targetMonday, setTargetMonday] = useState<string>(defaultMonday);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file (JPG, PNG, or WebP).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('Image size exceeds 15MB limit. Please upload a smaller photograph.');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleLoadSamplePhoto = () => {
    setErrorMessage(null);
    setSelectedFile(null);
    const sampleDataUrl = generateSampleChitkaraNoticePhoto();
    setPreviewUrl(sampleDataUrl);
  };

  const handleStartExtraction = async () => {
    if (!previewUrl) return;

    setIsProcessing(true);
    setProgress(5);
    setStatusMessage('Preparing image for optical recognition...');
    setErrorMessage(null);

    try {
      const source = selectedFile || previewUrl;
      const result = await defaultOcrProvider.extractMenuFromImage(
        source,
        targetMonday,
        (p, status) => {
          setProgress(p);
          setStatusMessage(status);
        }
      );

      setIsProcessing(false);
      onExtractionComplete(result, previewUrl, targetMonday);
    } catch (err: any) {
      console.error(err);
      setIsProcessing(false);
      setErrorMessage(err.message || 'OCR extraction failed. You can retry or enter dishes manually.');
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-subtle space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-chitkara">
          <span>Step 1 of 4 • Menu Digitization</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
          Upload Mess Notice Photograph
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Upload a photograph of the printed hostel mess notice board. Our OCR engine will scan dishes and assign them to meal categories.
        </p>
      </div>

      {/* Target Week Selector */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
          Target Week Starting Date (Monday):
        </label>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="date"
            value={targetMonday}
            onChange={(e) => setTargetMonday(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-800 bg-white focus:outline-hidden focus:border-chitkara"
          />
          <span className="text-xs text-slate-500">
            Selected: <strong className="text-slate-700">{getWeekBoundaries(targetMonday).label}</strong>
          </span>
        </div>
      </div>

      {/* Upload Box / Image Preview */}
      {!previewUrl ? (
        <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 sm:p-10 text-center hover:border-chitkara/60 transition-colors bg-slate-50/50">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-chitkara flex items-center justify-center mx-auto mb-3 shadow-2xs">
            <Upload className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Drag & Drop or Choose Notice Photo
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Supports high-resolution camera photos (JPG, PNG). Ensure text is clearly visible.
          </p>

          <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
            <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-chitkara hover:bg-chitkara-dark text-white font-bold text-xs shadow-xs transition-colors active-press">
              <span>Select Photo from Device</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={handleLoadSamplePhoto}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Load Chitkara Sample Notice Photo</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center max-h-[460px]">
            <img
              src={previewUrl}
              alt="Mess Notice"
              className="max-h-[460px] w-auto object-contain"
            />
            {!isProcessing && (
              <button
                onClick={() => {
                  setPreviewUrl(null);
                  setSelectedFile(null);
                }}
                className="absolute top-3 right-3 p-2 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white shadow-md transition-colors"
                title="Remove photo"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>Notice photograph loaded ready for OCR analysis.</span>
            {!isProcessing && (
              <label className="text-chitkara font-bold hover:underline cursor-pointer">
                <span>Replace Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      )}

      {/* Error display */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Progress Bar when extracting */}
      {isProcessing && (
        <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-chitkara" />
              <span>{statusMessage}</span>
            </span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-chitkara transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Action Button */}
      {previewUrl && !isProcessing && (
        <div className="pt-2">
          <button
            onClick={handleStartExtraction}
            className="w-full py-3.5 px-4 rounded-xl bg-chitkara hover:bg-chitkara-dark text-white font-extrabold text-sm shadow-xs transition-colors active-press flex items-center justify-center gap-2"
          >
            <span>Scan & Extract Dishes with OCR</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
