const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, queryOne } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All check-in routes require authentication
router.use(authenticate);

// ========== SEARCH BOOKING FOR CHECK-IN ==========
router.post('/search', [
  body('booking_reference')
    .trim()
    .notEmpty().withMessage('Booking reference is required')
    .isLength({ min: 5, max: 20 }).withMessage('Booking reference must be between 5 and 20 characters')
    .matches(/^[A-Z0-9]+$/).withMessage('Booking reference must contain only uppercase letters and numbers'),
  body('last_name')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Last name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { booking_reference, last_name } = req.body;

    // First, find booking by reference
    const booking = await queryOne(
      `SELECT 
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
       WHERE b.booking_reference = ?`,
      [booking_reference]
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found. Please check your booking reference.'
      });
    }

    // Verify booking belongs to user (if user is logged in)
    if (req.user.userId !== booking.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: This booking does not belong to you'
      });
    }

    // Check booking status
    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: `This booking cannot be checked in. Current status: ${booking.status}`
      });
    }

    // Verify last name matches at least one passenger (for security)
    const passengerMatch = await queryOne(
      `SELECT p.last_name 
       FROM booking_passengers bp
       INNER JOIN passengers p ON bp.passenger_id = p.passenger_id
       WHERE bp.booking_id = ? AND LOWER(p.last_name) = LOWER(?)`,
      [booking.booking_id, last_name]
    );

    if (!passengerMatch) {
      return res.status(404).json({
        success: false,
        message: 'Last name does not match any passenger in this booking. Please verify the last name of one of the passengers.'
      });
    }

    // Check if already checked in
    const existingCheckIn = await queryOne(
      'SELECT check_in_id, status FROM check_ins WHERE booking_id = ?',
      [booking.booking_id]
    );

    if (existingCheckIn) {
      if (existingCheckIn.status === 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Already checked in',
          data: { booking, alreadyCheckedIn: true }
        });
      }
    }

    // Check if check-in window is open (typically 24 hours before departure)
    const departureTime = new Date(booking.departure_datetime);
    const now = new Date();
    const hoursUntilDeparture = (departureTime - now) / (1000 * 60 * 60);

    if (hoursUntilDeparture < 0) {
      // If the flight already departed and there is no completed check-in, mark the booking as missed
      const existingCheckInAfter = await queryOne(
        'SELECT check_in_id FROM check_ins WHERE booking_id = ?',
        [booking.booking_id]
      );

      if (!existingCheckInAfter) {
        await query(
          'UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE booking_id = ?',
          ['missed', booking.booking_id]
        );
      }

      return res.status(400).json({
        success: false,
        message: 'Flight has already departed. Booking marked as missed if not checked in.'
      });
    }

    if (hoursUntilDeparture > 24) {
      return res.status(400).json({
        success: false,
        message: `Check-in opens 24 hours before departure. Check-in will be available ${Math.ceil(hoursUntilDeparture - 24)} hours from now.`
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
        bp.seat_number,
        bp.booking_passenger_id
       FROM booking_passengers bp
       INNER JOIN passengers p ON bp.passenger_id = p.passenger_id
       WHERE bp.booking_id = ?
       ORDER BY p.last_name, p.first_name`,
      [booking.booking_id]
    );

    booking.passengers = passengers || [];

    res.json({
      success: true,
      data: { booking }
    });
  } catch (error) {
    console.error('Check-in search error:', error);
    res.status(500).json({
      success: false,
      message: 'Check-in search failed: ' + error.message
    });
  }
});

// ========== CONFIRM CHECK-IN ==========
router.post('/confirm', [
  body('booking_id')
    .notEmpty().withMessage('Booking ID is required')
    .isInt({ min: 1 }).withMessage('Booking ID must be a positive integer'),
  body('seat_numbers')
    .isArray({ min: 1 }).withMessage('At least one seat number is required')
    .custom((value) => {
      if (!Array.isArray(value) || value.length === 0) {
        throw new Error('Seat numbers must be an array with at least one element');
      }
      for (const seat of value) {
        if (typeof seat !== 'string' || seat.trim().length === 0) {
          throw new Error('Each seat number must be a non-empty string');
        }
      }
      return true;
    }),
  body('gate_number')
    .optional()
    .trim()
    .isLength({ max: 10 }).withMessage('Gate number is too long')
], async (req, res) => {
  const connection = await require('../config/database').pool.getConnection();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    await connection.beginTransaction();

    const { booking_id, seat_numbers, gate_number } = req.body;
    const bookingId = parseInt(booking_id);

    // Verify booking exists and belongs to user
    const [bookingRows] = await connection.execute(
      'SELECT * FROM bookings WHERE booking_id = ? AND user_id = ? AND status = ?',
      [bookingId, req.user.userId, 'confirmed']
    );

    if (!bookingRows || bookingRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Booking not found or cannot be checked in'
      });
    }

    const bookingData = bookingRows[0];

    // Check if already checked in
    const [existingCheckInRows] = await connection.execute(
      'SELECT * FROM check_ins WHERE booking_id = ?',
      [bookingId]
    );

    if (existingCheckInRows && existingCheckInRows.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Already checked in'
      });
    }

    // Verify check-in window
    const [flightRows] = await connection.execute(
      'SELECT departure_datetime FROM flights WHERE flight_id = ?',
      [bookingData.flight_id]
    );

    if (!flightRows || flightRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Flight not found'
      });
    }

    const departureTime = new Date(flightRows[0].departure_datetime);
    const now = new Date();
    const hoursUntilDeparture = (departureTime - now) / (1000 * 60 * 60);

    if (hoursUntilDeparture < 0) {
      // Mark booking as missed (within the transaction) when attempting to check in after departure
      await connection.execute(
        'UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE booking_id = ?',
        ['missed', bookingId]
      );
      await connection.commit();

      return res.status(400).json({
        success: false,
        message: 'Flight has already departed. Booking has been marked as missed.'
      });
    }

    if (hoursUntilDeparture > 24) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Check-in opens 24 hours before departure'
      });
    }

    // Calculate boarding time (30 minutes before departure)
    const boardingTime = new Date(departureTime.getTime() - 30 * 60 * 1000);

    // Get passengers for this booking
    const [passengerRows] = await connection.execute(
      'SELECT booking_passenger_id FROM booking_passengers WHERE booking_id = ? ORDER BY booking_passenger_id',
      [bookingId]
    );

    if (passengerRows.length !== seat_numbers.length) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Number of seat numbers (${seat_numbers.length}) does not match number of passengers (${passengerRows.length})`
      });
    }

    // Create check-in record
    await connection.execute(
      `INSERT INTO check_ins (booking_id, check_in_datetime, gate_number, boarding_time, status)
       VALUES (?, NOW(), ?, ?, 'completed')`,
      [bookingId, gate_number || 'TBA', boardingTime]
    );

    // Update seat numbers for passengers
    for (let i = 0; i < passengerRows.length && i < seat_numbers.length; i++) {
      await connection.execute(
        'UPDATE booking_passengers SET seat_number = ? WHERE booking_passenger_id = ?',
        [seat_numbers[i].trim().toUpperCase(), passengerRows[i].booking_passenger_id]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: 'Check-in confirmed successfully',
      data: {
        booking_id: bookingId,
        gate_number: gate_number || 'TBA',
        boarding_time: boardingTime
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Check-in confirm error:', error);
    res.status(500).json({
      success: false,
      message: 'Check-in confirmation failed: ' + error.message
    });
  } finally {
    connection.release();
  }
});

module.exports = router;
