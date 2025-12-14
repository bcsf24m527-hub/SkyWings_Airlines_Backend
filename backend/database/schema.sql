-- SkyWings Airlines Database Schema
-- Create database
CREATE DATABASE IF NOT EXISTS skywings_airlines CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE skywings_airlines;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    address TEXT,
    role ENUM('user', 'admin') DEFAULT 'user',
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Aircraft Table
CREATE TABLE IF NOT EXISTS aircraft (
    aircraft_id INT AUTO_INCREMENT PRIMARY KEY,
    model VARCHAR(100) NOT NULL,
    registration VARCHAR(20) NOT NULL UNIQUE,
    capacity INT NOT NULL,
    status ENUM('active', 'maintenance', 'retired') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Airports Table
CREATE TABLE IF NOT EXISTS airports (
    airport_code VARCHAR(3) PRIMARY KEY,
    airport_name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Flights Table
CREATE TABLE IF NOT EXISTS flights (
    flight_id INT AUTO_INCREMENT PRIMARY KEY,
    flight_number VARCHAR(20) NOT NULL UNIQUE,
    aircraft_id INT NOT NULL,
    from_airport_code VARCHAR(3) NOT NULL,
    to_airport_code VARCHAR(3) NOT NULL,
    departure_datetime DATETIME NOT NULL,
    arrival_datetime DATETIME NOT NULL,
    status ENUM('scheduled', 'delayed', 'cancelled', 'completed', 'boarding') DEFAULT 'scheduled',
    base_price DECIMAL(10, 2) NOT NULL,
    business_price DECIMAL(10, 2) NOT NULL,
    first_class_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (aircraft_id) REFERENCES aircraft(aircraft_id) ON DELETE RESTRICT,
    FOREIGN KEY (from_airport_code) REFERENCES airports(airport_code) ON DELETE RESTRICT,
    FOREIGN KEY (to_airport_code) REFERENCES airports(airport_code) ON DELETE RESTRICT,
    INDEX idx_flight_number (flight_number),
    INDEX idx_departure (departure_datetime),
    INDEX idx_status (status),
    INDEX idx_route (from_airport_code, to_airport_code),
    CHECK (arrival_datetime > departure_datetime)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_reference VARCHAR(20) NOT NULL UNIQUE,
    user_id INT NOT NULL,
    flight_id INT NOT NULL,
    booking_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    number_of_passengers INT NOT NULL,
    class ENUM('economy', 'business', 'first') NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
    payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',
    payment_method VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (flight_id) REFERENCES flights(flight_id) ON DELETE RESTRICT,
    INDEX idx_booking_ref (booking_reference),
    INDEX idx_user (user_id),
    INDEX idx_flight (flight_id),
    INDEX idx_status (status),
    CHECK (number_of_passengers > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Passengers Table
CREATE TABLE IF NOT EXISTS passengers (
    passenger_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    passport_number VARCHAR(50),
    nationality VARCHAR(100),
    is_saved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Booking Passengers Table
CREATE TABLE IF NOT EXISTS booking_passengers (
    booking_passenger_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    passenger_id INT NOT NULL,
    seat_number VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (passenger_id) REFERENCES passengers(passenger_id) ON DELETE CASCADE,
    INDEX idx_booking (booking_id),
    INDEX idx_passenger (passenger_id),
    INDEX idx_seat (seat_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seats Table
CREATE TABLE IF NOT EXISTS seats (
    seat_id INT AUTO_INCREMENT PRIMARY KEY,
    aircraft_id INT NOT NULL,
    seat_number VARCHAR(10) NOT NULL,
    seat_class ENUM('economy', 'business', 'first') NOT NULL,
    row_number INT NOT NULL,
    column_letter VARCHAR(2) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (aircraft_id) REFERENCES aircraft(aircraft_id) ON DELETE CASCADE,
    UNIQUE KEY unique_seat (aircraft_id, seat_number),
    INDEX idx_aircraft (aircraft_id),
    INDEX idx_available (is_available),
    INDEX idx_class (seat_class)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Check-ins Table
CREATE TABLE IF NOT EXISTS check_ins (
    check_in_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL UNIQUE,
    check_in_datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    gate_number VARCHAR(10),
    boarding_time DATETIME,
    status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
    INDEX idx_booking (booking_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
    preference_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    preferred_seat ENUM('window', 'aisle', 'middle', 'none') DEFAULT 'none',
    meal_preference ENUM('vegetarian', 'non-vegetarian', 'vegan', 'halal', 'none') DEFAULT 'none',
    newsletter_subscription BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert Sample Airports
INSERT INTO airports (airport_code, airport_name, city, country) VALUES
('NYC', 'John F. Kennedy International Airport', 'New York', 'USA'),
('LAX', 'Los Angeles International Airport', 'Los Angeles', 'USA'),
('CHI', 'O''Hare International Airport', 'Chicago', 'USA'),
('MIA', 'Miami International Airport', 'Miami', 'USA'),
('LON', 'Heathrow Airport', 'London', 'UK'),
('PAR', 'Charles de Gaulle Airport', 'Paris', 'France'),
('TOK', 'Haneda Airport', 'Tokyo', 'Japan'),
('DXB', 'Dubai International Airport', 'Dubai', 'UAE')
ON DUPLICATE KEY UPDATE airport_name=VALUES(airport_name);

-- Insert Sample Aircraft
INSERT INTO aircraft (model, registration, capacity, status) VALUES
('Boeing 737-800', 'SW-001', 180, 'active'),
('Boeing 777-300ER', 'SW-002', 365, 'active'),
('Airbus A320', 'SW-003', 180, 'active'),
('Airbus A350', 'SW-004', 325, 'active')
ON DUPLICATE KEY UPDATE model=VALUES(model);

-- Insert Sample Admin User (password: admin123)
-- IMPORTANT: After importing this schema, run: node scripts/initialize_database.js
-- This will set proper bcrypt password hashes for the default users
-- Using temporary hash - will be replaced by initialize_database.js
INSERT INTO users (first_name, last_name, email, password, phone, role, status) VALUES
('Admin', 'User', 'admin@skywings.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+92 333 123456', 'admin', 'active')
ON DUPLICATE KEY UPDATE email=VALUES(email);

-- Insert Sample Regular User (password: user123)
-- IMPORTANT: After importing this schema, run: node scripts/initialize_database.js
-- This will set proper bcrypt password hashes for the default users
-- Using temporary hash - will be replaced by initialize_database.js
INSERT INTO users (first_name, last_name, email, password, phone, role, status) VALUES
('Hassaan', 'Ahmad', 'user@skywings.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+92 333 123457', 'user', 'active')
ON DUPLICATE KEY UPDATE email=VALUES(email);

-- Insert Sample Flights
-- Note: Dates are set to future dates for testing. Adjust as needed.
INSERT INTO flights (flight_number, aircraft_id, from_airport_code, to_airport_code, departure_datetime, arrival_datetime, base_price, business_price, first_class_price, status) VALUES
('SW101', 1, 'NYC', 'LAX', DATE_ADD(NOW(), INTERVAL 7 DAY), DATE_ADD(NOW(), INTERVAL 7 DAY) + INTERVAL 6 HOUR, 299.99, 599.99, 999.99, 'scheduled'),
('SW102', 1, 'LAX', 'NYC', DATE_ADD(NOW(), INTERVAL 8 DAY), DATE_ADD(NOW(), INTERVAL 8 DAY) + INTERVAL 6 HOUR, 299.99, 599.99, 999.99, 'scheduled'),
('SW201', 2, 'LON', 'NYC', DATE_ADD(NOW(), INTERVAL 10 DAY), DATE_ADD(NOW(), INTERVAL 10 DAY) + INTERVAL 8 HOUR, 599.99, 1199.99, 1999.99, 'scheduled'),
('SW202', 2, 'NYC', 'LON', DATE_ADD(NOW(), INTERVAL 11 DAY), DATE_ADD(NOW(), INTERVAL 11 DAY) + INTERVAL 8 HOUR, 599.99, 1199.99, 1999.99, 'scheduled'),
('SW301', 3, 'CHI', 'MIA', DATE_ADD(NOW(), INTERVAL 5 DAY), DATE_ADD(NOW(), INTERVAL 5 DAY) + INTERVAL 3 HOUR, 199.99, 399.99, 699.99, 'scheduled'),
('SW302', 3, 'MIA', 'CHI', DATE_ADD(NOW(), INTERVAL 6 DAY), DATE_ADD(NOW(), INTERVAL 6 DAY) + INTERVAL 3 HOUR, 199.99, 399.99, 699.99, 'scheduled'),
('SW401', 4, 'PAR', 'DXB', DATE_ADD(NOW(), INTERVAL 12 DAY), DATE_ADD(NOW(), INTERVAL 12 DAY) + INTERVAL 7 HOUR, 499.99, 999.99, 1599.99, 'scheduled'),
('SW402', 4, 'DXB', 'TOK', DATE_ADD(NOW(), INTERVAL 14 DAY), DATE_ADD(NOW(), INTERVAL 14 DAY) + INTERVAL 9 HOUR, 699.99, 1399.99, 2299.99, 'scheduled')
ON DUPLICATE KEY UPDATE flight_number=VALUES(flight_number);

-- Insert Sample Seats for Aircraft
-- Boeing 737-800 (SW-001): 180 seats (30 rows, 6 seats per row: A-B-C-D-E-F)
-- Business: Rows 1-3 (18 seats), Economy: Rows 4-30 (162 seats)
INSERT INTO seats (aircraft_id, seat_number, seat_class, row_number, column_letter, is_available) 
SELECT 1, CONCAT(seat_row, COL_LET), 
       CASE WHEN seat_row <= 3 THEN 'business' ELSE 'economy' END,
       seat_row, COL_LET, TRUE
FROM (
  SELECT seat_row, COL_LET
  FROM (SELECT 1 as seat_row UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
        UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20
        UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29 UNION SELECT 30) rows
  CROSS JOIN (SELECT 'A' as COL_LET UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F') cols
) seat_combos
ON DUPLICATE KEY UPDATE seat_number=VALUES(seat_number);

-- Boeing 777-300ER (SW-002): 365 seats
-- First: Rows 1-2 (14 seats), Business: Rows 3-8 (48 seats), Economy: Rows 9-42 (303 seats)
-- Configuration: First (2-4-2), Business (2-4-2), Economy (3-4-3)
INSERT INTO seats (aircraft_id, seat_number, seat_class, row_number, column_letter, is_available)
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
        UNION SELECT 41 UNION SELECT 42) rows
  CROSS JOIN (SELECT 'A' as COL_LET UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F' UNION SELECT 'G' UNION SELECT 'H' UNION SELECT 'I' UNION SELECT 'J' UNION SELECT 'K') cols
  WHERE NOT (seat_row <= 2 AND COL_LET IN ('I', 'J', 'K'))  -- First class: A-H only
    AND NOT (seat_row BETWEEN 3 AND 8 AND COL_LET IN ('I', 'J', 'K'))  -- Business: A-H only
) seat_combos
ON DUPLICATE KEY UPDATE seat_number=VALUES(seat_number);

-- Airbus A320 (SW-003): 180 seats (30 rows, 6 seats per row: A-B-C-D-E-F)
-- Business: Rows 1-3 (18 seats), Economy: Rows 4-30 (162 seats)
INSERT INTO seats (aircraft_id, seat_number, seat_class, row_number, column_letter, is_available)
SELECT 3, CONCAT(seat_row, COL_LET),
       CASE WHEN seat_row <= 3 THEN 'business' ELSE 'economy' END,
       seat_row, COL_LET, TRUE
FROM (
  SELECT seat_row, COL_LET
  FROM (SELECT 1 as seat_row UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
        UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20
        UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29 UNION SELECT 30) rows
  CROSS JOIN (SELECT 'A' as COL_LET UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F') cols
) seat_combos
ON DUPLICATE KEY UPDATE seat_number=VALUES(seat_number);

-- Airbus A350 (SW-004): 325 seats
-- Business: Rows 1-6 (48 seats), Economy: Rows 7-40 (277 seats)
INSERT INTO seats (aircraft_id, seat_number, seat_class, row_number, column_letter, is_available)
SELECT 4, CONCAT(seat_row, COL_LET),
       CASE WHEN seat_row <= 6 THEN 'business' ELSE 'economy' END,
       seat_row, COL_LET, TRUE
FROM (
  SELECT seat_row, COL_LET
  FROM (SELECT 1 as seat_row UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
        UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20
        UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29 UNION SELECT 30
        UNION SELECT 31 UNION SELECT 32 UNION SELECT 33 UNION SELECT 34 UNION SELECT 35 UNION SELECT 36 UNION SELECT 37 UNION SELECT 38 UNION SELECT 39 UNION SELECT 40) rows
  CROSS JOIN (SELECT 'A' as COL_LET UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F' UNION SELECT 'G' UNION SELECT 'H') cols
) seat_combos
ON DUPLICATE KEY UPDATE seat_number=VALUES(seat_number);

-- IMPORTANT: After importing this schema, run the following to set proper password hashes:
-- node scripts/initialize_database.js
-- This will automatically update the password hashes for default users (admin@skywings.com and user@skywings.com)

