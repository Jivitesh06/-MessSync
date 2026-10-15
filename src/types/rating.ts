export type FeedbackTag = 'taste' | 'freshness' | 'variety' | 'quantity' | 'temperature';

export const AVAILABLE_FEEDBACK_TAGS: { id: FeedbackTag; label: string; icon: string }[] = [
  { id: 'taste', label: 'Great Taste', icon: '👅' },
  { id: 'freshness', label: 'Fresh & Crisp', icon: '🥗' },
  { id: 'variety', label: 'Good Variety', icon: '🍱' },
  { id: 'quantity', label: 'Generous Quantity', icon: '🍲' },
  { id: 'temperature', label: 'Served Hot', icon: '♨️' },
];

export interface RatingRecord {
  id: string; // generated or hash of mealId_deviceId
  mealId: string; // e.g. "2026-10-15-lunch"
  date: string;
  slotId: string;
  rating: number; // 1 to 5
  tags: FeedbackTag[];
  comment?: string;
  deviceId: string;
  createdAt: string;
  updatedAt: string;
  isModerated?: boolean;
  status: 'published' | 'pending' | 'flagged' | 'hidden';
}

export interface RatingAggregate {
  mealId: string;
  date: string;
  slotId: string;
  mealName: string;
  average: number; // 0.0 - 5.0
  count: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  tagCounts: Record<FeedbackTag, number>;
  lastUpdated: string;
}

export interface PendingRatingQueueItem {
  id: string;
  mealId: string;
  rating: number;
  tags: FeedbackTag[];
  comment?: string;
  deviceId: string;
  timestamp: string;
  synced: boolean;
  retryCount: number;
}
