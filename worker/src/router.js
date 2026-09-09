import { getLegacyRows, getLegacyFirstRow, incrementLegacyView, complaintRow } from './legacy.js';
import { githubRawUrl } from './github.js';
import { checkAdminLogin } from './admin.js';

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

  const db = env.DB;
  if (!db) return error('ยังไม่ได้ตั้งค่า D1 binding: DB', 500);

  if (action === 'checkAdminLogin') {
    if (request.method !== 'POST') return error('checkAdminLogin ต้องใช้ POST', 405);
    const body = await jsonBody(request);
    return success(await checkAdminLogin(body.password, env));
  }

  if (action === 'saveComplaint') {
    if (request.method !== 'POST') return error('saveComplaint ต้องใช้ POST', 405);
    const body = await jsonBody(request);
    const submittedAt = nowThai();
    const now = new Date().toISOString();
    await db.prepare(`INSERT INTO complaints
      (submitted_at,type,topic,detail,name,contact,status,created_at,updated_at)
      VALUES (?,?,?,?,? ,?,'รับเรื่องแล้ว',?,?)`)
      .bind(submittedAt, body.type || '', body.topic || '', body.detail || '', body.name || '', body.contact || '', now, now).run();
    return success({ success: true });
  }

  if (action === 'incrementViewCount') {
    const ok = await incrementLegacyView(db, url.searchParams.get('sheetName'), url.searchParams.get('title'));
    return success(ok);
  }

  if (action === 'getVisitorCount') {
    const now = new Date().toISOString();
    await db.prepare(`INSERT INTO settings(key,value,updated_at) VALUES('visitor_count','1',?)
      ON CONFLICT(key) DO UPDATE SET value = CAST(value AS INTEGER) + 1, updated_at = excluded.updated_at`)
      .bind(now).run();
    const row = await db.prepare("SELECT value FROM settings WHERE key='visitor_count'").first();
    return success(parseInt(row?.value || '0', 10));
  }

  if (action === 'getComplaintReport') {
    const result = await db.prepare('SELECT submitted_at,type,topic,detail,name,contact,status FROM complaints ORDER BY id').all();
    return success((result.results || []).map(complaintRow));
  }

  if (action === 'getPopupConfig') return success(await getLegacyFirstRow(db, 'Popup'));

  const datasetMap = {
    getExecutiveData: 'Executive', getNewsData: 'News', getAnnouncementData: 'Announcements',
    getKnowledgeData: 'Knowledge', getBannerData: 'Banners', getDownloadsData: 'Downloads',
    getAboutData: 'About', getSystemsData: 'Systems'
  };
  if (datasetMap[action]) return success(await getLegacyRows(db, datasetMap[action]));

  if (action === 'getITAData') {
    const result = await db.prepare(`SELECT moit,item_code,title,description,github_path
      FROM ita_documents WHERE active=1 ORDER BY moit,sort_order,id`).all();
    return success((result.results || []).map(r => [r.moit, r.item_code || '', r.title, r.description || '', githubRawUrl(r.github_path, env)]));
  }

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
