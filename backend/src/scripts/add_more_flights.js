require('dotenv').config();
const mysql = require('mysql2/promise');

async function addMoreFlights() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'skywings_airlines'
        });

        console.log('✅ Connected to database');
        console.log('✈️  Adding more flights...\n');

        // Get airports and aircraft
        const [airports] = await connection.execute('SELECT airport_code FROM airports');
        const [aircraft] = await connection.execute('SELECT aircraft_id FROM aircraft');
        
        if (airports.length < 2 || aircraft.length === 0) {
            console.log('❌ Need at least 2 airports and 1 aircraft');
            return;
        }

        const aircraftId = aircraft[0].aircraft_id;
        const basePrice = 299.99; // Default base price
        
        // Get existing flight count
        const [existing] = await connection.execute('SELECT COUNT(*) as count FROM flights');
        const existingCount = existing[0].count;
        
        const flightsToAdd = Math.max(0, 100 - existingCount);
        
        if (flightsToAdd <= 0) {
            console.log(`✅ Already have ${existingCount} flights. No need to add more.`);
            return;
        }

        console.log(`Adding ${flightsToAdd} more flights...`);

        const flightNumbers = [];
        const now = new Date();
        
        for (let i = 0; i < flightsToAdd; i++) {
            // Random route
            const fromIndex = Math.floor(Math.random() * airports.length);
            let toIndex = Math.floor(Math.random() * airports.length);
            while (toIndex === fromIndex) {
                toIndex = Math.floor(Math.random() * airports.length);
            }
            
            const fromCode = airports[fromIndex].airport_code;
            const toCode = airports[toIndex].airport_code;
            
            // Generate unique flight number
            const flightNum = `SW${String(existingCount + i + 1).padStart(3, '0')}`;
            
            // Random date in next 6 months
            const daysAhead = Math.floor(Math.random() * 180);
            const departureDate = new Date(now);
            departureDate.setDate(departureDate.getDate() + daysAhead);
            departureDate.setHours(Math.floor(Math.random() * 20) + 6); // 6 AM to 2 AM next day
            departureDate.setMinutes(Math.floor(Math.random() * 4) * 15); // 0, 15, 30, 45
            
            // Arrival 2-12 hours later
            const flightDuration = (Math.floor(Math.random() * 10) + 2) * 60; // 2-12 hours in minutes
            const arrivalDate = new Date(departureDate);
            arrivalDate.setMinutes(arrivalDate.getMinutes() + flightDuration);
            
            // Calculate prices based on distance (simplified)
            const distanceMultiplier = flightDuration / 60; // hours
            const calculatedBasePrice = basePrice * (0.8 + distanceMultiplier * 0.2);
            const businessPrice = calculatedBasePrice * 1.5;
            const firstClassPrice = calculatedBasePrice * 2;
            
            const statuses = ['scheduled', 'scheduled', 'scheduled', 'boarding', 'delayed'];
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            
            try {
                await connection.execute(
                    `INSERT INTO flights (
                        flight_number, aircraft_id, from_airport_code, to_airport_code,
                        departure_datetime, arrival_datetime, base_price, business_price,
                        first_class_price, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        flightNum,
                        aircraftId,
                        fromCode,
                        toCode,
                        departureDate.toISOString().slice(0, 19).replace('T', ' '),
                        arrivalDate.toISOString().slice(0, 19).replace('T', ' '),
                        calculatedBasePrice,
                        businessPrice,
                        firstClassPrice,
                        status
                    ]
                );
            } catch (error) {
                if (error.code !== 'ER_DUP_ENTRY') {
                    console.error(`Error inserting flight ${flightNum}:`, error.message);
                }
            }
        }

        const [finalCount] = await connection.execute('SELECT COUNT(*) as count FROM flights');
        console.log(`✅ Total flights: ${finalCount[0].count}`);

    } catch (error) {
        console.error('❌ Error adding flights:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

addMoreFlights();

