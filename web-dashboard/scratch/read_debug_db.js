const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = '/Users/macbook/projects/parking-system/android-app/parking_db_debug.db';
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("--- TABLE: cash_sessions ---");
    db.each("SELECT * FROM cash_sessions", (err, row) => {
        console.log(row);
    });

    console.log("\n--- LATEST ENTRIES (operatorId, amount, isPaid, isCancelled) ---");
    db.each("SELECT operatorId, amount, isPaid, isCancelled, tenantId, entryTime, category FROM parking_entries ORDER BY entryTime DESC LIMIT 10", (err, row) => {
        console.log(row);
    });
});
db.close();
