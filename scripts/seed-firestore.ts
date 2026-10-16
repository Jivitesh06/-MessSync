import fs from 'fs';
import { DEFAULT_CHITKARA_TIMINGS } from '@/config/mealTimings';
import { buildWeekMenuForDate } from '@/data/chitkaraInitialMenu';

function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

async function seedFirestore() {
  console.log('🌱 Starting Chitkara Menu & Official Timings Firestore Seeder...');

  const configPath = '/Users/jiviteshgarg/.config/configstore/firebase-tools.json';
  if (!fs.existsSync(configPath)) {
    throw new Error('firebase-tools.json not found in configstore');
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const token = config.tokens?.access_token;
  if (!token) {
    throw new Error('No access_token found in firebase-tools.json');
  }

  const baseUrl = 'https://firestore.googleapis.com/v1/projects/messsync-cu/databases/(default)/documents';
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // 1. Seed /appConfig/mealTimings
  console.log('1️⃣ Seeding /appConfig/mealTimings...');
  const mealTimingsPayload = {
    ...DEFAULT_CHITKARA_TIMINGS,
    updatedAt: new Date().toISOString(),
    updatedBy: 'admin@chitkara.edu.in',
  };
  const timingsRes = await fetch(`${baseUrl}/appConfig/mealTimings`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields: toFirestoreValue(mealTimingsPayload).mapValue.fields }),
  });
  if (!timingsRes.ok) {
    const errText = await timingsRes.text();
    throw new Error(`Failed to seed mealTimings: ${timingsRes.status} ${errText}`);
  }
  console.log('   ✅ /appConfig/mealTimings seeded successfully!');

  // 2. Build the genuine Chitkara week menu for current week (2026-10-12)
  console.log('2️⃣ Seeding /menuWeeks/week-2026-10-12 (Active Chitkara Menu)...');
  const weekMenu = buildWeekMenuForDate('2026-10-12');
  const weekMenuRes = await fetch(`${baseUrl}/menuWeeks/week-2026-10-12`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields: toFirestoreValue(weekMenu).mapValue.fields }),
  });
  if (!weekMenuRes.ok) {
    const errText = await weekMenuRes.text();
    throw new Error(`Failed to seed weekMenu: ${weekMenuRes.status} ${errText}`);
  }
  console.log('   ✅ /menuWeeks/week-2026-10-12 seeded successfully!');

  // 3. Seed /menuVersions/week-2026-10-12-v1
  console.log('3️⃣ Seeding /menuVersions/week-2026-10-12-v1 (Version History Snapshot)...');
  const versionRecord = {
    id: 'week-2026-10-12-v1',
    weekId: 'week-2026-10-12',
    version: 1,
    publishedAt: weekMenu.publishedAt,
    publishedBy: 'admin@chitkara.edu.in',
    data: weekMenu,
    changeSummary: 'Initial verified transcription of official Chitkara Mess schedule',
  };
  const versionRes = await fetch(`${baseUrl}/menuVersions/week-2026-10-12-v1`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields: toFirestoreValue(versionRecord).mapValue.fields }),
  });
  if (!versionRes.ok) {
    const errText = await versionRes.text();
    throw new Error(`Failed to seed versionRecord: ${versionRes.status} ${errText}`);
  }
  console.log('   ✅ /menuVersions/week-2026-10-12-v1 seeded successfully!');

  // 4. Seed /menuDrafts/week-2026-10-12-draft (Admin OCR review draft)
  console.log('4️⃣ Seeding /menuDrafts/week-2026-10-12-draft (Admin Review Draft)...');
  const draftRecord = {
    id: 'week-2026-10-12-draft',
    weekId: 'week-2026-10-12',
    startDate: weekMenu.startDate,
    endDate: weekMenu.endDate,
    label: weekMenu.label,
    days: weekMenu.days,
    hasUncertainDishes: true,
    notes: 'Official Chitkara menu OCR transcription. 2 dessert items flagged for verification due to laminate glare.',
    createdAt: weekMenu.publishedAt,
    updatedAt: weekMenu.publishedAt,
    createdBy: 'admin@chitkara.edu.in',
  };
  const draftRes = await fetch(`${baseUrl}/menuDrafts/week-2026-10-12-draft`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields: toFirestoreValue(draftRecord).mapValue.fields }),
  });
  if (!draftRes.ok) {
    const errText = await draftRes.text();
    throw new Error(`Failed to seed draftRecord: ${draftRes.status} ${errText}`);
  }
  console.log('   ✅ /menuDrafts/week-2026-10-12-draft seeded successfully!');

  console.log('\n🎉 ALL OFFICIAL CHITKARA DATA SUCCESSFULLY SEEDED INTO CLOUD FIRESTORE!');
}

seedFirestore().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
