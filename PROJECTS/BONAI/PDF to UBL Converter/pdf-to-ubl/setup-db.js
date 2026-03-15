const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'prisma', 'dev.db');
console.log('DB Path:', dbPath);

const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS Organization (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT (datetime('now')),
    updatedAt DATETIME NOT NULL DEFAULT (datetime('now')),
    creditBalance INTEGER NOT NULL DEFAULT 1000,
    totalUsed INTEGER NOT NULL DEFAULT 0,
    aiProvider TEXT NOT NULL DEFAULT 'document_ai',
    documentAiProjectId TEXT,
    documentAiLocation TEXT DEFAULT 'eu',
    documentAiProcessorId TEXT,
    documentAiApiKey TEXT,
    openrouterApiKey TEXT,
    openrouterModel TEXT DEFAULT 'google/gemini-2.0-flash-001',
    defaultAdminName TEXT,
    defaultAdminAddress TEXT,
    defaultAdminKvk TEXT,
    defaultAdminIban TEXT
  );

  CREATE TABLE IF NOT EXISTS User (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    passwordHash TEXT,
    role TEXT NOT NULL DEFAULT 'USER',
    organizationId TEXT NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT (datetime('now')),
    updatedAt DATETIME NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (organizationId) REFERENCES Organization(id)
  );

  CREATE TABLE IF NOT EXISTS ApiKey (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    organizationId TEXT NOT NULL,
    lastUsedAt DATETIME,
    createdAt DATETIME NOT NULL DEFAULT (datetime('now')),
    isActive INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (organizationId) REFERENCES Organization(id)
  );

  CREATE TABLE IF NOT EXISTS Conversion (
    id TEXT PRIMARY KEY,
    organizationId TEXT NOT NULL,
    userId TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    documentType TEXT NOT NULL DEFAULT 'INVOICE',
    originalFilename TEXT NOT NULL,
    pageCount INTEGER,
    fileSize INTEGER,
    adminName TEXT,
    adminAddress TEXT,
    adminKvk TEXT,
    adminIban TEXT,
    overallConfidence REAL,
    flaggedForReview INTEGER NOT NULL DEFAULT 0,
    flagReason TEXT,
    detectedInvoiceCount INTEGER NOT NULL DEFAULT 1,
    aiProvider TEXT,
    processingTimeMs INTEGER,
    creditsUsed INTEGER NOT NULL DEFAULT 1,
    createdAt DATETIME NOT NULL DEFAULT (datetime('now')),
    completedAt DATETIME,
    FOREIGN KEY (organizationId) REFERENCES Organization(id),
    FOREIGN KEY (userId) REFERENCES User(id)
  );

  CREATE TABLE IF NOT EXISTS ConversionResult (
    id TEXT PRIMARY KEY,
    conversionId TEXT NOT NULL,
    invoiceIndex INTEGER NOT NULL DEFAULT 0,
    extractedData TEXT NOT NULL,
    fieldScores TEXT NOT NULL,
    ublXml TEXT,
    isValid INTEGER NOT NULL DEFAULT 0,
    validationErrors TEXT,
    flaggedFields TEXT,
    createdAt DATETIME NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (conversionId) REFERENCES Conversion(id)
  );
`);

console.log('✅ Tables created successfully!');

// Verify
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name));

db.close();
