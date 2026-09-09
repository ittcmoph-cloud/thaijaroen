import { checkAdminPassword } from "./auth.js";
import { failure, success } from "./cors.js";
import { bangkokDisplayDate, clampString } from "./utils.js";

const DATASET_ACTIONS = {
  getExecutiveData: "Executive",
  getNewsData: "News",
  getAnnouncementData: "Announcements",
  getKnowledgeData: "Knowledge",
  getBannerData: "Banners",
  getITAData: "ITA",
  getDownloadsData: "Downloads",
  getAboutData: "About",
  getSystemsData: "Systems"
};

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function routeRequest(request, env, repo) {
  const url = new URL(request.url);
  const action = String(url.searchParams.get("action") || "").trim();

  if (!action) {
    return failure(env, request, "ไม่พบคำสั่ง (Action) ที่ระบุ", 400);
  }

  if (DATASET_ACTIONS[action]) {
    if (request.method !== "GET") {
      return failure(env, request, "Method not allowed", 405);
    }
    return success(env, request, await repo.getLegacyDataset(DATASET_ACTIONS[action]));
  }

  switch (action) {
    case "getPopupConfig": {
      if (request.method !== "GET") return failure(env, request, "Method not allowed", 405);
      return success(env, request, await repo.getPopupFirstRow());
    }

    case "getComplaintReport": {
      if (request.method !== "GET") return failure(env, request, "Method not allowed", 405);
      return success(env, request, await repo.getComplaintPublicRows());
    }

    case "getVisitorCount": {
      if (request.method !== "GET") return failure(env, request, "Method not allowed", 405);
      return success(env, request, await repo.incrementVisitorCount());
    }

    case "incrementViewCount": {
      if (request.method !== "GET") return failure(env, request, "Method not allowed", 405);
      const sheetName = clampString(url.searchParams.get("sheetName"), 40);
      const title = clampString(url.searchParams.get("title"), 1000);
      const ok = await repo.incrementView(sheetName, title);
      return success(env, request, ok);
    }

    case "checkAdminLogin": {
      if (request.method !== "POST") {
        return failure(env, request, "Admin login requires POST", 405);
      }

      const body = await readJsonBody(request);
      const password = body.password ?? body.pass ?? "";
      const ok = await checkAdminPassword(env, password);

      return success(env, request, ok
        ? { success: true, sheetUrl: String(env.ADMIN_SHEET_URL || "") }
        : { success: false }
      );
    }

    case "saveComplaint": {
      if (request.method !== "POST") {
        return failure(env, request, "saveComplaint requires POST", 405);
      }

      let body = await readJsonBody(request);

      // Compatibility: accept { data: "{...}" } as well as direct JSON.
      if (typeof body.data === "string") {
        try { body = JSON.parse(body.data); } catch { body = {}; }
      }

      const data = {
        submitted_at: bangkokDisplayDate(),
        type: clampString(body.type, 200),
        topic: clampString(body.topic, 500),
        detail: clampString(body.detail, 10000),
        name: clampString(body.name || "ไม่ระบุ", 300),
        contact: clampString(body.contact || "-", 300)
      };

      if (!data.type || !data.topic || !data.detail) {
        return failure(env, request, "กรุณากรอกประเภท หัวข้อ และรายละเอียดให้ครบ", 400);
      }

      return success(env, request, await repo.saveComplaint(data));
    }

    default:
      return failure(env, request, "ไม่พบคำสั่ง (Action) ที่ระบุ", 404);
  }
}
