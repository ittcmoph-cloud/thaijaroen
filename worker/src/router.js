import { getLegacyRows, getLegacyFirstRow, incrementLegacyView, complaintRow, complaintInput } from './legacy.js';
import { checkAdminLogin } from './admin.js';

const DATASET_MAP = {
  getExecutiveData: 'Executive',
  getNewsData: 'News',
  getAnnouncementData: 'Announcements',
  getKnowledgeData: 'Knowledge',
  getBannerData: 'Banners',
  getDownloadsData: 'Downloads',
  getAboutData: 'About',
  getSystemsData: 'Systems'
};

const GET_ACTIONS = new Set([
  ...Object.keys(DATASET_MAP),
  'getITAData', 'getComplaintReport', 'getVisitorCount', 'getPopupConfig', 'incrementViewCount'
]);

function nowThai() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(new Date()).reduce((a, p) => (a[p.type] = p.value, a), {});
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}

export async function route(request, env) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  if (!action) return error('ไม่พบคำสั่ง (Action) ที่ระบุ', 400);

  if (action === 'checkAdminLogin') {
    if (request.method !== 'POST') return error('checkAdminLogin ต้องใช้ POST', 405);
    const body = await jsonBody(request);
    return success(await checkAdminLogin(body.password, env));
  }

  if (action === 'saveComplaint') {
    if (request.method !== 'POST') return error('saveComplaint ต้องใช้ POST', 405);
    const body = complaintInput(await jsonBody(request));
    const submittedAt = nowThai();
    const now = new Date().toISOString();
    await env.DB.prepare(`INSERT INTO complaints
      (submitted_at,type,topic,detail,name,contact,status,note,created_at,updated_at)
      VALUES (?,?,?,?,?,?, 'รับเรื่องแล้ว','',?,?)`)
      .bind(submittedAt, body.type, body.topic, body.detail, body.name, body.contact, now, now).run();
    return success({ success: true });
  }

  if (action === 'incrementViewCount') {
    if (request.method !== 'GET' && request.method !== 'POST') return error('incrementViewCount ต้องใช้ GET หรือ POST', 405);
    const ok = await incrementLegacyView(env.DB, url.searchParams.get('sheetName'), url.searchParams.get('title'));
    return success(ok);
  }

  if (action === 'getVisitorCount') {
    if (request.method !== 'GET') return error('getVisitorCount ต้องใช้ GET', 405);
    const now = new Date().toISOString();
    await env.DB.prepare(`INSERT INTO settings(key,value,updated_at) VALUES('visitor_count','1',?)
      ON CONFLICT(key) DO UPDATE SET value = CAST(value AS INTEGER) + 1, updated_at = excluded.updated_at`)
      .bind(now).run();
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key='visitor_count'").first();
    return success(parseInt(row?.value || '0', 10));
  }

  if (action === 'getComplaintReport') {
    if (request.method !== 'GET') return error('getComplaintReport ต้องใช้ GET', 405);
    const result = await env.DB.prepare('SELECT submitted_at,type,topic,detail,name,contact,status,note FROM complaints ORDER BY id').all();
    return success((result.results || []).map(complaintRow));
  }

  if (action === 'getPopupConfig') {
    if (request.method !== 'GET') return error('getPopupConfig ต้องใช้ GET', 405);
    return success(await getLegacyFirstRow(env.DB, 'Popup'));
  }

  if (DATASET_MAP[action]) {
    if (request.method !== 'GET') return error(`${action} ต้องใช้ GET`, 405);
    return success(await getLegacyRows(env.DB, DATASET_MAP[action]));
  }

  if (action === 'getITAData') {
    if (request.method !== 'GET') return error('getITAData ต้องใช้ GET', 405);
    // Phase 1 compatibility rule: ITA must come from legacy_rows so the
    // original column order and display strings are preserved exactly.
    return success(await getLegacyRows(env.DB, 'ITA'));
  }

  if (action === 'unknown') return error('ไม่พบคำสั่ง (Action) ที่ระบุ', 400);
  return error('ไม่พบคำสั่ง (Action) ที่ระบุ', 400);
}

async function jsonBody(request) {
  try { return await request.json(); } catch { throw new Error('รูปแบบ JSON ไม่ถูกต้อง'); }
}

export function success(data, status = 200) {
  return new Response(JSON.stringify({ status: 'success', data }), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
export function error(message, status = 500) {
  return new Response(JSON.stringify({ status: 'error', message }), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}

export { GET_ACTIONS };
