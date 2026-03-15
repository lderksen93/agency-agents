import Database from 'better-sqlite3';
import path from 'path';

/**
 * SQLite database singleton using better-sqlite3.
 * Replaces Prisma ORM which has engine binary incompatibility with Node.js v24.
 */

// Use require to avoid TS module resolution issues with better-sqlite3
// eslint-disable-next-line @typescript-eslint/no-require-imports
const BetterSqlite3 = require('better-sqlite3');

const globalForDb = globalThis as unknown as {
    db: any | undefined;
};

function createDatabase(): any {
    const dbPath = path.resolve(process.cwd(), 'prisma', 'dev.db');
    const db = new BetterSqlite3(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    return db;
}

export const db = globalForDb.db ?? createDatabase();
if (process.env.NODE_ENV !== 'production') globalForDb.db = db;

// ============================
// HELPER FUNCTIONS
// ============================

function generateCuid(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `c${timestamp}${random}`;
}

// ============================
// ORGANIZATION
// ============================

export const organization = {
    findUnique(where: { id: string }) {
        return db.prepare('SELECT * FROM Organization WHERE id = ?').get(where.id) || null;
    },

    create(data: {
        name: string;
        creditBalance?: number;
    }) {
        const id = generateCuid();
        const now = new Date().toISOString();
        db.prepare(`
            INSERT INTO Organization (id, name, creditBalance, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?)
        `).run(id, data.name, data.creditBalance ?? 1000, now, now);
        return { id, name: data.name, creditBalance: data.creditBalance ?? 1000, createdAt: now, updatedAt: now };
    },

    update(where: { id: string }, data: Record<string, any>) {
        const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
        const values = Object.values(data);
        db.prepare(`UPDATE Organization SET ${sets}, updatedAt = datetime('now') WHERE id = ?`).run(...values, where.id);
        return this.findUnique(where);
    },
};

// ============================
// USER
// ============================

export const user = {
    findUnique(where: { id?: string; email?: string }) {
        if (where.email) {
            return db.prepare('SELECT * FROM User WHERE email = ?').get(where.email) || null;
        }
        if (where.id) {
            return db.prepare('SELECT * FROM User WHERE id = ?').get(where.id) || null;
        }
        return null;
    },

    findMany(where: { organizationId: string }) {
        return db.prepare('SELECT * FROM User WHERE organizationId = ?').all(where.organizationId);
    },

    create(data: {
        email: string;
        name?: string;
        passwordHash: string;
        role: string;
        organizationId: string;
    }) {
        const id = generateCuid();
        const now = new Date().toISOString();
        db.prepare(`
            INSERT INTO User (id, email, name, passwordHash, role, organizationId, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, data.email, data.name || null, data.passwordHash, data.role, data.organizationId, now, now);
        return { id, email: data.email, name: data.name || null, role: data.role, organizationId: data.organizationId, createdAt: now, updatedAt: now };
    },

    update(where: { id: string }, data: Record<string, any>) {
        const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
        const values = Object.values(data);
        db.prepare(`UPDATE User SET ${sets}, updatedAt = datetime('now') WHERE id = ?`).run(...values, where.id);
        return this.findUnique(where);
    },
};

// ============================
// API KEY
// ============================

export const apiKey = {
    findUnique(where: { key?: string; id?: string }) {
        if (where.key) {
            return db.prepare('SELECT * FROM ApiKey WHERE key = ? AND isActive = 1').get(where.key) || null;
        }
        if (where.id) {
            return db.prepare('SELECT * FROM ApiKey WHERE id = ?').get(where.id) || null;
        }
        return null;
    },

    findMany(where: { organizationId: string }) {
        return db.prepare('SELECT * FROM ApiKey WHERE organizationId = ?').all(where.organizationId);
    },

    create(data: {
        key: string;
        name: string;
        organizationId: string;
    }) {
        const id = generateCuid();
        const now = new Date().toISOString();
        db.prepare(`
            INSERT INTO ApiKey (id, key, name, organizationId, createdAt, isActive)
            VALUES (?, ?, ?, ?, ?, 1)
        `).run(id, data.key, data.name, data.organizationId, now);
        return { id, key: data.key, name: data.name, organizationId: data.organizationId, createdAt: now, isActive: true };
    },

    update(where: { id: string }, data: Record<string, any>) {
        const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
        const values = Object.values(data);
        db.prepare(`UPDATE ApiKey SET ${sets} WHERE id = ?`).run(...values, where.id);
        return this.findUnique(where);
    },

    updateLastUsed(key: string) {
        db.prepare(`UPDATE ApiKey SET lastUsedAt = datetime('now') WHERE key = ?`).run(key);
    },
};

// ============================
// CONVERSION
// ============================

export const conversion = {
    findUnique(where: { id: string }, include?: { results?: boolean; organization?: boolean }) {
        const conv = db.prepare('SELECT * FROM Conversion WHERE id = ?').get(where.id) as any;
        if (!conv) return null;
        if (include?.results) {
            conv.results = db.prepare('SELECT * FROM ConversionResult WHERE conversionId = ?').all(where.id);
        }
        if (include?.organization) {
            conv.organization = db.prepare('SELECT creditBalance FROM Organization WHERE id = ?').get(conv.organizationId);
        }
        return conv;
    },

    findMany(where: { organizationId: string }, options?: { orderBy?: string; take?: number }) {
        let sql = 'SELECT * FROM Conversion WHERE organizationId = ?';
        if (options?.orderBy) sql += ' ORDER BY createdAt DESC';
        if (options?.take) sql += ` LIMIT ${options.take}`;
        return db.prepare(sql).all(where.organizationId);
    },

    create(data: Record<string, any>) {
        const id = generateCuid();
        const now = new Date().toISOString();
        db.prepare(`
            INSERT INTO Conversion (id, organizationId, userId, status, originalFilename, pageCount, fileSize, adminName, adminAddress, adminKvk, adminIban, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, data.organizationId, data.userId || null, data.status || 'PENDING',
            data.originalFilename, data.pageCount || null, data.fileSize || null,
            data.adminName || null, data.adminAddress || null, data.adminKvk || null, data.adminIban || null, now);
        return { id, ...data, createdAt: now };
    },

    update(where: { id: string }, data: Record<string, any>) {
        const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
        const values = Object.values(data);
        db.prepare(`UPDATE Conversion SET ${sets} WHERE id = ?`).run(...values, where.id);
        return this.findUnique(where);
    },

    count(where: { organizationId: string }) {
        const row = db.prepare('SELECT COUNT(*) as count FROM Conversion WHERE organizationId = ?').get(where.organizationId) as any;
        return row?.count || 0;
    },
};

// ============================
// CONVERSION RESULT
// ============================

export const conversionResult = {
    create(data: Record<string, any>) {
        const id = generateCuid();
        const now = new Date().toISOString();
        db.prepare(`
            INSERT INTO ConversionResult (id, conversionId, invoiceIndex, extractedData, fieldScores, ublXml, isValid, validationErrors, flaggedFields, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, data.conversionId, data.invoiceIndex || 0,
            data.extractedData, data.fieldScores, data.ublXml || null,
            data.isValid ? 1 : 0, data.validationErrors || null, data.flaggedFields || null, now);
        return { id, ...data, createdAt: now };
    },
};

// ============================
// PRISMA-COMPATIBLE WRAPPER
// ============================

/**
 * Drop-in replacement for Prisma client.
 * Provides the same API surface used by existing route handlers.
 */
export const prisma = {
    organization,
    user,
    apiKey,
    conversion,
    conversionResult,
};

export default prisma;
