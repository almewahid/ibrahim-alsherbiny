// migrate/migrate-all-entities.js
// Usage:
// 1) put serviceAccountKey.json in project root (download from Firebase Console -> Service accounts)
// 2) set env vars:
//    export BASE44_API_BASE="https://app.base44.com/api/apps/690b9d1fd794838f61ccd00c"
//    export BASE44_API_KEY="c68999b9823b4f2baad954ae3d4a9d69"
// 3) node migrate/migrate-all-entities.js
//
// Notes: adjust ENTITIES list below if needed.

const fs = require('fs');
const fetch = require('node-fetch'); // npm i node-fetch@2
const admin = require('firebase-admin');

const SERVICE_ACCOUNT_PATH = './serviceAccountKey.json';
if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('Please place your Firebase service account JSON at', SERVICE_ACCOUNT_PATH);
  process.exit(1);
}

const serviceAccount = require(SERVICE_ACCOUNT_PATH);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const BASE44_API_BASE = process.env.BASE44_API_BASE || 'https://app.base44.com/api/apps/690b9d1fd794838f61ccd00c';
const BASE44_API_KEY = process.env.BASE44_API_KEY || ''; // use header 'api_key' per Base44 example

if (!BASE44_API_KEY) {
  console.error('Please set BASE44_API_KEY environment variable.');
  process.exit(1);
}

// List of entities to migrate (you provided these)
const ENTITIES = [
  'TeacherProfile',
  'EducationalCenter',
  'StudyGroup',
  'Coupon',
  'Message',
  'ContactPayment',
  'PlatformSettings',
  'Enrollment',
  'Assignment',
  'AssignmentSubmission',
  'Review',
  'LearningObjective',
  'PersonalGoal',
  'Announcement',
  'ChatMessage',
  'VideoSession',
  'Notification',
  'EducationalService',
  'ServiceOrder',
  'Payment',
  'Wallet',
  'WithdrawalRequest',
  'Attendance',
  'StudyMaterial'
];

// helper: smart parse response to array
async function parseResponseToArray(res) {
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch (e) {
    // not json?
    throw new Error('Invalid JSON from Base44: ' + text.slice(0, 200));
  }
  // Flexible shapes:
  if (Array.isArray(json)) return json;
  if (json.data && Array.isArray(json.data)) return json.data;
  if (json.results && Array.isArray(json.results)) return json.results;
  if (json.items && Array.isArray(json.items)) return json.items;
  // If it's an object but not array, try to return as single-item array
  return [json];
}

function isDateString(val) {
  if (!val || typeof val !== 'string') return false;
  const t = Date.parse(val);
  return !isNaN(t);
}

function convertDatesInObject(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(convertDatesInObject);
  if (typeof obj === 'object') {
    const out = {};
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (typeof v === 'string' && isDateString(v)) {
        out[k] = admin.firestore.Timestamp.fromDate(new Date(v));
      } else if (typeof v === 'object' && v !== null) {
        out[k] = convertDatesInObject(v);
      } else {
        out[k] = v;
      }
    }
    return out;
  }
  return obj;
}

async function fetchEntityRecords(entityName) {
  const url = `${BASE44_API_BASE}/entities/${entityName}`;
  console.log('Fetching', url);
  const res = await fetch(url, {
    headers: {
      'api_key': BASE44_API_KEY,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Base44 API error for ${entityName}: ${res.status} ${txt}`);
  }
  const arr = await parseResponseToArray(res);
  return arr;
}

async function migrateCollection(collectionName, records) {
  if (!records || records.length === 0) {
    console.log(`No records for ${collectionName}`);
    return;
  }
  console.log(`Migrating ${records.length} records -> ${collectionName}`);
  let batch = db.batch();
  let count = 0;
  for (const rec of records) {
    // preserve id if exists; else generate new
    const docId = (rec.id || rec._id || rec.uid) ? String(rec.id || rec._id || rec.uid) : db.collection(collectionName).doc().id;
    const docRef = db.collection(collectionName).doc(docId);
    // convert dates recursively
    const mapped = convertDatesInObject(rec);
    // remove read-only/unwanted fields? for now keep as-is
    batch.set(docRef, mapped, { merge: true });
    count++;
    if (count % 400 === 0) {
      await batch.commit();
      console.log(`Committed batch of 400 for ${collectionName}`);
      batch = db.batch();
    }
  }
  await batch.commit();
  console.log(`Finished ${collectionName}: ${count} docs`);
}

async function migrateAll() {
  for (const ent of ENTITIES) {
    try {
      const records = await fetchEntityRecords(ent);
      await migrateCollection(ent, records);
    } catch (err) {
      console.error('Error migrating', ent, err.message || err);
      // continue to next entity
    }
  }
  console.log('All entities processed.');
}

migrateAll().catch(err => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
