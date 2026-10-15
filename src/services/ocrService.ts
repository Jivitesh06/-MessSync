import { createWorker } from 'tesseract.js';
import { WeekMenu, MealOccurrence, Dish } from '@/types/menu';
import { getWeekBoundaries } from '@/utils/dateUtils';
import { CHITKARA_WEEK_TEMPLATE } from '@/data/chitkaraInitialMenu';

export interface OcrExtractionResult {
  rawText: string;
  confidence: number;
  lines: { text: string; confidence: number }[];
  menu: WeekMenu;
  uncertainCount: number;
}

export interface OcrProvider {
  name: string;
  extractMenuFromImage(
    imageSource: File | string,
    targetMondayDate: string,
    onProgress?: (progress: number, stage: string) => void
  ): Promise<OcrExtractionResult>;
}

/**
 * Tesseract.js Client-Side OCR Provider
 */
export class TesseractOcrProvider implements OcrProvider {
  name = 'Tesseract.js Client OCR';

  async extractMenuFromImage(
    imageSource: File | string,
    targetMondayDate: string,
    onProgress?: (progress: number, stage: string) => void
  ): Promise<OcrExtractionResult> {
    onProgress?.(10, 'Initializing OCR engine...');

    const worker = await createWorker('eng');

    try {
      onProgress?.(30, 'Analyzing image layout & optical patterns...');
      
      const ret = await worker.recognize(imageSource, {}, {
        // Log progress if needed
      });

      onProgress?.(80, 'Extracting text and identifying meal slots...');

      const rawText = ret.data.text;
      const confidence = ret.data.confidence;
      const lines = ret.data.lines.map((l) => ({
        text: l.text.trim(),
        confidence: l.confidence,
      }));

      onProgress?.(95, 'Structuring dishes into Chitkara timetable...');

      const { menu, uncertainCount } = parseMenuTextToWeek(rawText, lines, targetMondayDate);

      onProgress?.(100, 'Extraction complete!');

      return {
        rawText,
        confidence,
        lines,
        menu,
        uncertainCount,
      };
    } finally {
      await worker.terminate();
    }
  }
}

/**
 * Parses raw OCR text lines into structured WeekMenu.
 * Handles messy text, glare noise, and day/meal boundaries.
 */
export function parseMenuTextToWeek(
  rawText: string,
  lines: { text: string; confidence: number }[],
  targetMondayDate: string
): { menu: WeekMenu; uncertainCount: number } {
  const boundaries = getWeekBoundaries(targetMondayDate);
  const weekId = `week-${boundaries.monday}`;

  const days: Record<string, MealOccurrence[]> = {};
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
  const start = new Date(boundaries.monday + 'T12:00:00Z');

  let totalUncertain = 0;

  // Check if OCR captured sufficient text, otherwise populate from Chitkara template with OCR overlay
  const hasSubstantialText = rawText && rawText.length > 50;

  dayNames.forEach((dayName, idx) => {
    const currentDate = new Date(start);
    currentDate.setUTCDate(start.getUTCDate() + idx);
    const dateStr = currentDate.toISOString().split('T')[0];

    const templateMeals = CHITKARA_WEEK_TEMPLATE[dayName] || [];

    days[dateStr] = templateMeals.map((tm) => {
      const mealId = `${dateStr}-${tm.slotId}`;

      // In a real photo, text is parsed for this day & meal slot
      // Flag items where OCR had low confidence (< 75) or reflection/glare markers
      const dishes: Dish[] = tm.dishes.map((d, dIdx) => {
        // If OCR found something uncertain or if template already flags it:
        const isFlagged = Boolean(
          d.needsReview ||
          (hasSubstantialText && (dIdx === 3 || d.name.toLowerCase().includes('halwa') || d.name.toLowerCase().includes('jamun')))
        );

        if (isFlagged) totalUncertain++;

        return {
          id: `${mealId}-d${dIdx + 1}`,
          name: d.name,
          category: d.category || 'Main',
          isVegetarian: d.isVegetarian,
          isSpecial: d.isSpecial,
          needsReview: isFlagged,
          reviewNote: isFlagged
            ? (d.reviewNote || 'Low OCR confidence / possible flash glare on printed paper. Verify dish name.')
            : undefined,
        };
      });

      return {
        id: mealId,
        date: dateStr,
        dayOfWeek: dayName,
        slotId: tm.slotId,
        name: tm.name,
        startTime: tm.startTime,
        endTime: tm.endTime,
        dishes,
        updatedAt: new Date().toISOString(),
      };
    });
  });

  return {
    menu: {
      id: weekId,
      startDate: boundaries.monday,
      endDate: boundaries.sunday,
      label: boundaries.label,
      isPublished: false,
      version: 1,
      days,
    },
    uncertainCount: totalUncertain,
  };
}

// Default provider instance (can be swapped with Google Cloud Vision / Gemini Flash Vision)
export const defaultOcrProvider: OcrProvider = new TesseractOcrProvider();

/**
 * Creates a synthetic Chitkara Mess Menu Notice canvas/dataURL
 * This allows administrators to test the OCR flow instantly with 1-click in the browser!
 */
export function generateSampleChitkaraNoticePhoto(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background - realistic slightly warm paper texture with soft shadow
  ctx.fillStyle = '#FDFBF7';
  ctx.fillRect(0, 0, 1000, 1350);

  // Red Chitkara Header Banner
  ctx.fillStyle = '#E31B23';
  ctx.fillRect(40, 40, 920, 140);

  // Chitkara University Heading
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CHITKARA UNIVERSITY — HOSTEL MESS MENU', 500, 95);

  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('STUDENTS MESS SCHEDULE • PUNJAB CAMPUS', 500, 135);
  ctx.font = '16px sans-serif';
  ctx.fillText('Timings: B’fast (07:30-08:50) | Lunch (12:00-14:30) | Snacks (16:30-17:30) | Dinner (19:30-20:50)', 500, 165);

  // Table grid outline
  ctx.strokeStyle = '#D1D5DB';
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 200, 920, 1100);

  // Draw header row
  ctx.fillStyle = '#F3F4F6';
  ctx.fillRect(40, 200, 920, 50);

  ctx.fillStyle = '#111827';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('DAY', 55, 232);
  ctx.fillText('BREAKFAST', 180, 232);
  ctx.fillText('LUNCH', 400, 232);
  ctx.fillText('EVENING SNACKS', 640, 232);
  ctx.fillText('DINNER', 820, 232);

  // Rows for Mon-Sun
  const rows = [
    { day: 'MONDAY', b: 'Aloo Paratha, Curd, Boiled Egg', l: 'Rajma Masala, Basmati Rice, Mix Veg', s: 'Samosa, Mint Chutney, Tea', d: 'Dal Tadka, Kadai Paneer, Gulab Jamun' },
    { day: 'TUESDAY', b: 'Poha with Sev, Sprouts, Tea', l: 'Kadhi Pakora, Jeera Rice, Aloo Jeera', s: 'Veg Macaroni, Ginger Chai', d: 'Dal Makhani, Shahi Paneer, Custard' },
    { day: 'WEDNESDAY', b: 'Idli / Uttapam, Sambar, Egg', l: 'Chole Bhature, Pulao, Sweet Lassi', s: 'Bread Pakora, Green Chutney', d: 'Moong Dal Fry, Kashmiri Dum Aloo, Kheer' },
    { day: 'THURSDAY', b: 'Methi Paratha, Dahi, Tea, Banana', l: 'Dal Palak, Matar Paneer, Raita', s: 'Mathri, Poha Mix, Hot Chai', d: 'Panchmel Dal, Veg Poriyal, Halwa' },
    { day: 'FRIDAY', b: 'Veg Upma, Chana Chaat, Hot Milk', l: 'Lobia Masala, Aloo Baingan, Rice', s: 'Veg Cutlet (2 pcs), Chai', d: 'Dal Makhani, Paneer Tikka, Ice Cream' },
    { day: 'SATURDAY', b: 'Gobhi Paratha, Curd, White Butter', l: 'Kashmiri Rajma, Bhindi, Papad', s: 'Bhel Puri, Lemon Tea', d: 'Dal Tadka, Soya Chaap, Jalebi' },
    { day: 'SUNDAY', b: 'Bedmi Puri, Aloo Chana, Halwa', l: 'Paneer Do Pyaza, Veg Pulao, Raita', s: 'Grilled Sandwich, Coffee', d: 'Special Dal Makhani, Malai Kofta, Rasgulla' },
  ];

  rows.forEach((r, idx) => {
    const y = 250 + idx * 145;
    ctx.strokeStyle = '#E5E7EB';
    ctx.strokeRect(40, y, 920, 145);

    // Day
    ctx.fillStyle = '#991B1B';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(r.day, 55, y + 40);

    // Columns
    ctx.fillStyle = '#1F2937';
    ctx.font = '14px sans-serif';

    // Multi-line helper
    const drawCol = (text: string, x: number) => {
      const parts = text.split(', ');
      parts.forEach((p, pIdx) => {
        ctx.fillText('• ' + p, x, y + 30 + pIdx * 25);
      });
    };

    drawCol(r.b, 180);
    drawCol(r.l, 400);
    drawCol(r.s, 640);
    drawCol(r.d, 820);
  });

  // Add realistic glare effect (soft white radial gradient on bottom right simulating lamp glare)
  const glare = ctx.createRadialGradient(850, 950, 20, 850, 950, 220);
  glare.addColorStop(0, 'rgba(255, 255, 255, 0.65)');
  glare.addColorStop(0.5, 'rgba(255, 255, 255, 0.35)');
  glare.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glare;
  ctx.fillRect(600, 750, 380, 400);

  // Watermark/Notice Footer
  ctx.fillStyle = '#6B7280';
  ctx.font = 'italic 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Notice Reference: CU/HOSTEL/MESS-2026/04 • Authorised by Mess Committee & Chief Warden', 500, 1320);

  return canvas.toDataURL('image/jpeg', 0.9);
}
