/**
 * Device Identifier Utility
 * Generates and persists an anonymous client UUID in localStorage.
 * Used for best-effort 1-rating-per-device-per-meal checks without requiring mandatory student logins.
 */

const STORAGE_KEY = 'messsync_device_id';

export function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id || id.length < 16) {
      id = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch (e) {
    // Fallback if localStorage is disabled
    return 'dev_temp_' + Math.random().toString(36).substring(2, 10);
  }
}
