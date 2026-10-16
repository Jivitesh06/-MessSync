import fs from 'fs';

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

async function createAdmin() {
  const args = process.argv.slice(2);
  const email = args[0] || 'admin@chitkara.edu.in';
  const password = args[1];

  if (!password) {
    console.log('Usage: npm run create-admin <email> <password>');
    console.log('Example: npm run create-admin admin@chitkara.edu.in MySecureAdminPass123!');
    process.exit(1);
  }

  const apiKey = 'AIzaSyDt8hqsEaIjTQVTndrnKnRGm5n52KjgBI0';
  const projectId = 'messsync-cu';

  console.log(`🔐 Creating Firebase Auth user for ${email}...`);

  // 1. Create user in Firebase Authentication
  const signUpRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true,
    }),
  });

  const signUpData = await signUpRes.json() as any;
  if (!signUpRes.ok) {
    if (signUpData.error?.message === 'EMAIL_EXISTS') {
      console.log(`⚠️ User ${email} already exists in Firebase Auth. Updating Firestore admin role...`);
    } else {
      throw new Error(`Firebase Auth error: ${signUpData.error?.message || JSON.stringify(signUpData)}`);
    }
  }

  const localId = signUpData.localId;
  console.log(`   ✅ Auth user ready (UID: ${localId})`);

  // 2. Grant admin role in Firestore /users/{uid}
  const configPath = '/Users/jiviteshgarg/.config/configstore/firebase-tools.json';
  if (!fs.existsSync(configPath)) {
    throw new Error('firebase-tools.json not found in configstore');
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const token = config.tokens?.access_token;
  if (!token) {
    throw new Error('No access_token found in firebase-tools.json');
  }

  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  const userPayload = {
    role: 'admin',
    email,
    name: 'Mess Administrator',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  console.log(`🛡️ Writing admin role to Firestore /users/${localId}...`);
  const firestoreRes = await fetch(`${baseUrl}/users/${localId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields: toFirestoreValue(userPayload).mapValue.fields }),
  });

  if (!firestoreRes.ok) {
    const errText = await firestoreRes.text();
    throw new Error(`Firestore role write failed: ${firestoreRes.status} ${errText}`);
  }

  console.log(`\n🎉 SUCCESS! Admin user ${email} is now fully provisioned.`);
  console.log(`   You can now log in at: https://messsync-cu.web.app/admin with this password.`);
}

createAdmin().catch((err) => {
  console.error('❌ Failed to provision admin:', err.message);
  process.exit(1);
});
