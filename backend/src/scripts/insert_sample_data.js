require('dotenv').config();
const mysql = require('mysql2/promise');

async function insertSampleData() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'skywings_airlines'
        });

        console.log('✅ Connected to database');
        console.log('📊 Inserting sample data...\n');

        // Get user IDs
        const [users] = await connection.execute('SELECT user_id FROM users WHERE role = "user" LIMIT 1');
        const userId = users[0]?.user_id || 1;

        // Get flight IDs
        const [flights] = await connection.execute('SELECT flight_id FROM flights ORDER BY flight_id LIMIT 10');
        
        if (flights.length === 0) {
            console.log('❌ No flights found. Please ensure flights are created first.');
            return;
        }

        // Get existing bookings count
        const [existingBookings] = await connection.execute('SELECT COUNT(*) as count FROM bookings');
        const existingCount = existingBookings[0].count;

        if (existingCount > 0) {
            console.log(`⚠️  Found ${existingCount} existing bookings. Adding more sample data...\n`);
        }

        // Insert sample bookings with different statuses and dates
        const bookingStatuses = ['confirmed', 'confirmed', 'confirmed', 'pending', 'cancelled', 'completed'];
        const paymentStatuses = ['paid', 'paid', 'paid', 'pending', 'refunded', 'paid'];
        const classes = ['economy', 'business', 'first', 'economy', 'economy', 'business'];
        
        const sampleBookings = [];
        const now = new Date();

        for (let i = 0; i < 50; i++) {
            const flightIndex = i % flights.length;
            const flightId = flights[flightIndex].flight_id;
            
            // Create bookings with dates spread over last 6 months
            const monthsAgo = Math.floor(i / 10);
            const bookingDate = new Date(now);
            bookingDate.setMonth(bookingDate.getMonth() - monthsAgo);
            bookingDate.setDate(bookingDate.getDate() - (i % 30));
            
            const statusIndex = i % bookingStatuses.length;
            const status = bookingStatuses[statusIndex];
            const paymentStatus = paymentStatuses[statusIndex];
            const flightClass = classes[statusIndex];
            
            // Get flight price
            const [flightData] = await connection.execute(
                'SELECT base_price, business_price, first_class_price FROM flights WHERE flight_id = ?',
                [flightId]
            );
            
            let price = flightData[0]?.base_price || 299.99;
            if (flightClass === 'business' && flightData[0]?.business_price) {
                price = flightData[0].business_price;
            } else if (flightClass === 'first' && flightData[0]?.first_class_price) {
                price = flightData[0].first_class_price;
            }
            
            const passengers = Math.floor(Math.random() * 3) + 1; // 1-3 passengers
            const totalAmount = parseFloat(price) * passengers;
            
            const bookingRef = 'BK' + Date.now().toString(36).toUpperCase() + i.toString().padStart(4, '0');
            
            sampleBookings.push({
                booking_reference: bookingRef,
                user_id: userId,
                flight_id: flightId,
                booking_date: bookingDate.toISOString().slice(0, 19).replace('T', ' '),
                number_of_passengers: passengers,
                class: flightClass,
                total_amount: totalAmount,
                status: status,
                payment_status: paymentStatus,
                payment_method: paymentStatus === 'paid' ? 'credit_card' : null
            });
        }

        // Insert bookings
        for (const booking of sampleBookings) {
            try {
                const [result] = await connection.execute(
                    `INSERT INTO bookings (
                        booking_reference, user_id, flight_id, booking_date,
                        number_of_passengers, class, total_amount, status,
                        payment_status, payment_method
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        booking.booking_reference,
                        booking.user_id,
                        booking.flight_id,
                        booking.booking_date,
                        booking.number_of_passengers,
                        booking.class,
                        booking.total_amount,
                        booking.status,
                        booking.payment_status,
                        booking.payment_method
                    ]
                );

                const bookingId = result.insertId;

                // Create passengers for each booking
                for (let p = 0; p < booking.number_of_passengers; p++) {
                    // Create passenger
                    const [passengerResult] = await connection.execute(
                        `INSERT INTO passengers (
                            user_id, first_name, last_name, date_of_birth,
                            passport_number, nationality, is_saved
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [
                            userId,
                            `Passenger${p + 1}`,
                            `Test${bookingId}`,
                            '1990-01-01',
                            `P${bookingId}${p}`,
                            'USA',
                            0
                        ]
                    );

                    // Link passenger to booking
                    await connection.execute(
                        `INSERT INTO booking_passengers (booking_id, passenger_id, seat_number)
                         VALUES (?, ?, ?)`,
                        [bookingId, passengerResult.insertId, null]
                    );
                }
            } catch (error) {
                if (error.code !== 'ER_DUP_ENTRY') {
                    console.error(`Error inserting booking ${booking.booking_reference}:`, error.message);
                }
            }
        }

        console.log(`✅ Inserted ${sampleBookings.length} sample bookings`);
        console.log('✅ Sample data insertion complete!\n');

        // Show summary
        const [totalBookings] = await connection.execute('SELECT COUNT(*) as count FROM bookings');
        const [confirmedBookings] = await connection.execute('SELECT COUNT(*) as count FROM bookings WHERE status = "confirmed"');
        const [totalRevenue] = await connection.execute('SELECT COALESCE(SUM(total_amount), 0) as total FROM bookings WHERE status = "confirmed" AND payment_status = "paid"');

        console.log('📊 Database Summary:');
        console.log(`   Total Bookings: ${totalBookings[0].count}`);
        console.log(`   Confirmed Bookings: ${confirmedBookings[0].count}`);
        console.log(`   Total Revenue: $${parseFloat(totalRevenue[0].total).toFixed(2)}`);

    } catch (error) {
        console.error('❌ Error inserting sample data:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

insertSampleData();

