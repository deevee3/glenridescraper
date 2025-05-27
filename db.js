import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { verbose } = sqlite3;

// Open SQLite database connection
async function getDb() {
    return open({
        filename: path.join(__dirname, 'searches.db'),
        driver: sqlite3.Database
    });
}

// Initialize the database
async function initDb() {
    const db = await getDb();
    
    // Create searches table if it doesn't exist
    await db.exec(`
        CREATE TABLE IF NOT EXISTS searches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            query TEXT NOT NULL,
            location TEXT NOT NULL,
            result_count INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Create search_results table to store individual results
    await db.exec(`
        CREATE TABLE IF NOT EXISTS search_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            search_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            address TEXT,
            phone TEXT,
            website TEXT,
            rating REAL,
            status TEXT,
            FOREIGN KEY (search_id) REFERENCES searches(id)
        )
    `);
    
    console.log('Database initialized');
    return db;
}

// Save a search and its results
async function saveSearch(query, location, results) {
    const db = await getDb();
    
    try {
        // Start a transaction
        await db.run('BEGIN TRANSACTION');
        
        // Save the search
        const searchResult = await db.run(
            'INSERT INTO searches (query, location, result_count) VALUES (?, ?, ?)',
            [query, location, results.length]
        );
        
        const searchId = searchResult.lastID;
        
        // Save each result
        for (const result of results) {
            await db.run(
                `INSERT INTO search_results 
                (search_id, name, address, phone, website, rating, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    searchId,
                    result.name,
                    result.address,
                    result.phone,
                    result.website,
                    result.rating,
                    result.openNow
                ]
            );
        }
        
        // Commit the transaction
        await db.run('COMMIT');
        
        console.log(`Saved search with ID: ${searchId}`);
        return searchId;
    } catch (error) {
        // Rollback in case of error
        await db.run('ROLLBACK');
        console.error('Error saving search:', error);
        throw error;
    }
}

// Get all saved searches
async function getSavedSearches() {
    const db = await getDb();
    return db.all('SELECT * FROM searches ORDER BY created_at DESC');
}

// Get a specific search and its results
async function getSearch(searchId) {
    const db = await getDb();
    
    const search = await db.get('SELECT * FROM searches WHERE id = ?', [searchId]);
    if (!search) return null;
    
    const results = await db.all(
        'SELECT name, address, phone, website, rating, status as openNow FROM search_results WHERE search_id = ?',
        [searchId]
    );
    
    return {
        ...search,
        results
    };
}

// Delete a saved search
async function deleteSearch(searchId) {
    const db = await getDb();
    
    await db.run('BEGIN TRANSACTION');
    try {
        await db.run('DELETE FROM search_results WHERE search_id = ?', [searchId]);
        await db.run('DELETE FROM searches WHERE id = ?', [searchId]);
        await db.run('COMMIT');
        return true;
    } catch (error) {
        await db.run('ROLLBACK');
        console.error('Error deleting search:', error);
        throw error;
    }
}

export {
    initDb,
    saveSearch,
    getSavedSearches,
    getSearch,
    deleteSearch
};
