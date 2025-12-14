require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function insertComprehensiveData() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'skywings_airlines'
        });

        console.log('✅ Connected to database');
        console.log('📊 Inserting comprehensive data...\n');

        // ========== CREATE 100+ USERS ==========
        console.log('👥 Creating users...');
        const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'James', 'Emma', 'Robert', 'Olivia', 'William', 'Sophia', 'Richard', 'Isabella', 'Joseph', 'Mia', 'Thomas', 'Charlotte', 'Charles', 'Amelia', 'Daniel', 'Harper', 'Matthew', 'Evelyn', 'Anthony', 'Abigail', 'Mark', 'Elizabeth', 'Donald', 'Sofia', 'Steven', 'Avery', 'Paul', 'Ella', 'Andrew', 'Scarlett', 'Joshua', 'Grace', 'Kenneth', 'Chloe', 'Kevin', 'Victoria', 'Brian', 'Riley', 'George', 'Aria', 'Timothy', 'Lily', 'Ronald', 'Natalie', 'Jason', 'Zoe', 'Edward', 'Penelope', 'Jeffrey', 'Lillian', 'Ryan', 'Addison', 'Jacob', 'Aubrey', 'Gary', 'Ellie', 'Nicholas', 'Stella', 'Eric', 'Hannah', 'Jonathan', 'Nora', 'Stephen', 'Layla', 'Larry', 'Zoe', 'Justin', 'Maya', 'Scott', 'Leah', 'Brandon', 'Hazel', 'Benjamin', 'Violet', 'Samuel', 'Aurora', 'Frank', 'Savannah', 'Gregory', 'Audrey', 'Raymond', 'Brooklyn', 'Alexander', 'Bella', 'Patrick', 'Claire', 'Jack', 'Skylar'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson', 'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson', 'Watson', 'Brooks', 'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza', 'Ruiz', 'Hughes', 'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers', 'Long', 'Ross', 'Foster', 'Jimenez'];
        
        const userCredentials = [];
        const userIds = [];

        // Get existing admin user ID
        const [adminUser] = await connection.execute('SELECT user_id FROM users WHERE role = "admin" LIMIT 1');
        const adminUserId = adminUser[0]?.user_id;

        // Create 100 users
        for (let i = 0; i < 100; i++) {
            const firstName = firstNames[i % firstNames.length];
            const lastName = lastNames[i % lastNames.length];
            const email = `user${i + 1}@skywings.com`;
            const password = `user${i + 1}123`;
            const hashedPassword = await bcrypt.hash(password, 10);
            const phone = `+1-555-${String(Math.floor(Math.random() * 9000) + 1000)}`;
            const dob = new Date(1970 + (i % 50), (i % 12), (i % 28) + 1).toISOString().split('T')[0];
            const address = `${Math.floor(Math.random() * 9999) + 1} ${lastNames[i % lastNames.length]} Street, City ${i % 50 + 1}`;

            try {
                const [result] = await connection.execute(
                    `INSERT INTO users (first_name, last_name, email, password, phone, date_of_birth, address, role, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, 'user', 'active')`,
                    [firstName, lastName, email, hashedPassword, phone, dob, address]
                );
                userIds.push(result.insertId);
                userCredentials.push({ email, password, name: `${firstName} ${lastName}` });
            } catch (error) {
                if (error.code === 'ER_DUP_ENTRY') {
                    // User already exists, get their ID
                    const [existing] = await connection.execute('SELECT user_id FROM users WHERE email = ?', [email]);
                    if (existing[0]) {
                        userIds.push(existing[0].user_id);
                    }
                }
            }
        }

        console.log(`✅ Created ${userIds.length} users`);

        // ========== GET FLIGHTS AND AIRCRAFT ==========
        const [flights] = await connection.execute('SELECT flight_id, base_price, business_price, first_class_price FROM flights');
        const [aircraft] = await connection.execute('SELECT aircraft_id FROM aircraft');

        if (flights.length === 0 || aircraft.length === 0) {
            console.log('❌ No flights or aircraft found. Please ensure schema is imported.');
            return;
        }

        // ========== CREATE 100+ BOOKINGS ==========
        console.log('📋 Creating bookings...');
        const bookingStatuses = ['confirmed', 'confirmed', 'confirmed', 'pending', 'cancelled', 'completed'];
        const paymentStatuses = ['paid', 'paid', 'paid', 'pending', 'refunded', 'paid'];
        const classes = ['economy', 'business', 'first', 'economy', 'economy', 'business'];
        
        const now = new Date();
        let bookingCount = 0;

        // Create bookings distributed across users
        for (let i = 0; i < 150; i++) {
            const userIndex = i % userIds.length;
            const userId = userIds[userIndex];
            const flightIndex = i % flights.length;
            const flight = flights[flightIndex];
            
            // Create bookings with dates spread over last 12 months
            const monthsAgo = Math.floor(i / 15);
            const bookingDate = new Date(now);
            bookingDate.setMonth(bookingDate.getMonth() - monthsAgo);
            bookingDate.setDate(bookingDate.getDate() - (i % 30));
            bookingDate.setHours(Math.floor(Math.random() * 24));
            bookingDate.setMinutes(Math.floor(Math.random() * 60));
            
            const statusIndex = i % bookingStatuses.length;
            const status = bookingStatuses[statusIndex];
            const paymentStatus = paymentStatuses[statusIndex];
            const flightClass = classes[statusIndex];
            
            let price = parseFloat(flight.base_price);
            if (flightClass === 'business' && flight.business_price) {
                price = parseFloat(flight.business_price);
            } else if (flightClass === 'first' && flight.first_class_price) {
                price = parseFloat(flight.first_class_price);
            }
            
            const passengers = Math.floor(Math.random() * 3) + 1; // 1-3 passengers
            const totalAmount = price * passengers;
            
            const bookingRef = 'BK' + Date.now().toString(36).toUpperCase() + i.toString().padStart(5, '0') + Math.random().toString(36).substring(2, 4).toUpperCase();
            
            try {
                const [result] = await connection.execute(
                    `INSERT INTO bookings (
                        booking_reference, user_id, flight_id, booking_date,
                        number_of_passengers, class, total_amount, status,
                        payment_status, payment_method
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        bookingRef,
                        userId,
                        flight.flight_id,
                        bookingDate.toISOString().slice(0, 19).replace('T', ' '),
                        passengers,
                        flightClass,
                        totalAmount,
                        status,
                        paymentStatus,
                        paymentStatus === 'paid' ? 'credit_card' : null
                    ]
                );

                const bookingId = result.insertId;

                // Create passengers for each booking
                for (let p = 0; p < passengers; p++) {
                    const passengerFirstName = firstNames[(userIndex * 3 + p) % firstNames.length];
                    const passengerLastName = lastNames[(userIndex * 3 + p) % lastNames.length];
                    const passengerDob = new Date(1980 + (p % 40), (p % 12), (p % 28) + 1).toISOString().split('T')[0];
                    
                    const [passengerResult] = await connection.execute(
                        `INSERT INTO passengers (
                            user_id, first_name, last_name, date_of_birth,
                            passport_number, nationality, is_saved
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [
                            userId,
                            passengerFirstName,
                            passengerLastName,
                            passengerDob,
                            `P${bookingId}${p}${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                            ['USA', 'UK', 'Canada', 'Australia', 'Germany', 'France', 'Japan'][p % 7],
                            p === 0 ? 1 : 0 // Save first passenger
                        ]
                    );

                    // Link passenger to booking
                    await connection.execute(
                        `INSERT INTO booking_passengers (booking_id, passenger_id, seat_number)
                         VALUES (?, ?, ?)`,
                        [bookingId, passengerResult.insertId, null]
                    );
                }
                bookingCount++;
            } catch (error) {
                if (error.code !== 'ER_DUP_ENTRY') {
                    console.error(`Error inserting booking ${i}:`, error.message);
                }
            }
        }

        console.log(`✅ Created ${bookingCount} bookings`);

        // ========== SUMMARY ==========
        const [totalUsers] = await connection.execute('SELECT COUNT(*) as count FROM users');
        const [totalBookings] = await connection.execute('SELECT COUNT(*) as count FROM bookings');
        const [confirmedBookings] = await connection.execute('SELECT COUNT(*) as count FROM bookings WHERE status = "confirmed"');
        const [totalRevenue] = await connection.execute('SELECT COALESCE(SUM(total_amount), 0) as total FROM bookings WHERE status = "confirmed" AND payment_status = "paid"');
        const [totalPassengers] = await connection.execute('SELECT COUNT(*) as count FROM passengers');
        const [totalFlights] = await connection.execute('SELECT COUNT(*) as count FROM flights');
        const [totalAircraft] = await connection.execute('SELECT COUNT(*) as count FROM aircraft');

        console.log('\n📊 Database Summary:');
        console.log(`   Users: ${totalUsers[0].count}`);
        console.log(`   Flights: ${totalFlights[0].count}`);
        console.log(`   Aircraft: ${totalAircraft[0].count}`);
        console.log(`   Bookings: ${totalBookings[0].count}`);
        console.log(`   Confirmed Bookings: ${confirmedBookings[0].count}`);
        console.log(`   Total Revenue: $${parseFloat(totalRevenue[0].total).toFixed(2)}`);
        console.log(`   Passengers: ${totalPassengers[0].count}`);

        // Save credentials to file
        const fs = require('fs');
        const credentialsText = `# User Credentials\n\n## Admin Account\nEmail: admin@skywings.com\nPassword: admin123\n\n## Regular User Accounts\n\n${userCredentials.slice(0, 20).map((u, i) => `${i + 1}. ${u.name}\n   Email: ${u.email}\n   Password: ${u.password}`).join('\n\n')}\n\n... and ${userCredentials.length - 20} more users (user2@skywings.com through user100@skywings.com, passwords: user2123 through user100123)`;
        
        fs.writeFileSync('USER_CREDENTIALS.txt', credentialsText);
        console.log('\n✅ Credentials saved to USER_CREDENTIALS.txt');

    } catch (error) {
        console.error('❌ Error inserting data:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

insertComprehensiveData();

