/* =====================================================
   Tiza Food - Servidor local (sin dependencias)
   Uso:  node server.js   ->  abre http://localhost:3000
   Sirve la app y guarda usuarios, reseñas y pedidos en data/*.json.
   ===================================================== */
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
// Prototipo escolar: TIZA_DEMO_TRACKING=0 permite usar exclusivamente el avance del personal.
const DEMO_TRACKING = process.env.TIZA_DEMO_TRACKING !== '0';
// En una copia nueva, crea datos locales vacíos desde los ejemplos del repositorio.
// Nunca reemplaza los datos que ya existen.
const DATA_DIR = path.join(ROOT, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
for (const name of ['db','usuarios']) {
  const localFile=path.join(DATA_DIR,name+'.json');
  const example=path.join(DATA_DIR,name+'.example.json');
  if (!fs.existsSync(localFile) && fs.existsSync(example)) fs.copyFileSync(example,localFile,fs.constants.COPYFILE_EXCL);
}
const DB_FILE = path.join(DATA_DIR, "db.json");
const USERS_FILE = path.join(DATA_DIR, "usuarios.json");
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml", ".ico": "image/x-icon"
};
const PRIVATE = new Set(["/db.json", "/usuarios.json", "/resenas.json", "/server.js", "/access.js", "/reviews.js"]);

const readDB = () => {
  let db;try{db=JSON.parse(fs.readFileSync(DB_FILE,'utf8').replace(/^\uFEFF/,''));}catch(error){throw Error('No se pudo leer data/db.json. Se conserva sin reemplazar tus pedidos.');}
  db.tracking={demo:DEMO_TRACKING,stageSeconds:FoodManagement.demoStageSeconds.slice()};
  const previous=db.orders||[],now=Date.now(),updated=previous.map(order=>FoodManagement.autoAdvance(order,now,DEMO_TRACKING));
  if(updated.some((order,index)=>order!==previous[index])){db.orders=updated;writeDB(db);}
  return db;
};
function writeDB(db) {
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}
const send = (res, code, data) => {
  res.writeHead(code, { "Content-Type": TYPES[".json"], "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
};
const clean = (v, n) => String(v == null ? "" : v).slice(0, n);

function readBody(req) {
  return new Promise((resolve, reject) => {
    let s = "";
    req.on("data", (c) => { s += c; if (s.length > 1e6) { reject(new Error("demasiado grande")); req.destroy(); } });
    req.on("end", () => { try { resolve(s ? JSON.parse(s) : {}); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}

// Lo que ve cualquiera: catálogo y reseñas (sin pedidos ni correos)
function publicDB(db, me) {
  const out = Object.assign({}, db);
  delete out.orders;
  out.reviews = reviews.public(db, me);
  return out;
}

const FoodManagement = require("./js/management");
const reviews = require('./js/reviews')(DATA_DIR, readDB());
const access = require("./js/access")(__dirname, { send, readBody, readDB, writeDB });
async function api(req, res, url) {
  if (await access.handler(req, res, url)) return;
  const db = readDB();
  if (req.method === "GET" && url.pathname === "/api/db") {
    const out = publicDB(db, access.current(req));
    return send(res, 200, out);
  }

  if(req.method==='GET'&&url.pathname==='/api/reviews')return send(res,200,{reviews:reviews.public(db,access.current(req))});
  if(req.method==='GET'&&url.pathname==='/api/reviews/eligible')return send(res,200,{products:reviews.eligible(db,access.current(req))});
  if (req.method === "POST" && url.pathname === "/api/reviews") {
    const b = await readBody(req);
    const me = access.current(req);
    const review=reviews.create(readDB(),me,b);
    return send(res, 201, { ok: true, review });
  }

  const del = url.pathname.match(/^\/api\/reviews\/([^/]+)$/);
  if (req.method === "DELETE" && del) {
    const id = decodeURIComponent(del[1]);
    const me = access.current(req);
    reviews.remove(me,id);
    return send(res, 200, { ok: true });
  }

  if (req.method === "POST" && url.pathname === "/api/orders") {
    const b = await readBody(req);
    const db = readDB();
    const customer = access.current(req);
    if (!customer) return send(res, 401, { error: "Inicia sesión para pedir." });
    if ((db.orders || []).some(o => o.folio === b.folio && o.owner !== customer.email)) return send(res, 403, { error: "Pedido de otra cuenta." });
    if (typeof b.folio !== "string" || !Array.isArray(b.items)) return send(res, 400, { error: "pedido inválido" });
    if (!(db.orders || []).some(o=>o.folio===b.folio)) Object.assign(b,FoodManagement.pricing(b.items,b.fee,b.couponCode));
    // Nunca se guardan datos de tarjeta: solo marca y últimos 4 dígitos
    const payment = b.payment ? { method: clean(b.payment.method, 20), brand: clean(b.payment.brand, 20), last4: clean(b.payment.last4, 4), status: b.payment.method === "Efectivo" ? "Pendiente de cobro" : b.payment.method === "Transferencia" ? "Pendiente de verificación" : "" } : null;
    if (payment && payment.method === "Efectivo") {
      const amount = b.payment.cashAmount, total = b.total;
      if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(Math.round(amount * 100)) || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001 || typeof total !== "number" || !Number.isFinite(total) || total < 0 || !Number.isSafeInteger(Math.round(total * 100)) || Math.round(amount * 100) < Math.round(total * 100)) {
        return send(res, 400, { error: "La cantidad en efectivo debe ser válida y cubrir el total." });
      }
      payment.cashAmount = Math.round(amount * 100) / 100;
      payment.change = (Math.round(amount * 100) - Math.round(total * 100)) / 100;
    }
    if (payment && payment.method === "Transferencia") {
      const config = db.transfer || {};
      if (!String(config.bank || "").trim() || !String(config.holder || "").trim() || (config.demo !== true && !/^\d{18}$/.test(String(config.clabe || "").trim()))) return send(res, 400, { error: "Datos bancarios pendientes de configurar." });
      const reference = typeof b.payment.reference === "string" ? b.payment.reference.trim() : "";
      if (reference.length < 3 || reference.length > 100 || /[\u0000-\u001f\u007f]/.test(reference)) return send(res, 400, { error: "Referencia de transferencia inválida." });
      payment.reference = reference;
      payment.demo = config.demo === true;
    }
    const order = FoodManagement.accept((db.orders || []).find(o => o.folio === b.folio), Object.assign({}, b, { payment: payment }), db, customer);
    db.orders = [order].concat((db.orders || []).filter((o) => o.folio !== order.folio)).slice(0, 500);
    writeDB(db);
    return send(res, 201, { ok: true, order });
  }

  return send(res, 404, { error: "no existe" });
}

function serveStatic(req, res, url) {
  let p = decodeURIComponent(url.pathname);
  if (p === "/") p = "/index.html";
  if (PRIVATE.has("/" + p.replace(/\\/g, "/").split("/").pop()) || p.endsWith(".tmp")) { res.writeHead(404); return res.end("No encontrado"); }
  const file = path.join(ROOT, path.normalize(p));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end("Prohibido"); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("No encontrado"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname.startsWith("/api/")) {
    api(req, res, url).catch((err) => send(res, err.status || 400, { error: err.message || "Solicitud inválida." }));
  } else {
    serveStatic(req, res, url);
  }
});
function openBrowser(){
  if(process.platform==='win32'&&process.argv.includes('--open'))require('child_process').execFile('rundll32.exe',['url.dll,FileProtocolHandler','http://localhost:'+PORT],{windowsHide:true},()=>{});
}
server.on('error',err=>{
  if(err.code==='EADDRINUSE'){
    const check=http.get('http://localhost:'+PORT+'/api/health',res=>{
      let body='';res.on('data',chunk=>body+=chunk);res.on('end',()=>{let data;try{data=JSON.parse(body);}catch(e){}if(res.statusCode===200&&data&&data.persistence==='json'){console.log('Tiza Food ya está iniciado en http://localhost:'+PORT);openBrowser();}else{console.error('El puerto '+PORT+' está ocupado por otro servidor. Cierra ese servidor y vuelve a iniciar Tiza Food.');process.exitCode=1;}});
    }).on('error',()=>{console.error('El puerto '+PORT+' está ocupado. Cierra el servidor anterior y vuelve a intentar.');process.exitCode=1;});
    check.setTimeout(3000,()=>check.destroy(Error('Tiempo agotado')));
  }else{console.error('No se pudo iniciar Tiza Food: '+err.message);process.exitCode=1;}
});
server.listen(PORT,()=>{console.log('Tiza Food listo en http://localhost:'+PORT);console.log('Usuarios: '+USERS_FILE);openBrowser();});
