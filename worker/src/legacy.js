const DATASETS = [
  'Executive','News','Announcements','Knowledge','Banners','ITA',
  'Downloads','About','Systems','Popup'
];

function parseLegacyJson(value) {
  const row = JSON.parse(value);
  if (!Array.isArray(row)) throw new Error('legacy_rows.data_json ต้องเป็น Array');
  return row.map(cell => String(cell ?? ''));
}

export async function getLegacyRows(db, dataset) {
  if (!DATASETS.includes(dataset)) throw new Error(`ไม่พบชุดข้อมูล: ${dataset}`);
  const result = await db.prepare(`
    SELECT lr.id, lr.data_json, lv.view_count
    FROM legacy_rows lr
    LEFT JOIN legacy_views lv
      ON lv.legacy_row_id = lr.id AND lv.dataset = lr.dataset
    WHERE lr.dataset = ?
    ORDER BY lr.row_index
  `).bind(dataset).all();

  const viewIndex = dataset === 'News' ? 5 : dataset === 'Announcements' ? 4 : -1;
  return (result.results || []).map(r => {
    const data = parseLegacyJson(r.data_json);
    if (viewIndex >= 0 && r.view_count !== null && r.view_count !== undefined) {
      data[viewIndex] = String(r.view_count);
    }
    return data;
  });
}

export async function getLegacyFirstRow(db, dataset) {
  const rows = await getLegacyRows(db, dataset);
  return rows.length ? rows[0] : [];
}

export async function incrementLegacyView(db, sheetName, title) {
  if (!title || !['News', 'Announcements'].includes(sheetName)) return false;
  const viewIndex = sheetName === 'News' ? 5 : 4;
  const row = await db.prepare(`
    SELECT lr.id, lr.data_json
    FROM legacy_rows lr
    WHERE lr.dataset = ? AND json_extract(lr.data_json, '$[1]') = ?
    ORDER BY lr.row_index
    LIMIT 1
  `).bind(sheetName, title).first();
  if (!row) return false;

  const now = new Date().toISOString();
  // The increment itself is a single SQLite upsert/update statement, so
  // concurrent requests do not perform a read-modify-write on data_json.
  await db.prepare(`
    INSERT INTO legacy_views(dataset, legacy_row_id, view_count, updated_at)
    VALUES (?, ?, CAST(COALESCE(json_extract(?, '$[${viewIndex}]'), '0') AS INTEGER) + 1, ?)
    ON CONFLICT(dataset, legacy_row_id) DO UPDATE SET
      view_count = legacy_views.view_count + 1,
      updated_at = excluded.updated_at
  `).bind(sheetName, row.id, row.data_json, now).run();
  return true;
}

export function complaintRow(r) {
  return [
    String(r.submitted_at ?? ''), String(r.type ?? ''), String(r.topic ?? ''),
    String(r.detail ?? ''), String(r.name ?? ''), String(r.contact ?? ''),
    String(r.status ?? 'รับเรื่องแล้ว'), String(r.note ?? '')
  ];
}

export function complaintInput(body) {
  return {
    type: String(body?.type ?? ''),
    topic: String(body?.topic ?? ''),
    detail: String(body?.detail ?? ''),
    name: String(body?.name ?? ''),
    contact: String(body?.contact ?? '')
  };
}
