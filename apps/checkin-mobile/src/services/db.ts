import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('ticketbox.db');

export const initDb = () => {
  // Lấy version hiện tại của Database
  const { user_version: currentDbVersion } = db.getFirstSync<{ user_version: number }>('PRAGMA user_version') || { user_version: 0 };

  // Mục tiêu version của code hiện tại
  const TARGET_DB_VERSION = 6;

  if (currentDbVersion >= TARGET_DB_VERSION) {
    // Đã ở version mới nhất, không cần migrate
    console.log(`✅ [SQLite DB] Database đã ở version mới nhất (v${currentDbVersion})`);
    return;
  }

  console.log(`⏳ [SQLite DB] Đang migrate Database từ v${currentDbVersion} lên v${TARGET_DB_VERSION}...`);

  // Bắt đầu transaction để đảm bảo an toàn, nếu lỗi sẽ rollback
  db.withTransactionSync(() => {
    // Force xoá bảng cũ để tạo lại schema mới nhất cho an toàn (vì đang ở môi trường Dev)
    db.execSync(`
      DROP TABLE IF EXISTS concert_cache;
      DROP TABLE IF EXISTS ticket_snapshot;
      DROP TABLE IF EXISTS guest_snapshot;
      DROP TABLE IF EXISTS checkin_log;
      DROP TABLE IF EXISTS sync_log;
    `);
      // Logic chạy cho version 1 (Khởi tạo lần đầu)
      db.execSync(`
        CREATE TABLE IF NOT EXISTS concert_cache (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          eventDate TEXT NOT NULL,
          venueName TEXT,
          cachedAt TEXT NOT NULL,
          publicKey TEXT,
          version TEXT,
          downloadedAt TEXT
        );
        
        CREATE TABLE IF NOT EXISTS ticket_snapshot (
          id TEXT PRIMARY KEY,
          ticketCode TEXT NOT NULL UNIQUE,
          concertId TEXT NOT NULL,
          status TEXT NOT NULL,
          guestName TEXT,
          ticketType TEXT,
          syncedAt TEXT NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS guest_snapshot (
          id TEXT PRIMARY KEY,
          guestCode TEXT NOT NULL UNIQUE,
          concertId TEXT NOT NULL,
          fullName TEXT NOT NULL,
          email TEXT,
          status TEXT NOT NULL,
          syncedAt TEXT NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS checkin_log (
          id TEXT PRIMARY KEY,
          ticketCode TEXT,
          guestCode TEXT,
          concertId TEXT NOT NULL,
          staffId TEXT NOT NULL,
          deviceId TEXT NOT NULL,
          scanResult TEXT NOT NULL,
          checkedAt TEXT NOT NULL,
          isOffline INTEGER NOT NULL DEFAULT 1
        );
        
        CREATE TABLE IF NOT EXISTS sync_log (
          id TEXT PRIMARY KEY,
          batchId TEXT NOT NULL,
          syncTime TEXT NOT NULL,
          totalItems INTEGER NOT NULL,
          successCount INTEGER NOT NULL,
          failCount INTEGER NOT NULL,
          errorMessage TEXT
        );
      `);

    // Cập nhật version mới
    db.execSync(`PRAGMA user_version = ${TARGET_DB_VERSION}`);
  });

  // Log debug để xác nhận bảng tồn tại (Tiêu chí nghiệm thu)
  try {
    const result = db.getAllSync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );
    console.log(`✅ [SQLite DB] Migration thành công! Các bảng đã sẵn sàng: ${result.map(row => row.name).join(', ')}`);
  } catch (error) {
    console.error('❌ [SQLite DB] Lỗi kiểm tra bảng sau migration:', error);
  }
};
