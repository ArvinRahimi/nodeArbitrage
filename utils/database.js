import sqlite3 from 'sqlite3';
import { CONFIG } from '../config.js';

const { databaseName } = CONFIG;
const db = new sqlite3.Database(databaseName, err => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});
// Extend the existing database setup
db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS closed_positions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        buyExchange TEXT NOT NULL,
        sellExchange TEXT NOT NULL,
        amount REAL NOT NULL,
        entryBuyPrice REAL NOT NULL,
        entrySellPrice REAL NOT NULL,
        closeBuyPrice REAL NOT NULL,
        closeSellPrice REAL NOT NULL,
        timestamp INTEGER NOT NULL,
        closeTimestamp INTEGER NOT NULL
      )`,
    err => {
      if (err) {
        console.error('Error creating closed_positions table:', err.message);
      } else {
        console.log('Closed positions table created or already exists.');
      }
    },
  );
});

// Function to update an open position
function updateOpenPosition(id, updates) {
  return new Promise((resolve, reject) => {
    const fields = Object.keys(updates)
      .map(key => `${key} = ?`)
      .join(', ');
    const values = [...Object.values(updates), id];
    db.run(
      `UPDATE positions SET ${fields} WHERE id = ?`,
      values,
      function (err) {
        if (err) {
          console.error('Error updating position:', err.message);
          reject(err);
        } else if (this.changes === 0) {
          reject(new Error('No position found to update'));
        } else {
          console.log(`Position with ID ${id} updated.`);
          resolve();
        }
      },
    );
  });
}

// Function to move a position to the closed_positions table
function moveToClosedPositions(positionId, closingDetails) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM positions WHERE id = ?`,
      [positionId],
      (err, position) => {
        if (err) {
          console.error('Error fetching position to close:', err.message);
          reject(err);
          return;
        }
        if (!position) {
          reject(new Error(`Position with ID ${positionId} not found.`));
          return;
        }

        const closeTimestamp = Date.now();
        db.run(
          `INSERT INTO closed_positions 
            (symbol, buyExchange, sellExchange, amount, entryBuyPrice, entrySellPrice, closeBuyPrice, closeSellPrice, timestamp, closeTimestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            position.symbol,
            position.buyExchange,
            position.sellExchange,
            position.amount,
            position.entryBuyPrice,
            position.entrySellPrice,
            closingDetails.closeBuyPrice,
            closingDetails.closeSellPrice,
            position.timestamp,
            closeTimestamp,
          ],
          function (insertErr) {
            if (insertErr) {
              console.error(
                'Error moving position to closed_positions:',
                insertErr.message,
              );
              reject(insertErr);
              return;
            }

            // Delete from the open positions table after moving
            db.run(
              `DELETE FROM positions WHERE id = ?`,
              [positionId],
              function (deleteErr) {
                if (deleteErr) {
                  console.error(
                    'Error removing open position:',
                    deleteErr.message,
                  );
                  reject(deleteErr);
                  return;
                }
                console.log(
                  `Position with ID ${positionId} moved to closed_positions.`,
                );
                resolve();
              },
            );
          },
        );
      },
    );
  });
}

// Export the new functions
export {
  storePosition,
  getOpenPositions,
  removePosition,
  updateOpenPosition,
  moveToClosedPositions,
};
