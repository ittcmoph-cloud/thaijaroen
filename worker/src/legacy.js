const DATASETS = [
  'Executive','News','Announcements','Knowledge','Banners','ITA',
  'Downloads','About','Systems','Complaints','Popup'
];

export async function getLegacyRows(db, dataset) {
  if (!DATASETS.includes(dataset)) throw new Error(`ไม่พบชุดข้อมูล: ${dataset}`);
  const result = await db.prepare(
    'SELECT data_json FROM legacy_rows WHERE dataset = ? ORDER BY row_index'
  ).bind(dataset).all();
  return (result.results || []).map(r => JSON.parse(r.data_json));
}

export async function getLegacyFirstRow(db, dataset) {
  const rows = await getLegacyRows(db, dataset);
  return rows.length ? rows[0] : [];
}

export async function incrementLegacyView(db, sheetName, title) {
  if (!title || !['News', 'Announcements'].includes(sheetName)) return false;
  const result = await db.prepare(
    'SELECT id, data_json FROM legacy_rows WHERE dataset = ? ORDER BY row_index'
  ).bind(sheetName).all();
  const viewIndex = sheetName === 'News' ? 5 : 4;
  for (const row of result.results || []) {
    const data = JSON.parse(row.data_json);
    if (data[1] == title) {
      data[viewIndex] = String((parseInt(data[viewIndex], 10) || 0) + 1);
      await db.prepare(
        'UPDATE legacy_rows SET data_json = ?, updated_at = ? WHERE id = ?'
      ).bind(JSON.stringify(data), new Date().toISOString(), row.id).run();
      return true;
    }
  }
  return false;
}

export function complaintRow(r) {
  return [r.submitted_at, r.type || '', r.topic || '', r.detail || '', r.name || '', r.contact || '', r.status || 'รับเรื่องแล้ว'];
}
