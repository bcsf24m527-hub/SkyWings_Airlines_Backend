require('dotenv').config();
const mysql = require('mysql2/promise');

async function populateTables() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'skywings_airlines'
        });

        console.log('✅ Connected to database');
        console.log('📊 Populating seats, user preferences, and check-ins...\n');

        // ========== POPULATE SEATS ==========
        console.log('💺 Creating seats for flights...');
        
        const [flights] = await connection.execute(
            'SELECT flight_id, aircraft_id FROM flights'
        );
        const [aircraft] = await connection.execute(
            'SELECT aircraft_id, capacity FROM aircraft'
        );

        const aircraftCapacity = {};
        aircraft.forEach(a => {
            aircraftCapacity[a.aircraft_id] = a.capacity;
        });

        let seatsCreated = 0;
        for (const flight of flights) {
            const capacity = aircraftCapacity[flight.aircraft_id] || 180;
            
            // Create seats for this flight (economy, business, first class)
            const economySeats = Math.floor(capacity * 0.7);
            const businessSeats = Math.floor(capacity * 0.2);
            const firstClassSeats = capacity - economySeats - businessSeats;

            // Economy seats (A, B, C, D, E, F)
            for (let row = 1; row <= Math.ceil(economySeats / 6); row++) {
                const seats = ['A', 'B', 'C', 'D', 'E', 'F'];
                for (const seat of seats) {
                    if (seatsCreated >= economySeats) break;
                    const seatNumber = `${row}${seat}`;
                    const seatClass = 'economy';
                    const isWindow = seat === 'A' || seat === 'F';
                    const isAisle = seat === 'C' || seat === 'D';
                    
                    try {
                        // Parse row and column from seat number
                        const rowNum = parseInt(seatNumber.match(/\d+/)[0]);
                        const colLetter = seatNumber.match(/[A-Z]+/)[0];
                        
                        await connection.execute(
                            `INSERT INTO seats (aircraft_id, seat_number, seat_class, row_number, column_letter, is_available)
                             VALUES (?, ?, ?, ?, ?, ?)
                             ON DUPLICATE KEY UPDATE is_available = is_available`,
                            [flight.aircraft_id, seatNumber, seatClass, rowNum, colLetter, 1]
                        );
                        seatsCreated++;
                    } catch (error) {
                        if (error.code !== 'ER_DUP_ENTRY') {
                            console.error(`Error creating seat ${seatNumber} for aircraft ${flight.aircraft_id}:`, error.message);
                        }
                    }
                }
            }

            // Business seats (A, B, E, F)
            let businessCreated = 0;
            for (let row = Math.ceil(economySeats / 6) + 1; row <= Math.ceil(economySeats / 6) + Math.ceil(businessSeats / 4); row++) {
                const seats = ['A', 'B', 'E', 'F'];
                for (const seat of seats) {
                    if (businessCreated >= businessSeats) break;
                    const seatNumber = `${row}${seat}`;
                    const seatClass = 'business';
                    const isWindow = seat === 'A' || seat === 'F';
                    const isAisle = true; // Business seats are all aisle
                    
                    try {
                        const rowNum = parseInt(seatNumber.match(/\d+/)[0]);
                        const colLetter = seatNumber.match(/[A-Z]+/)[0];
                        
                        await connection.execute(
                            `INSERT INTO seats (aircraft_id, seat_number, seat_class, row_number, column_letter, is_available)
                             VALUES (?, ?, ?, ?, ?, ?)
                             ON DUPLICATE KEY UPDATE is_available = is_available`,
                            [flight.aircraft_id, seatNumber, seatClass, rowNum, colLetter, 1]
                        );
                        businessCreated++;
                        seatsCreated++;
                    } catch (error) {
                        if (error.code !== 'ER_DUP_ENTRY') {
                            console.error(`Error creating seat ${seatNumber} for aircraft ${flight.aircraft_id}:`, error.message);
                        }
                    }
                }
            }

            // First class seats (A, B)
            let firstClassCreated = 0;
            for (let row = Math.ceil(economySeats / 6) + Math.ceil(businessSeats / 4) + 1; row <= Math.ceil(economySeats / 6) + Math.ceil(businessSeats / 4) + Math.ceil(firstClassSeats / 2); row++) {
                const seats = ['A', 'B'];
                for (const seat of seats) {
                    if (firstClassCreated >= firstClassSeats) break;
                    const seatNumber = `${row}${seat}`;
                    const seatClass = 'first';
                    const isWindow = true; // First class are all window
                    const isAisle = false;
                    
                    try {
                        const rowNum = parseInt(seatNumber.match(/\d+/)[0]);
                        const colLetter = seatNumber.match(/[A-Z]+/)[0];
                        
                        await connection.execute(
                            `INSERT INTO seats (aircraft_id, seat_number, seat_class, row_number, column_letter, is_available)
                             VALUES (?, ?, ?, ?, ?, ?)
                             ON DUPLICATE KEY UPDATE is_available = is_available`,
                            [flight.aircraft_id, seatNumber, seatClass, rowNum, colLetter, 1]
                        );
                        firstClassCreated++;
                        seatsCreated++;
                    } catch (error) {
                        if (error.code !== 'ER_DUP_ENTRY') {
                            console.error(`Error creating seat ${seatNumber} for aircraft ${flight.aircraft_id}:`, error.message);
                        }
                    }
                }
            }
        }

        const [totalSeats] = await connection.execute('SELECT COUNT(*) as count FROM seats');
        console.log(`✅ Created ${totalSeats[0].count} seats across all flights\n`);

        // ========== POPULATE USER PREFERENCES ==========
        console.log('⚙️  Creating user preferences...');
        
        const [users] = await connection.execute('SELECT user_id FROM users WHERE role = "user"');
        
        const preferences = [
            { preferred_seat: 'window', meal_preference: 'vegetarian', newsletter: false },
            { preferred_seat: 'aisle', meal_preference: 'non-vegetarian', newsletter: true },
            { preferred_seat: 'window', meal_preference: 'vegan', newsletter: false },
            { preferred_seat: 'aisle', meal_preference: 'halal', newsletter: true },
            { preferred_seat: 'window', meal_preference: 'non-vegetarian', newsletter: false },
            { preferred_seat: 'aisle', meal_preference: 'vegetarian', newsletter: true },
            { preferred_seat: 'window', meal_preference: 'none', newsletter: false },
            { preferred_seat: 'none', meal_preference: 'non-vegetarian', newsletter: true },
        ];

        let prefsCreated = 0;
        for (const user of users) {
            const pref = preferences[prefsCreated % preferences.length];
            
            try {
                await connection.execute(
                    `INSERT INTO user_preferences (user_id, preferred_seat, meal_preference, newsletter_subscription)
                     VALUES (?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE 
                        preferred_seat = VALUES(preferred_seat),
                        meal_preference = VALUES(meal_preference),
                        newsletter_subscription = VALUES(newsletter_subscription)`,
                    [user.user_id, pref.preferred_seat, pref.meal_preference, pref.newsletter ? 1 : 0]
                );
                prefsCreated++;
            } catch (error) {
                if (error.code !== 'ER_DUP_ENTRY') {
                    console.error(`Error creating preferences for user ${user.user_id}:`, error.message);
                }
            }
        }

        const [totalPrefs] = await connection.execute('SELECT COUNT(*) as count FROM user_preferences');
        console.log(`✅ Created ${totalPrefs[0].count} user preferences\n`);

        // ========== POPULATE CHECK-INS ==========
        console.log('🎫 Creating check-ins for confirmed bookings...');
        
        const [bookings] = await connection.execute(
            `SELECT b.booking_id, b.booking_reference, b.flight_id, b.user_id, b.number_of_passengers, b.class, f.departure_datetime, f.aircraft_id
             FROM bookings b
             INNER JOIN flights f ON b.flight_id = f.flight_id
             WHERE b.status = 'confirmed' AND f.departure_datetime > NOW()`
        );

        let checkinsCreated = 0;
        for (const booking of bookings) {
            // Check if check-in window is open (24-2 hours before departure)
            const departure = new Date(booking.departure_datetime);
            const now = new Date();
            const hoursUntilDeparture = (departure - now) / (1000 * 60 * 60);
            
            // Create check-ins for any future flights (relaxed for testing)
            // Randomly check in 25% of all confirmed bookings
            if (hoursUntilDeparture > 0 && Math.random() < 0.25) {
                // Get passengers for this booking
                const [passengers] = await connection.execute(
                    `SELECT bp.passenger_id, bp.booking_id
                     FROM booking_passengers bp
                     WHERE bp.booking_id = ?`,
                    [booking.booking_id]
                );

                if (passengers.length > 0) {
                    // Get available seats for the flight's aircraft
                    const [availableSeats] = await connection.execute(
                        `SELECT seat_id, seat_number
                         FROM seats
                         WHERE aircraft_id = ? 
                           AND seat_class = ?
                           AND is_available = 1
                         LIMIT ?`,
                        [booking.aircraft_id, booking.class, passengers.length]
                    );

                    if (availableSeats.length >= passengers.length) {
                        try {
                            // Create check-in for the booking (one check-in per booking)
                            await connection.execute(
                                `INSERT INTO check_ins (booking_id, check_in_datetime, status, gate_number)
                                 VALUES (?, NOW(), 'completed', ?)
                                 ON DUPLICATE KEY UPDATE status = 'completed'`,
                                [booking.booking_id, `G${Math.floor(Math.random() * 20) + 1}`]
                            );

                            // Assign seats to all passengers
                            for (let i = 0; i < passengers.length && i < availableSeats.length; i++) {
                                const seat = availableSeats[i];
                                
                                // Mark seat as unavailable
                                await connection.execute(
                                    'UPDATE seats SET is_available = 0 WHERE seat_id = ?',
                                    [seat.seat_id]
                                );

                                // Update booking_passengers with seat number
                                await connection.execute(
                                    'UPDATE booking_passengers SET seat_number = ? WHERE booking_id = ? AND passenger_id = ?',
                                    [seat.seat_number, booking.booking_id, passengers[i].passenger_id]
                                );
                            }

                            checkinsCreated++;
                        } catch (error) {
                            if (error.code !== 'ER_DUP_ENTRY') {
                                console.error(`Error creating check-in for booking ${booking.booking_id}:`, error.message);
                            }
                        }
                    }
                }
            }
        }

        const [totalCheckins] = await connection.execute('SELECT COUNT(*) as count FROM check_ins');
        console.log(`✅ Created ${totalCheckins[0].count} check-ins\n`);

        // ========== SUMMARY ==========
        console.log('📊 Final Summary:');
        console.log(`   Seats: ${totalSeats[0].count}`);
        console.log(`   User Preferences: ${totalPrefs[0].count}`);
        console.log(`   Check-ins: ${totalCheckins[0].count}`);
        console.log('\n✅ All tables populated successfully!');

    } catch (error) {
        console.error('❌ Error populating tables:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

populateTables();

