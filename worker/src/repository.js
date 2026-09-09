import { overlayView, parseLegacyRow } from "./utils.js";

export class D1Repository {
  constructor(db) {
    if (!db) throw new Error("D1 binding DB is missing");
    this.db = db;
  }

  async getLegacyDataset(dataset) {
    const result = await this.db.prepare(`
      SELECT l.row_index, l.data_json, COALESCE(v.view_count, 0) AS view_count
      FROM legacy_rows l
      LEFT JOIN view_counters v
        ON v.dataset = l.dataset AND v.row_index = l.row_index
      WHERE l.dataset = ?
      ORDER BY l.row_index ASC
    `).bind(dataset).all();

    return (result.results || []).map(r => {
      const row = parseLegacyRow(r.data_json);
      return overlayView(dataset, row, r.view_count);
    });
  }

  async getPopupFirstRow() {
    const row = await this.db.prepare(`
      SELECT data_json
      FROM legacy_rows
      WHERE dataset = 'Popup'
      ORDER BY row_index ASC
      LIMIT 1
    `).first();

    return row ? parseLegacyRow(row.data_json) : [];
  }

  async incrementView(dataset, title) {
    if (!["News", "Announcements"].includes(dataset)) return false;

    const row = await this.db.prepare(`
      SELECT row_index
      FROM legacy_rows
      WHERE dataset = ? AND title_text = ?
      ORDER BY row_index ASC
      LIMIT 1
    `).bind(dataset, title).first();

    if (!row) return false;

    await this.db.prepare(`
      INSERT INTO view_counters(dataset, row_index, view_count, updated_at)
      VALUES (?, ?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(dataset, row_index)
      DO UPDATE SET
        view_count = view_counters.view_count + 1,
        updated_at = CURRENT_TIMESTAMP
    `).bind(dataset, row.row_index).run();

    return true;
  }

  async incrementVisitorCount() {
    await this.db.prepare(`
      INSERT INTO settings(key, value_integer, updated_at)
      VALUES ('visitor_count', 1, CURRENT_TIMESTAMP)
      ON CONFLICT(key)
      DO UPDATE SET
        value_integer = COALESCE(settings.value_integer, 0) + 1,
        updated_at = CURRENT_TIMESTAMP
    `).run();

    const row = await this.db.prepare(`
      SELECT COALESCE(value_integer, 0) AS value
      FROM settings
      WHERE key = 'visitor_count'
    `).first();

    return Number(row?.value || 0);
  }

  async saveComplaint(data) {
    await this.db.prepare(`
      INSERT INTO complaints(
        submitted_at, type, topic, detail, name, contact, status, note
      ) VALUES (?, ?, ?, ?, ?, ?, 'รับเรื่องแล้ว', '')
    `).bind(
      data.submitted_at,
      data.type,
      data.topic,
      data.detail,
      data.name,
      data.contact
    ).run();

    return { success: true };
  }

  async getComplaintPublicRows() {
    const result = await this.db.prepare(`
      SELECT submitted_at, type, topic, status, note
      FROM complaints
      ORDER BY id DESC
    `).all();

    // Preserve 8-column legacy shape but do not expose
    // detail, name or contact on a public endpoint.
    return (result.results || []).map(r => [
      String(r.submitted_at || ""),
      String(r.type || ""),
      String(r.topic || ""),
      "",
      "",
      "",
      String(r.status || "รับเรื่องแล้ว"),
      String(r.note || "")
    ]);
  }
}
