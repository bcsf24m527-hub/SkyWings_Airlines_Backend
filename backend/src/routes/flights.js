const express = require('express');
const { query } = require('../config/database');

const router = express.Router();

// ========== SEARCH FLIGHTS ==========
router.get('/search', async (req, res) => {
  try {
    const { from, to, departure, return: returnDate, passengers = 1, class: flightClass = 'economy' } = req.query;

    let sql = `
      SELECT 
        f.flight_id,
        f.flight_number,
        f.departure_datetime,
        f.arrival_datetime,
        f.status,
        f.base_price,
        f.business_price,
        f.first_class_price,
        f.aircraft_id,
        a.model as aircraft_model,
        a.capacity,
        dep.airport_code as from_code,
        dep.airport_name as from_name,
        dep.city as from_city,
        dep.country as from_country,
        arr.airport_code as to_code,
        arr.airport_name as to_name,
        arr.city as to_city,
        arr.country as to_country,
        CASE 
          WHEN ? = 'economy' THEN f.base_price
          WHEN ? = 'business' THEN f.business_price
          WHEN ? = 'first' THEN f.first_class_price
          ELSE f.base_price
        END as price
      FROM flights f
      INNER JOIN airports dep ON f.from_airport_code = dep.airport_code
      INNER JOIN airports arr ON f.to_airport_code = arr.airport_code
      INNER JOIN aircraft a ON f.aircraft_id = a.aircraft_id
      WHERE f.status IN ('scheduled', 'boarding')
    `;

    const params = [flightClass, flightClass, flightClass];

    if (from) {
      sql += ' AND f.from_airport_code = ?';
      params.push(from);
    }

    if (to) {
      sql += ' AND f.to_airport_code = ?';
      params.push(to);
    }

    if (departure) {
      sql += ' AND DATE(f.departure_datetime) = ?';
      params.push(departure);
    }

    sql += ' ORDER BY f.departure_datetime ASC';

    const flights = await query(sql, params);

    // Calculate available seats for each flight
    for (let flight of flights) {
      const [bookedSeatsResult] = await query(
        `SELECT COUNT(*) as booked_seats
         FROM booking_passengers bp
         INNER JOIN bookings b ON bp.booking_id = b.booking_id
         WHERE b.flight_id = ? AND b.status != 'cancelled'`,
        [flight.flight_id]
      );

      const booked = bookedSeatsResult.booked_seats || 0;
      flight.available_seats = Math.max(0, flight.capacity - booked);
      flight.total_price = parseFloat(flight.price) * parseInt(passengers);
    }

    res.json({
      success: true,
      message: 'Flights retrieved successfully',
      data: {
        flights: flights || [],
        search_params: {
          from,
          to,
          departure,
          return: returnDate,
          passengers: parseInt(passengers),
          class: flightClass
        }
      }
    });
  } catch (error) {
    console.error('Flight search error:', error);
    res.status(500).json({
      success: false,
      message: 'Flight search failed: ' + error.message
    });
  }
});

// ========== GET SINGLE FLIGHT ==========
router.get('/:id', async (req, res) => {
  try {
    const flightId = parseInt(req.params.id);

    if (isNaN(flightId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid flight ID'
      });
    }

    const flights = await query(
      `SELECT 
        f.*,
        a.model as aircraft_model,
        a.capacity,
        dep.airport_code as from_code,
        dep.airport_name as from_name,
        dep.city as from_city,
        dep.country as from_country,
        arr.airport_code as to_code,
        arr.airport_name as to_name,
        arr.city as to_city,
        arr.country as to_country
       FROM flights f
       INNER JOIN airports dep ON f.from_airport_code = dep.airport_code
       INNER JOIN airports arr ON f.to_airport_code = arr.airport_code
       INNER JOIN aircraft a ON f.aircraft_id = a.aircraft_id
       WHERE f.flight_id = ?`,
      [flightId]
    );

    if (!flights || flights.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Flight not found'
      });
    }

    // Calculate available seats
    const [bookedSeatsResult] = await query(
      `SELECT COUNT(*) as booked_seats
       FROM booking_passengers bp
       INNER JOIN bookings b ON bp.booking_id = b.booking_id
       WHERE b.flight_id = ? AND b.status != 'cancelled'`,
      [flightId]
    );

    const booked = bookedSeatsResult.booked_seats || 0;
    flights[0].available_seats = Math.max(0, flights[0].capacity - booked);

    res.json({
      success: true,
      data: { flight: flights[0] }
    });
  } catch (error) {
    console.error('Get flight error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get flight details: ' + error.message
    });
  }
});

// ========== GET FLIGHT STATUS ==========
router.get('/status/:flightNumber', async (req, res) => {
  try {
    const { flightNumber } = req.params;

    const flights = await query(
      `SELECT 
        f.*,
        a.model as aircraft_model,
        dep.airport_code as from_airport_code,
        dep.airport_name as from_name,
        dep.city as from_city,
        dep.country as from_country,
        arr.airport_code as to_airport_code,
        arr.airport_name as to_name,
        arr.city as to_city,
        arr.country as to_country
       FROM flights f
       INNER JOIN airports dep ON f.from_airport_code = dep.airport_code
       INNER JOIN airports arr ON f.to_airport_code = arr.airport_code
       INNER JOIN aircraft a ON f.aircraft_id = a.aircraft_id
       WHERE f.flight_number = ?`,
      [flightNumber]
    );

    if (!flights || flights.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Flight not found'
      });
    }

    res.json({
      success: true,
      data: { flight: flights[0] }
    });
  } catch (error) {
    console.error('Flight status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get flight status: ' + error.message
    });
  }
});

module.exports = router;
