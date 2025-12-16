const express = require('express');
const { query, queryOne } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All booking routes require authentication
router.use(authenticate);

// ========== CREATE BOOKING ==========
router.post('/create', async (req, res) => {
  const connection = await require('../config/database').pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { flight_id, passengers, class: flightClass = 'economy' } = req.body;

    if (!flight_id || !passengers || !Array.isArray(passengers) || passengers.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Flight ID and passengers data are required'
      });
    }

    // Get flight details
    const [flightRows] = await connection.execute(
      `SELECT f.*, a.capacity,
        CASE 
          WHEN ? = 'economy' THEN f.base_price
          WHEN ? = 'business' THEN f.business_price
          WHEN ? = 'first' THEN f.first_class_price
          ELSE f.base_price
        END as price
       FROM flights f
       INNER JOIN aircraft a ON f.aircraft_id = a.aircraft_id
       WHERE f.flight_id = ? AND f.status IN ('scheduled', 'boarding')`,
      [flightClass, flightClass, flightClass, flight_id]
    );

    if (!flightRows || flightRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Flight not found or not available'
      });
    }

    const flightData = flightRows[0];

    // Check available seats
    const [bookedSeatsRows] = await connection.execute(
      `SELECT COUNT(*) as booked_seats
       FROM booking_passengers bp
       INNER JOIN bookings b ON bp.booking_id = b.booking_id
       WHERE b.flight_id = ? AND b.status != 'cancelled'`,
      [flight_id]
    );

    const booked = bookedSeatsRows[0]?.booked_seats || 0;
    const availableSeats = flightData.capacity - booked;

    if (availableSeats < passengers.length) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Not enough seats available. Only ${availableSeats} seat(s) remaining.`
      });
    }

    // Calculate total amount
    const totalAmount = parseFloat(flightData.price) * passengers.length;

    // Generate unique booking reference
    const bookingRef = 'BK' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();

    // Create booking
    const [bookingResult] = await connection.execute(
      `INSERT INTO bookings (
        booking_reference, user_id, flight_id, number_of_passengers, 
        class, total_amount, status, payment_status
      ) VALUES (?, ?, ?, ?, ?, ?, 'confirmed', 'paid')`,
      [bookingRef, req.user.userId, flight_id, passengers.length, flightClass, totalAmount]
    );

    const bookingId = bookingResult.insertId;

    // Add passengers
    for (const passengerData of passengers) {
      let passengerId;

      if (passengerData.passenger_id) {
        passengerId = passengerData.passenger_id;
      } else {
        // Create new passenger
        const [passengerResult] = await connection.execute(
          `INSERT INTO passengers (
            user_id, first_name, last_name, date_of_birth, 
            passport_number, nationality, is_saved
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            req.user.userId,
            passengerData.first_name,
            passengerData.last_name,
            passengerData.date_of_birth || null,
            passengerData.passport_number || null,
            passengerData.nationality || null,
            passengerData.save ? 1 : 0
          ]
        );
        passengerId = passengerResult.insertId;
      }

      // Link passenger to booking
      await connection.execute(
        `INSERT INTO booking_passengers (booking_id, passenger_id, seat_number)
         VALUES (?, ?, ?)`,
        [bookingId, passengerId, passengerData.seat_number || null]
      );
    }

    await connection.commit();

    // Get full booking details
    const booking = await queryOne(
      `SELECT 
        b.*,
        f.flight_number,
        f.departure_datetime,
        f.arrival_datetime,
        dep.city as from_city,
        arr.city as to_city
       FROM bookings b
       INNER JOIN flights f ON b.flight_id = f.flight_id
       INNER JOIN airports dep ON f.from_airport_code = dep.airport_code
       INNER JOIN airports arr ON f.to_airport_code = arr.airport_code
       WHERE b.booking_id = ?`,
      [bookingId]
    );

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: { booking }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create booking: ' + error.message
    });
  } finally {
    connection.release();
  }
});

// ========== GET USER BOOKINGS ==========
router.get('/list', async (req, res) => {
  try {
    const { status } = req.query;

    let sql = `
      SELECT 
        b.booking_id,
        b.booking_reference,
        b.user_id,
        b.flight_id,
        b.booking_date,
        b.number_of_passengers,
        b.class,
        b.total_amount,
        b.status,
        b.payment_status,
        b.payment_method,
        b.created_at,
        b.updated_at,
        f.flight_number,
        f.departure_datetime,
        f.arrival_datetime,
        f.status as flight_status,
        dep.airport_code as from_code,
        dep.airport_name as from_name,
        dep.city as from_city,
        arr.airport_code as to_code,
        arr.airport_name as to_name,
        arr.city as to_city
      FROM bookings b
      INNER JOIN flights f ON b.flight_id = f.flight_id
      INNER JOIN airports dep ON f.from_airport_code = dep.airport_code
      INNER JOIN airports arr ON f.to_airport_code = arr.airport_code
      WHERE b.user_id = ?
    `;

    const params = [req.user.userId];

    if (status && status !== 'all') {
      sql += ' AND b.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY b.booking_date DESC';

    const bookings = await query(sql, params);

    res.json({
      success: true,
      data: { bookings: bookings || [] }
    });
  } catch (error) {
    console.error('List bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve bookings: ' + error.message
    });
  }
});

// ========== GET SINGLE BOOKING ==========
router.get('/:id', async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);

    if (isNaN(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
    }

    const booking = await queryOne(
      `SELECT 
        b.*,
        f.flight_number,
        f.departure_datetime,
        f.arrival_datetime,
        f.status as flight_status,
        dep.airport_code as from_code,
        dep.airport_name as from_name,
        dep.city as from_city,
        arr.airport_code as to_code,
        arr.airport_name as to_name,
        arr.city as to_city
       FROM bookings b
       INNER JOIN flights f ON b.flight_id = f.flight_id
       INNER JOIN airports dep ON f.from_airport_code = dep.airport_code
       INNER JOIN airports arr ON f.to_airport_code = arr.airport_code
       WHERE b.booking_id = ? AND b.user_id = ?`,
      [bookingId, req.user.userId]
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Get passengers for this booking
    const passengers = await query(
      `SELECT 
        p.passenger_id,
        p.first_name,
        p.last_name,
        p.date_of_birth,
        p.passport_number,
        p.nationality,
        bp.seat_number
       FROM booking_passengers bp
       INNER JOIN passengers p ON bp.passenger_id = p.passenger_id
       WHERE bp.booking_id = ?`,
      [bookingId]
    );

    booking.passengers = passengers || [];

    res.json({
      success: true,
      data: { booking }
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get booking details: ' + error.message
    });
  }
});

// ========== CANCEL BOOKING ==========
router.post('/:id/cancel', async (req, res) => {
  const connection = await require('../config/database').pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const bookingId = parseInt(req.params.id);

    if (isNaN(bookingId)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
    }

    // Check if booking exists and belongs to user
    const [bookingRows] = await connection.execute(
      'SELECT * FROM bookings WHERE booking_id = ? AND user_id = ?',
      [bookingId, req.user.userId]
    );

    if (!bookingRows || bookingRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const bookingData = bookingRows[0];

    // Check if booking can be cancelled
    if (bookingData.status === 'cancelled') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled'
      });
    }

    if (bookingData.status === 'completed') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed booking'
      });
    }

    // Update booking status
    await connection.execute(
      'UPDATE bookings SET status = ?, payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE booking_id = ?',
      ['cancelled', 'refunded', bookingId]
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking: ' + error.message
    });
  } finally {
    connection.release();
  }
});

// ========== UPDATE BOOKING STATUS ==========
router.post('/:id/update-status', async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const { status } = req.body;

    if (isNaN(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
    }

    if (!status || !['completed', 'missed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status is required (completed, missed, or cancelled)'
      });
    }

    // Verify booking belongs to user
    const booking = await queryOne(
      'SELECT * FROM bookings WHERE booking_id = ? AND user_id = ?',
      [bookingId, req.user.userId]
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Update booking status
    await query(
      'UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE booking_id = ?',
      [status, bookingId]
    );

    res.json({
      success: true,
      message: 'Booking status updated successfully'
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking status: ' + error.message
    });
  }
});

module.exports = router;
