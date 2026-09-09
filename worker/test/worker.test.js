import test from "node:test";
import assert from "node:assert/strict";
import { handleRequest } from "../src/index.js";

class MemoryRepo {
  constructor() {
    this.datasets = {
      Executive: [["นาย ก", "สาธารณสุขอำเภอ", "img", "1", "สสอ.", "080"]],
      News: [["01/09/2026", "ข่าว A", "pdf", "สสอ.", "img", "7"]],
      Announcements: [["01/09/2026", "ประกาศ A", "url", "ทั่วไป", "3"]],
      Knowledge: [["ความรู้", "https://example.com"]],
      Banners: [["https://example.com/banner.jpg"]],
      ITA: [["ตัวชี้วัดที่ 1", "MOIT 1", "หัวข้อ", "รายละเอียด", "https://example.com/a.pdf"]],
      Downloads: [["แบบฟอร์ม", "https://example.com/a.pdf"]],
      About: [["หมวด", "ย่อย", "หัวข้อ", "url", "หมายเหตุ"]],
      Systems: [["หมวด", "ย่อย", "หัวข้อ", "วิธี", "ประเภท", "วันที่", "url"]]
    };
    this.popup = ["เปิด", "https://example.com/popup.jpg"];
    this.visitors = 10;
    this.complaints = [];
  }

  async getLegacyDataset(dataset) { return this.datasets[dataset] || []; }
  async getPopupFirstRow() { return this.popup; }
  async incrementVisitorCount() { return ++this.visitors; }
  async incrementView(dataset, title) {
    const rows = this.datasets[dataset] || [];
    const row = rows.find(r => r[1] === title);
    if (!row) return false;
    const i = dataset === "News" ? 5 : 4;
    row[i] = String((Number(row[i]) || 0) + 1);
    return true;
  }
  async saveComplaint(data) {
    this.complaints.push({ ...data, status: "รับเรื่องแล้ว", note: "" });
    return { success: true };
  }
  async getComplaintPublicRows() {
    return this.complaints.map(c => [
      c.submitted_at, c.type, c.topic, "", "", "", c.status, c.note
    ]);
  }
}

const env = {
  ALLOWED_ORIGIN: "",
  ADMIN_SHEET_URL: "",
  // sha256("test-pass-123")
  ADMIN_PASSWORD_SHA256: "f8ed4228db4a2c1f29d580a014d4dd9798f3f8231de02ab5f5b360b236269dcc"
};

async function call(action, { method = "GET", params = {}, body = null, repo } = {}) {
  const url = new URL("https://api.example.test/api");
  url.searchParams.set("action", action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const req = new Request(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const res = await handleRequest(req, env, repo);
  return { res, json: await res.json() };
}

for (const action of [
  "getExecutiveData", "getNewsData", "getAnnouncementData",
  "getKnowledgeData", "getBannerData", "getITAData",
  "getDownloadsData", "getAboutData", "getSystemsData"
]) {
  test(`${action} returns legacy array envelope`, async () => {
    const repo = new MemoryRepo();
    const { json } = await call(action, { repo });
    assert.equal(json.status, "success");
    assert.ok(Array.isArray(json.data));
    assert.ok(Array.isArray(json.data[0]));
  });
}

test("getPopupConfig returns first row array", async () => {
  const { json } = await call("getPopupConfig", { repo: new MemoryRepo() });
  assert.deepEqual(json.data, ["เปิด", "https://example.com/popup.jpg"]);
});

test("incrementViewCount keeps News index 5", async () => {
  const repo = new MemoryRepo();
  const first = await call("incrementViewCount", {
    repo, params: { sheetName: "News", title: "ข่าว A" }
  });
  assert.equal(first.json.data, true);
  const news = await call("getNewsData", { repo });
  assert.equal(news.json.data[0][5], "8");
});

test("incrementViewCount keeps Announcements index 4", async () => {
  const repo = new MemoryRepo();
  await call("incrementViewCount", {
    repo, params: { sheetName: "Announcements", title: "ประกาศ A" }
  });
  const rows = await call("getAnnouncementData", { repo });
  assert.equal(rows.json.data[0][4], "4");
});

test("getVisitorCount increments", async () => {
  const repo = new MemoryRepo();
  const a = await call("getVisitorCount", { repo });
  const b = await call("getVisitorCount", { repo });
  assert.equal(a.json.data, 11);
  assert.equal(b.json.data, 12);
});

test("saveComplaint requires POST and stores public-safe 8 columns", async () => {
  const repo = new MemoryRepo();
  const getTry = await call("saveComplaint", { repo });
  assert.equal(getTry.res.status, 405);

  const saved = await call("saveComplaint", {
    repo,
    method: "POST",
    body: {
      type: "ร้องเรียนทั่วไป",
      topic: "หัวข้อ",
      detail: "รายละเอียดลับ",
      name: "นายทดสอบ",
      contact: "0800000000"
    }
  });
  assert.equal(saved.json.data.success, true);

  const report = await call("getComplaintReport", { repo });
  assert.equal(report.json.data[0].length, 8);
  assert.equal(report.json.data[0][3], "");
  assert.equal(report.json.data[0][4], "");
  assert.equal(report.json.data[0][5], "");
  assert.equal(report.json.data[0][6], "รับเรื่องแล้ว");
});

test("checkAdminLogin is POST only", async () => {
  const repo = new MemoryRepo();
  const getTry = await call("checkAdminLogin", { repo });
  assert.equal(getTry.res.status, 405);
});

test("checkAdminLogin rejects wrong password", async () => {
  const repo = new MemoryRepo();
  const { json } = await call("checkAdminLogin", {
    repo, method: "POST", body: { password: "wrong" }
  });
  assert.deepEqual(json.data, { success: false });
});

test("unknown action returns error envelope", async () => {
  const { res, json } = await call("doesNotExist", { repo: new MemoryRepo() });
  assert.equal(res.status, 404);
  assert.equal(json.status, "error");
  assert.ok(json.message);
});
