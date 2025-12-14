/**
 * Insert Seats Script
 * Populates seats for all aircraft
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function insertSeats() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '2240',
            database: process.env.DB_NAME || 'skywings_airlines'
        });

        console.log('✅ Connected to database');
        console.log('🪑 Inserting seats...\n');

        // Read seat insertion SQL from schema
        const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');
        const schemaContent = fs.readFileSync(schemaPath, 'utf8');
        
        // Extract seat insertion queries
        const seatQueries = [
            // Boeing 737-800 (SW-001)
            `INSERT INTO seats (aircraft_id, seat_number, seat_class, \`row_number\`, column_letter, is_available) 
            SELECT 1, CONCAT(seat_row, COL_LET), 
                   CASE WHEN seat_row <= 3 THEN 'business' ELSE 'economy' END,
                   seat_row, COL_LET, TRUE
            FROM (
              SELECT seat_row, COL_LET
              FROM (SELECT 1 as seat_row UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
                    UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20
                    UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29 UNION SELECT 30) \`rows\`
              CROSS JOIN (SELECT 'A' as COL_LET UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F') cols
            ) seat_combos
            ON DUPLICATE KEY UPDATE seat_number=VALUES(seat_number)`,
            
            // Boeing 777-300ER (SW-002)
            `INSERT INTO seats (aircraft_id, seat_number, seat_class, \`row_number\`, column_letter, is_available)
            SELECT 2, CONCAT(seat_row, COL_LET),
                   CASE 
                     WHEN seat_row <= 2 THEN 'first'
                     WHEN seat_row <= 8 THEN 'business'
                     ELSE 'economy'
                   END,
                   seat_row, COL_LET, TRUE
            FROM (
              SELECT seat_row, COL_LET
              FROM (SELECT 1 as seat_row UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
                    UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20
                    UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29 UNION SELECT 30
                    UNION SELECT 31 UNION SELECT 32 UNION SELECT 33 UNION SELECT 34 UNION SELECT 35 UNION SELECT 36 UNION SELECT 37 UNION SELECT 38 UNION SELECT 39 UNION SELECT 40
                    UNION SELECT 41 UNION SELECT 42) \`rows\`
              CROSS JOIN (SELECT 'A' as COL_LET UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F' UNION SELECT 'G' UNION SELECT 'H' UNION SELECT 'I' UNION SELECT 'J' UNION SELECT 'K') cols
              WHERE NOT (seat_row <= 2 AND COL_LET IN ('I', 'J', 'K'))
                AND NOT (seat_row BETWEEN 3 AND 8 AND COL_LET IN ('I', 'J', 'K'))
            ) seat_combos
            ON DUPLICATE KEY UPDATE seat_number=VALUES(seat_number)`,
            
            // Airbus A320 (SW-003)
            `INSERT INTO seats (aircraft_id, seat_number, seat_class, \`row_number\`, column_letter, is_available)
            SELECT 3, CONCAT(seat_row, COL_LET),
                   CASE WHEN seat_row <= 3 THEN 'business' ELSE 'economy' END,
                   seat_row, COL_LET, TRUE
            FROM (
              SELECT seat_row, COL_LET
              FROM (SELECT 1 as seat_row UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
                    UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20
                    UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29 UNION SELECT 30) \`rows\`
              CROSS JOIN (SELECT 'A' as COL_LET UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F') cols
            ) seat_combos
            ON DUPLICATE KEY UPDATE seat_number=VALUES(seat_number)`,
            
            // Airbus A350 (SW-004)
            `INSERT INTO seats (aircraft_id, seat_number, seat_class, \`row_number\`, column_letter, is_available)
            SELECT 4, CONCAT(seat_row, COL_LET),
                   CASE WHEN seat_row <= 6 THEN 'business' ELSE 'economy' END,
                   seat_row, COL_LET, TRUE
            FROM (
              SELECT seat_row, COL_LET
              FROM (SELECT 1 as seat_row UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
                    UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20
                    UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29 UNION SELECT 30
                    UNION SELECT 31 UNION SELECT 32 UNION SELECT 33 UNION SELECT 34 UNION SELECT 35 UNION SELECT 36 UNION SELECT 37 UNION SELECT 38 UNION SELECT 39 UNION SELECT 40) \`rows\`
              CROSS JOIN (SELECT 'A' as COL_LET UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F' UNION SELECT 'G' UNION SELECT 'H') cols
            ) seat_combos
            ON DUPLICATE KEY UPDATE seat_number=VALUES(seat_number)`
        ];

        const aircraftNames = ['Boeing 737-800', 'Boeing 777-300ER', 'Airbus A320', 'Airbus A350'];
        
        for (let i = 0; i < seatQueries.length; i++) {
            try {
                await connection.execute(seatQueries[i]);
                const [seatCount] = await connection.execute(
                    'SELECT COUNT(*) as count FROM seats WHERE aircraft_id = ?',
                    [i + 1]
                );
                console.log(`✅ ${aircraftNames[i]}: ${seatCount[0].count} seats`);
            } catch (error) {
                console.error(`❌ Error inserting seats for ${aircraftNames[i]}:`, error.message);
            }
        }

        const [totalSeats] = await connection.execute('SELECT COUNT(*) as count FROM seats');
        console.log(`\n✅ Total seats created: ${totalSeats[0].count}`);

    } catch (error) {
        console.error('❌ Error inserting seats:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

insertSeats();

