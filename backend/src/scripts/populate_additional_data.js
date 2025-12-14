/**
 * Populate Additional Data Script
 * Adds check-ins, user preferences, and ensures database is fully synchronized
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function populateAdditionalData() {
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
        console.log('📊 Populating additional data...\n');

        // ========== CREATE CHECK-INS ==========
        console.log('✈️  Creating check-ins...');
        const [confirmedBookings] = await connection.execute(
            `SELECT booking_id, flight_id FROM bookings 
             WHERE status = 'confirmed' AND booking_id NOT IN (SELECT booking_id FROM check_ins)
             LIMIT 50`
        );

        let checkInCount = 0;
        for (const booking of confirmedBookings) {
            const [flight] = await connection.execute(
                'SELECT departure_datetime FROM flights WHERE flight_id = ?',
                [booking.flight_id]
            );
            
            if (flight.length > 0) {
                const departureDate = new Date(flight[0].departure_datetime);
                const checkInDate = new Date(departureDate);
                checkInDate.setHours(checkInDate.getHours() - 2); // 2 hours before departure
                
                const gateNumber = `G${Math.floor(Math.random() * 20) + 1}`;
                const boardingTime = new Date(departureDate);
                boardingTime.setMinutes(boardingTime.getMinutes() - 30);
                
                try {
                    await connection.execute(
                        `INSERT INTO check_ins (booking_id, check_in_datetime, gate_number, boarding_time, status)
                         VALUES (?, ?, ?, ?, 'completed')`,
                        [
                            booking.booking_id,
                            checkInDate.toISOString().slice(0, 19).replace('T', ' '),
                            gateNumber,
                            boardingTime.toISOString().slice(0, 19).replace('T', ' ')
                        ]
                    );
                    checkInCount++;
                } catch (error) {
                    // Skip duplicates
                }
            }
        }
        console.log(`✅ Created ${checkInCount} check-ins`);

        // ========== CREATE USER PREFERENCES ==========
        console.log('⚙️  Creating user preferences...');
        const [usersWithoutPrefs] = await connection.execute(
            `SELECT user_id FROM users 
             WHERE user_id NOT IN (SELECT user_id FROM user_preferences)
             LIMIT 50`
        );

        const seatPreferences = ['window', 'aisle', 'middle', 'none'];
        const mealPreferences = ['vegetarian', 'non-vegetarian', 'vegan', 'halal', 'none'];
        
        let prefCount = 0;
        for (const user of usersWithoutPrefs) {
            try {
                await connection.execute(
                    `INSERT INTO user_preferences (user_id, preferred_seat, meal_preference, newsletter_subscription)
                     VALUES (?, ?, ?, ?)`,
                    [
                        user.user_id,
                        seatPreferences[Math.floor(Math.random() * seatPreferences.length)],
                        mealPreferences[Math.floor(Math.random() * mealPreferences.length)],
                        Math.random() > 0.5 ? 1 : 0
                    ]
                );
                prefCount++;
            } catch (error) {
                // Skip duplicates
            }
        }
        console.log(`✅ Created ${prefCount} user preferences`);

        // ========== ASSIGN SEATS TO BOOKINGS ==========
        console.log('🪑 Assigning seats to bookings...');
        const [bookingsWithoutSeats] = await connection.execute(
            `SELECT bp.booking_id, bp.passenger_id, b.flight_id, b.class
             FROM booking_passengers bp
             JOIN bookings b ON bp.booking_id = b.booking_id
             WHERE bp.seat_number IS NULL
             LIMIT 100`
        );

        let seatCount = 0;
        for (const booking of bookingsWithoutSeats) {
            const [availableSeats] = await connection.execute(
                `SELECT s.seat_number FROM seats s
                 JOIN flights f ON s.aircraft_id = f.aircraft_id
                 WHERE f.flight_id = ? 
                 AND s.seat_class = ?
                 AND s.is_available = TRUE
                 AND s.seat_number NOT IN (
                     SELECT bp2.seat_number FROM booking_passengers bp2
                     JOIN bookings b2 ON bp2.booking_id = b2.booking_id
                     WHERE b2.flight_id = ? AND bp2.seat_number IS NOT NULL
                 )
                 LIMIT 1`,
                [booking.flight_id, booking.class, booking.flight_id]
            );

            if (availableSeats.length > 0) {
                try {
                    await connection.execute(
                        'UPDATE booking_passengers SET seat_number = ? WHERE booking_id = ? AND passenger_id = ?',
                        [availableSeats[0].seat_number, booking.booking_id, booking.passenger_id]
                    );
                    seatCount++;
                } catch (error) {
                    // Skip errors
                }
            }
        }
        console.log(`✅ Assigned ${seatCount} seats`);

        // ========== FINAL SUMMARY ==========
        const [totalUsers] = await connection.execute('SELECT COUNT(*) as count FROM users');
        const [totalFlights] = await connection.execute('SELECT COUNT(*) as count FROM flights');
        const [totalBookings] = await connection.execute('SELECT COUNT(*) as count FROM bookings');
        const [totalPassengers] = await connection.execute('SELECT COUNT(*) as count FROM passengers');
        const [totalCheckIns] = await connection.execute('SELECT COUNT(*) as count FROM check_ins');
        const [totalPrefs] = await connection.execute('SELECT COUNT(*) as count FROM user_preferences');
        const [bookingsWithSeats] = await connection.execute(
            'SELECT COUNT(DISTINCT booking_id) as count FROM booking_passengers WHERE seat_number IS NOT NULL'
        );

        console.log('\n📊 Final Database Summary:');
        console.log(`   👥 Users: ${totalUsers[0].count}`);
        console.log(`   ✈️  Flights: ${totalFlights[0].count}`);
        console.log(`   📋 Bookings: ${totalBookings[0].count}`);
        console.log(`   👤 Passengers: ${totalPassengers[0].count}`);
        console.log(`   ✅ Check-ins: ${totalCheckIns[0].count}`);
        console.log(`   ⚙️  User Preferences: ${totalPrefs[0].count}`);
        console.log(`   🪑 Bookings with Seats: ${bookingsWithSeats[0].count}`);

        console.log('\n✅ Database fully synchronized and populated!');

    } catch (error) {
        console.error('❌ Error populating data:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

populateAdditionalData();

