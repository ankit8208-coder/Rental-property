const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "change-this-demo-secret-in-production";
const PUBLIC_DIR = path.join(__dirname, "public");
const UPLOAD_DIR = path.join(__dirname, "uploads");

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use("/uploads", express.static(UPLOAD_DIR));
app.use(express.static(PUBLIC_DIR));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = path.basename(file.originalname, ext).replace(/[^a-z0-9-_]/gi, "-").slice(0, 45);
    cb(null, `${Date.now()}-${safe || "property"}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
  fileFilter: (_req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
    cb(ok ? null : new Error("Only JPG, PNG or WEBP images are allowed."), ok);
  }
});

function signUser(user) {
  return jwt.sign({ id: user.id, role: user.role, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
}

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Authentication required." });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

function allow(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "You do not have permission for this action." });
    next();
  };
}

function getUserByEmail(email) {
  return db.prepare("SELECT * FROM users WHERE lower(email)=lower(?)").get(email.trim());
}

function propertyWithImages(row) {
  if (!row) return null;
  const images = db.prepare("SELECT id,image_url FROM property_images WHERE property_id=? ORDER BY id").all(row.id);
  return { ...row, available: !!row.available, images: images.map(x => ({ id: x.id, image_url: x.image_url })) };
}

function canManageProperty(user, property) {
  return user.role === "admin" || (user.role === "owner" && property.owner_id === user.id);
}

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, role = "tenant", phone = "", address = "" } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Name, email and password are required." });
    if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
    const safeRole = ["tenant", "owner"].includes(role) ? role : "tenant";
    if (getUserByEmail(email)) return res.status(409).json({ error: "Email already registered." });
    const hash = await bcrypt.hash(password, 10);
    const info = db.prepare(`
      INSERT INTO users (name,email,password_hash,role,phone,address) VALUES (?,?,?,?,?,?)
    `).run(name.trim(), email.trim().toLowerCase(), hash, safeRole, phone.trim(), address.trim());
    const user = db.prepare("SELECT id,name,email,role,phone,address,created_at FROM users WHERE id=?").get(info.lastInsertRowid);
    res.status(201).json({ user, token: signUser(user) });
  } catch (e) {
    res.status(500).json({ error: "Registration failed.", detail: e.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = getUserByEmail(email || "");
    if (!user || !(await bcrypt.compare(password || "", user.password_hash))) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, address: user.address, created_at: user.created_at };
    res.json({ user: safeUser, token: signUser(safeUser) });
  } catch (e) {
    res.status(500).json({ error: "Login failed.", detail: e.message });
  }
});

app.get("/api/auth/me", auth, (req, res) => {
  const user = db.prepare("SELECT id,name,email,role,phone,address,created_at FROM users WHERE id=?").get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  res.json({ user });
});

app.get("/api/properties", (req, res) => {
  const { city = "", property_type = "", min_rent = "", max_rent = "", bedrooms = "", available = "true", q = "" } = req.query;
  const where = ["p.approval_status='approved'"];
  const params = [];
  if (available === "true") where.push("p.available=1");
  if (city) { where.push("lower(p.city)=lower(?)"); params.push(city); }
  if (property_type) { where.push("lower(p.property_type)=lower(?)"); params.push(property_type); }
  if (min_rent !== "") { where.push("p.rent>=?"); params.push(Number(min_rent)); }
  if (max_rent !== "") { where.push("p.rent<=?"); params.push(Number(max_rent)); }
  if (bedrooms !== "") { where.push("p.bedrooms>=?"); params.push(Number(bedrooms)); }
  if (q) {
    where.push("(lower(p.title) LIKE ? OR lower(p.description) LIKE ? OR lower(p.city) LIKE ?)");
    const like = `%${q.toLowerCase()}%`;
    params.push(like, like, like);
  }
  const rows = db.prepare(`
    SELECT p.*, u.name AS owner_name
    FROM properties p JOIN users u ON u.id=p.owner_id
    WHERE ${where.join(" AND ")}
    ORDER BY p.created_at DESC
  `).all(...params).map(propertyWithImages);
  res.json({ properties: rows });
});

app.get("/api/properties/:id", (req, res) => {
  const row = db.prepare(`
    SELECT p.*, u.name AS owner_name, u.email AS owner_email, u.phone AS owner_phone
    FROM properties p JOIN users u ON u.id=p.owner_id WHERE p.id=?
  `).get(req.params.id);
  if (!row) return res.status(404).json({ error: "Property not found." });
  res.json({ property: propertyWithImages(row) });
});

app.post("/api/properties", auth, allow("owner", "admin"), (req, res) => {
  const { title, description, city, state, address, rent, bedrooms, bathrooms, area_sqft, property_type, available = true } = req.body;
  if (!title || !description || !city || !state || !address || !property_type) return res.status(400).json({ error: "Please fill all required property fields." });
  const ownerId = req.user.role === "admin" && req.body.owner_id ? Number(req.body.owner_id) : req.user.id;
  const info = db.prepare(`
    INSERT INTO properties (owner_id,title,description,city,state,address,rent,bedrooms,bathrooms,area_sqft,property_type,available,approval_status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(ownerId, title, description, city, state, address, Number(rent), Number(bedrooms), Number(bathrooms), Number(area_sqft), property_type, available ? 1 : 0, req.user.role === "admin" ? "approved" : "pending");
  res.status(201).json({ property: propertyWithImages(db.prepare("SELECT * FROM properties WHERE id=?").get(info.lastInsertRowid)) });
});

app.put("/api/properties/:id", auth, allow("owner", "admin"), (req, res) => {
  const existing = db.prepare("SELECT * FROM properties WHERE id=?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Property not found." });
  if (!canManageProperty(req.user, existing)) return res.status(403).json({ error: "You can only manage your own properties." });

  const allowed = ["title","description","city","state","address","rent","bedrooms","bathrooms","area_sqft","property_type","available"];
  const set = [], vals = [];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      set.push(`${key}=?`);
      vals.push(key === "available" ? (req.body[key] ? 1 : 0) : req.body[key]);
    }
  }
  set.push("updated_at=CURRENT_TIMESTAMP");
  db.prepare(`UPDATE properties SET ${set.join(", ")} WHERE id=?`).run(...vals, req.params.id);
  res.json({ property: propertyWithImages(db.prepare("SELECT * FROM properties WHERE id=?").get(req.params.id)) });
});

app.delete("/api/properties/:id", auth, allow("owner", "admin"), (req, res) => {
  const existing = db.prepare("SELECT * FROM properties WHERE id=?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Property not found." });
  if (!canManageProperty(req.user, existing)) return res.status(403).json({ error: "You can only delete your own properties." });
  db.prepare("DELETE FROM properties WHERE id=?").run(req.params.id);
  res.json({ message: "Property deleted." });
});

app.post("/api/properties/:id/images", auth, allow("owner", "admin"), upload.array("images", 6), (req, res) => {
  const property = db.prepare("SELECT * FROM properties WHERE id=?").get(req.params.id);
  if (!property) return res.status(404).json({ error: "Property not found." });
  if (!canManageProperty(req.user, property)) return res.status(403).json({ error: "You do not manage this property." });
  if (!req.files?.length) return res.status(400).json({ error: "No images uploaded." });
  const insert = db.prepare("INSERT INTO property_images (property_id,image_url) VALUES (?,?)");
  const tx = db.transaction(() => req.files.forEach(f => insert.run(property.id, `/uploads/${f.filename}`)));
  tx();
  res.json({ images: db.prepare("SELECT id,image_url FROM property_images WHERE property_id=? ORDER BY id").all(property.id) });
});

app.get("/api/owner/properties", auth, allow("owner","admin"), (req,res) => {
  const rows = req.user.role === "admin"
    ? db.prepare(`SELECT p.*,u.name owner_name FROM properties p JOIN users u ON u.id=p.owner_id ORDER BY p.created_at DESC`).all()
    : db.prepare(`SELECT p.*,u.name owner_name FROM properties p JOIN users u ON u.id=p.owner_id WHERE p.owner_id=? ORDER BY p.created_at DESC`).all(req.user.id);
  res.json({ properties: rows.map(propertyWithImages) });
});

app.post("/api/rental-requests", auth, allow("tenant"), (req,res) => {
  const { property_id, message="" } = req.body;
  const property = db.prepare("SELECT * FROM properties WHERE id=? AND approval_status='approved'").get(property_id);
  if (!property) return res.status(404).json({ error: "Available property not found." });
  const dup = db.prepare("SELECT id FROM rental_requests WHERE property_id=? AND tenant_id=? AND status='pending'").get(property_id, req.user.id);
  if (dup) return res.status(409).json({ error: "You already have a pending request for this property." });
  const info = db.prepare("INSERT INTO rental_requests (property_id,tenant_id,message) VALUES (?,?,?)").run(property_id, req.user.id, message);
  res.status(201).json({ request: db.prepare(`SELECT rr.*,p.title property_title,u.name tenant_name FROM rental_requests rr JOIN properties p ON p.id=rr.property_id JOIN users u ON u.id=rr.tenant_id WHERE rr.id=?`).get(info.lastInsertRowid) });
});

app.get("/api/rental-requests/mine", auth, allow("tenant"), (req,res) => {
  const rows = db.prepare(`
    SELECT rr.*, p.title property_title, p.city, p.rent, u.name owner_name
    FROM rental_requests rr JOIN properties p ON p.id=rr.property_id JOIN users u ON u.id=p.owner_id
    WHERE rr.tenant_id=? ORDER BY rr.created_at DESC
  `).all(req.user.id);
  res.json({ requests: rows });
});

app.get("/api/rental-requests/owner", auth, allow("owner","admin"), (req,res) => {
  const rows = req.user.role === "admin"
    ? db.prepare(`SELECT rr.*,p.title property_title,u.name tenant_name,u.email tenant_email,p.owner_id FROM rental_requests rr JOIN properties p ON p.id=rr.property_id JOIN users u ON u.id=rr.tenant_id ORDER BY rr.created_at DESC`).all()
    : db.prepare(`SELECT rr.*,p.title property_title,u.name tenant_name,u.email tenant_email,p.owner_id FROM rental_requests rr JOIN properties p ON p.id=rr.property_id JOIN users u ON u.id=rr.tenant_id WHERE p.owner_id=? ORDER BY rr.created_at DESC`).all(req.user.id);
  res.json({ requests: rows });
});

app.patch("/api/rental-requests/:id/status", auth, allow("owner","admin"), (req,res) => {
  const { status } = req.body;
  if (!["approved","rejected","pending"].includes(status)) return res.status(400).json({ error: "Invalid status." });
  const request = db.prepare(`
    SELECT rr.*, p.owner_id FROM rental_requests rr JOIN properties p ON p.id=rr.property_id WHERE rr.id=?
  `).get(req.params.id);
  if (!request) return res.status(404).json({ error: "Request not found." });
  if (req.user.role !== "admin" && request.owner_id !== req.user.id) return res.status(403).json({ error: "You cannot manage this request." });
  const tx = db.transaction(() => {
    db.prepare("UPDATE rental_requests SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(status, req.params.id);
    if (status === "approved") db.prepare("UPDATE properties SET available=0,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(request.property_id);
  });
  tx();
  res.json({ message: `Request ${status}.` });
});

app.get("/api/profile", auth, (req,res) => {
  const user = db.prepare("SELECT id,name,email,role,phone,address,created_at FROM users WHERE id=?").get(req.user.id);
  res.json({ user });
});

app.put("/api/profile", auth, (req,res) => {
  const { name, phone, address } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required." });
  db.prepare("UPDATE users SET name=?,phone=?,address=? WHERE id=?").run(name.trim(), (phone||"").trim(), (address||"").trim(), req.user.id);
  const user = db.prepare("SELECT id,name,email,role,phone,address,created_at FROM users WHERE id=?").get(req.user.id);
  res.json({ user });
});

app.get("/api/admin/stats", auth, allow("admin"), (req,res) => {
  const users = db.prepare("SELECT COUNT(*) count FROM users").get().count;
  const properties = db.prepare("SELECT COUNT(*) count FROM properties").get().count;
  const available = db.prepare("SELECT COUNT(*) count FROM properties WHERE available=1 AND approval_status='approved'").get().count;
  const pendingProperties = db.prepare("SELECT COUNT(*) count FROM properties WHERE approval_status='pending'").get().count;
  const requests = db.prepare("SELECT COUNT(*) count FROM rental_requests").get().count;
  res.json({ stats: { users, properties, available, pendingProperties, requests } });
});

app.get("/api/admin/users", auth, allow("admin"), (req,res) => {
  const users = db.prepare("SELECT id,name,email,role,phone,address,created_at FROM users ORDER BY created_at DESC").all();
  res.json({ users });
});

app.get("/api/admin/properties", auth, allow("admin"), (req,res) => {
  const properties = db.prepare(`SELECT p.*,u.name owner_name,u.email owner_email FROM properties p JOIN users u ON u.id=p.owner_id ORDER BY p.created_at DESC`).all().map(propertyWithImages);
  res.json({ properties });
});

app.patch("/api/admin/properties/:id/status", auth, allow("admin"), (req,res) => {
  const { approval_status } = req.body;
  if (!["approved","rejected","pending"].includes(approval_status)) return res.status(400).json({ error: "Invalid approval status." });
  const result = db.prepare("UPDATE properties SET approval_status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(approval_status, req.params.id);
  if (!result.changes) return res.status(404).json({ error: "Property not found." });
  res.json({ message: `Property marked ${approval_status}.` });
});

app.get("/api/health", (_req,res) => res.json({ status: "ok", service: "rental-property-management-portal" }));

app.get("/api-docs.json", (_req,res) => {
  res.sendFile(path.join(__dirname, "swagger.json"));
});

app.get("*", (req,res) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/uploads/")) return res.status(404).json({ error: "API route not found." });
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.use((err, _req, res, _next) => {
  res.status(400).json({ error: err.message || "Unexpected error." });
});

app.listen(PORT, () => {
  console.log(`Rental Portal running at http://localhost:${PORT}`);
});
