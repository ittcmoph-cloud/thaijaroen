import test from 'node:test';
import assert from 'node:assert/strict';
import { route } from '../src/router.js';

const datasets = {
  News: [["01/09/2569","ข่าว A","/a","ทั่วไป","img","10"]],
  Announcements: [["01/09/2569","ประกาศ A","/a","หมวด","7"]],
  Executive: [["นาย ก","ผอ.","img","1","สสอ.","0800000000"]],
  Knowledge: [["ความรู้","/k"]],
  Banners: [["/banner.jpg"]],
  ITA: [["MOIT1","1.1","เอกสาร","รายละเอียด","old-url.pdf"]],
  Downloads: [["ดาวน์โหลด","/d"]],
  About: [["เกี่ยวกับ","ทั่วไป","ข้อความ","/a",""]],
  Systems: [["ระบบ","ย่อย","ชื่อระบบ","","web","","/s"]],
  Popup: [["เปิด","/popup.jpg"]]
};

class FakeDB {
  constructor() {
    this.rows = new Map(Object.entries(datasets).map(([k,v]) => [k, v.map((data_json, i) => ({id: i+1, row_index:i, data_json: JSON.stringify(data_json)}))]));
    this.views = new Map([['News:1',10],['Announcements:1',7]]);
    this.settings = { visitor_count: '0' };
    this.complaints = [];
  }
  prepare(sql) { return new Statement(this, sql); }
}

class Statement {
  constructor(db, sql) { this.db=db; this.sql=sql; this.args=[]; }
  bind(...args) { this.args=args; return this; }
  async all() {
    const s=this.sql;
    if (s.includes('FROM legacy_rows lr')) {
      const dataset=this.args[0];
      const rows=this.db.rows.get(dataset)||[];
      return {results: rows.map(r => ({...r, view_count: this.db.views.get(`${dataset}:${r.id}`) ?? null}))};
    }
    if (s.includes('SELECT submitted_at,type,topic,detail,name,contact,status,note FROM complaints')) {
      return {results:this.db.complaints};
    }
    return {results:[]};
  }
  async first() {
    if (this.sql.includes("WHERE dataset = ? AND json_extract")) {
      const [dataset,title]=this.args;
      return (this.db.rows.get(dataset)||[]).find(r=>JSON.parse(r.data_json)[1] == title) || null;
    }
    if (this.sql.includes("SELECT value FROM settings")) return {value:this.db.settings.visitor_count};
    return null;
  }
  async run() {
    if (this.sql.includes('INSERT INTO complaints')) {
      const [submitted_at,type,topic,detail,name,contact,created_at,updated_at]=this.args;
      this.db.complaints.push({submitted_at,type,topic,detail,name,contact,status:'รับเรื่องแล้ว',note:'',created_at,updated_at});
      return {success:true};
    }
    if (this.sql.includes("INSERT INTO settings")) {
      this.db.settings.visitor_count=String(Number(this.db.settings.visitor_count)+1);
      return {success:true};
    }
    if (this.sql.includes('INSERT INTO legacy_views')) {
      const [dataset,rowId,dataJson]=this.args;
      const viewIndex=dataset==='News'?5:4;
      const key=`${dataset}:${rowId}`;
      const initial=Number(JSON.parse(dataJson)[viewIndex]||0);
      this.db.views.set(key,(this.db.views.get(key) ?? initial)+1);
      return {success:true};
    }
    return {success:true};
  }
}

function env() {
  return { DB:new FakeDB(), ADMIN_PASSWORD_SHA256:'9c8d0f9c8f7f2e8e6a7f5a6f9b3c8c0f8d1b8a5e2a9a4d4a7d0f5b1a3c2e9f1', ADMIN_SHEET_URL:'' };
}

async function json(response) { return response.json(); }

for (const action of ['getNewsData','getAnnouncementData','getExecutiveData','getKnowledgeData','getBannerData','getDownloadsData','getAboutData','getSystemsData']) {
  test(`${action} returns legacy arrays`, async () => {
    const res=await route(new Request(`https://example.com/api?action=${action}`), env());
    assert.equal(res.status,200);
    const body=await json(res);
    assert.equal(body.status,'success');
    assert.ok(Array.isArray(body.data));
    assert.ok(Array.isArray(body.data[0]));
  });
}

test('getITAData uses legacy_rows and preserves 5 columns', async () => {
  const body=await json(await route(new Request('https://example.com/api?action=getITAData'),env()));
  assert.deepEqual(body.data,datasets.ITA);
});

test('getPopupConfig returns first legacy row', async () => {
  const body=await json(await route(new Request('https://example.com/api?action=getPopupConfig'),env()));
  assert.deepEqual(body.data,datasets.Popup[0]);
});

test('incrementViewCount atomically increments News index 5', async () => {
  const e=env();
  const url='https://example.com/api?action=incrementViewCount&sheetName=News&title=%E0%B8%82%E0%B9%88%E0%B8%B2%E0%B8%A7%20A';
  assert.equal((await json(await route(new Request(url),e))).data,true);
  assert.equal(e.DB.views.get('News:1'),11);
});

test('getVisitorCount increments D1 counter', async () => {
  const e=env();
  assert.equal((await json(await route(new Request('https://example.com/api?action=getVisitorCount'),e))).data,1);
  assert.equal((await json(await route(new Request('https://example.com/api?action=getVisitorCount'),e))).data,2);
});

test('saveComplaint writes status and empty note', async () => {
  const e=env();
  const req=new Request('https://example.com/api?action=saveComplaint',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'ร้องเรียน',topic:'ทดสอบ',detail:'รายละเอียด',name:'ผู้แจ้ง',contact:'000'})});
  const body=await json(await route(req,e));
  assert.deepEqual(body.data,{success:true});
  assert.equal(e.DB.complaints[0].status,'รับเรื่องแล้ว');
  assert.equal(e.DB.complaints[0].note,'');
});

test('getComplaintReport returns 8 columns', async () => {
  const e=env();
  e.DB.complaints.push({submitted_at:'01/09/2569 10:00',type:'x',topic:'y',detail:'z',name:'n',contact:'c',status:'รับเรื่องแล้ว',note:''});
  const body=await json(await route(new Request('https://example.com/api?action=getComplaintReport'),e));
  assert.equal(body.data[0].length,8);
  assert.equal(body.data[0][7],'');
});

test('checkAdminLogin is POST-only and never reads password from URL', async () => {
  const e=env();
  const get=await route(new Request('https://example.com/api?action=checkAdminLogin&password=secret'),e);
  assert.equal(get.status,405);
  const post=await route(new Request('https://example.com/api?action=checkAdminLogin',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:'wrong'})}),e);
  assert.deepEqual((await json(post)).data,{success:false});
});

test('unknown action returns error envelope', async () => {
  const body=await json(await route(new Request('https://example.com/api?action=noSuchAction'),env()));
  assert.equal(body.status,'error');
});
