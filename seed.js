const db = require("./db");
console.log("Database ready. Demo credentials:");
console.log("Admin  : admin@example.com / Admin@123");
console.log("Owner  : owner@example.com / Owner@123");
console.log("Tenant : tenant@example.com / Tenant@123");
db.close();
