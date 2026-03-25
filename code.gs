// ==========================================
// 📌 ฟังก์ชันหลัก (Hybrid Router) ทำหน้าที่เป็นทั้ง Web App และ API
// ==========================================
function doGet(e) {
  // 1. ถ้าไม่มีการร้องขอข้อมูล (เปิดลิงก์เฉยๆ) ให้แสดงหน้าเว็บ Index.html ตัวเดิมไปก่อน
  if (!e || !e.parameter || !e.parameter.action) {
    return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('สำนักงานสาธารณสุขอำเภอไทยเจริญ')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  // 2. ถ้ามีการขอข้อมูล (เป็น API) ให้ส่งข้อมูลกลับไปเป็นก้อน JSON
  var action = e.parameter.action;
  var result = {};

  try {
    // เช็คว่าหน้าเว็บขอข้อมูลเรื่องอะไร ก็ให้ไปดึงฟังก์ชันนั้นมา
    if (action === 'getExecutiveData') result = getExecutiveData();
    else if (action === 'getNewsData') result = getNewsData();
    else if (action === 'getAnnouncementData') result = getAnnouncementData();
    else if (action === 'getKnowledgeData') result = getKnowledgeData();
    else if (action === 'getBannerData') result = getBannerData();
    else if (action === 'getITAData') result = getITAData();
    else if (action === 'getDownloadsData') result = getDownloadsData();
    else if (action === 'getAboutData') result = getAboutData();
    else if (action === 'getSystemsData') result = getSystemsData();
    else if (action === 'getComplaintReport') result = getComplaintReport();
    else if (action === 'getVisitorCount') result = getVisitorCount();
    else if (action === 'getPopupConfig') result = getPopupConfig();
    
    // สำหรับการนับยอดวิว (ต้องรับค่า ชื่อชีต และ ชื่อหัวข้อข่าว)
    else if (action === 'incrementViewCount') {
      var sheetName = e.parameter.sheetName;
      var title = e.parameter.title;
      result = incrementViewCount(sheetName, title);
    }
    else if (action === 'checkAdminLogin') result = checkAdminLogin(e.parameter.pass);
    else if (action === 'saveComplaint') result = saveComplaint(JSON.parse(e.parameter.data));

    else {
      throw new Error("ไม่พบคำสั่ง (Action) ที่ระบุ");
    }
    // ส่งข้อมูลกลับไปให้หน้าเว็บใหม่ (ในรูปแบบ JSON ที่ฝั่ง GitHub อ่านเข้าใจ)
    return ContentService.createTextOutput(JSON.stringify({ status: "success", data: result }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // ถ้าพัง หรือหาข้อมูลไม่เจอ ให้ส่ง Error กลับไป
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
