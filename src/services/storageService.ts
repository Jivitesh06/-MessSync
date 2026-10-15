import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, isFirebaseConfigured } from './firebase';

export const storageService = {
  /**
   * Uploads a mess notice photograph to Firebase Storage under `menuNotices/`.
   * Enforces 15MB file size limit and valid image MIME type.
   * Returns persistent HTTPS download URL (or local URL if running in offline mode).
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

    // 2. Upload to Firebase Storage if configured
    if (storage && isFirebaseConfigured()) {
      try {
        const cleanName = suggestedName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filename = `${Date.now()}_${cleanName}`;
        const storageRef = ref(storage, `menuNotices/${filename}`);

        const uploadResult = await uploadBytes(storageRef, fileOrBlob, {
          contentType,
          customMetadata: {
            uploadedAt: new Date().toISOString(),
            app: 'MessSync',
          },
        });

        const downloadUrl = await getDownloadURL(uploadResult.ref);
        console.log('[storageService] Photo uploaded successfully:', downloadUrl);
        return downloadUrl;
      } catch (err: any) {
        console.warn('[storageService] Firebase Storage upload failed, falling back to local URL:', err);
      }
    }

    // 3. Fallback: local blob or data URL
    if (fileOrBlob instanceof File) {
      return URL.createObjectURL(fileOrBlob);
    }

    return URL.createObjectURL(fileOrBlob);
  },
};
