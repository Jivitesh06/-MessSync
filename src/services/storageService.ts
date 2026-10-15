import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, isFirebaseConfigured } from './firebase';

export const storageService = {
  /**
   * Processes a mess notice photograph locally for in-browser OCR.
   * Under the Firebase Spark Free-Tier plan, photographs remain local in browser memory
   * (via Object URLs) and are not uploaded to Cloud Storage, avoiding paid plan upgrades.
   * Enforces 15MB file size limit and valid image MIME type.
   */
  async uploadMenuNoticePhoto(
    fileOrBlob: File | Blob,
    suggestedName: string = 'notice.jpg'
  ): Promise<string> {
    // 1. Validation
    if (fileOrBlob.size > 15 * 1024 * 1024) {
      throw new Error('Image exceeds 15MB limit. Please upload a smaller photograph.');
    }

    const contentType = fileOrBlob.type || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      throw new Error('Invalid file format. Only image files (JPG, PNG, WebP) are permitted.');
    }

    // 2. Spark Free-Tier: In-browser object URL for client-side Tesseract.js OCR
    const localUrl = URL.createObjectURL(fileOrBlob);
    console.info('[storageService] Spark Free-Tier: Processing photo locally in browser memory without cloud upload.');
    return localUrl;
  },

  /**
   * Indicates whether persistent Firebase Cloud Storage is active.
   * Always false under the Spark plan.
   */
  isCloudStorageEnabled(): boolean {
    return false;
  },
};
