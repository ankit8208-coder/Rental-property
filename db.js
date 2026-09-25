const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "rental.db"));
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
db.exec(schema);

function seed() {
  const count = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
  if (count > 0) return;

  const insertUser = db.prepare(`
    INSERT INTO users (name,email,password_hash,role,phone,address)
    VALUES (@name,@email,@password_hash,@role,@phone,@address)
  `);

  const users = [
    {
      name: "System Admin",
      email: "admin@example.com",
      password_hash: bcrypt.hashSync("Admin@123", 10),
      role: "admin",
      phone: "+91 9000000000",
      address: "CountryEdu HQ"
    },
    {
      name: "Demo Property Owner",
      email: "owner@example.com",
      password_hash: bcrypt.hashSync("Owner@123", 10),
      role: "owner",
      phone: "+91 9000000001",
      address: "Lucknow, Uttar Pradesh"
    },
    {
      name: "Demo Tenant",
      email: "tenant@example.com",
      password_hash: bcrypt.hashSync("Tenant@123", 10),
      role: "tenant",
      phone: "+91 9000000002",
      address: "Lucknow, Uttar Pradesh"
    }
  ];

  const userIds = {};
  const tx = db.transaction(() => {
    for (const u of users) {
      const info = insertUser.run(u);
      userIds[u.role] = info.lastInsertRowid;
    }

    const insertProperty = db.prepare(`
      INSERT INTO properties
      (owner_id,title,description,city,state,address,rent,bedrooms,bathrooms,area_sqft,property_type,available,approval_status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `);

    const samples = [
      ["Modern 2BHK Apartment", "Bright 2BHK apartment with balcony, modular kitchen and dedicated parking.", "Lucknow", "Uttar Pradesh", "Gomti Nagar Extension", 18000, 2, 2, 1250, "Apartment", 1, "approved"],
      ["Premium 1BHK Studio", "Fully furnished studio near business districts and public transport.", "Lucknow", "Uttar Pradesh", "Vibhuti Khand", 14000, 1, 1, 700, "Studio", 1, "approved"],
      ["Family 3BHK House", "Independent family home with garden space and two-wheeler parking.", "Kanpur", "Uttar Pradesh", "Swaroop Nagar", 22000, 3, 2, 1650, "House", 1, "approved"]
    ];
    for (const p of samples) {
      insertProperty.run(userIds.owner, ...p);
    }
  });
  tx();
}

seed();
module.exports = db;
