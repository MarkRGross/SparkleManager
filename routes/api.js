const express = require('express');
const mongoose = require('mongoose');
const moment = require('moment');
const Event = require('../models/Event');
const FinancialRecord = require('../models/FinancialRecord');
const { isAuthenticated } = require('./middleware/authMiddleware');
const router = express.Router();

router.get('/dashboard/summary', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const currentDate = moment().startOf('day');
    const next7DaysDate = moment().add(7, 'days').startOf('day');
    const nextMonthDate = moment().add(1, 'month').startOf('day');

    const upcomingEventsNext7Days = await Event.find({
      user: new mongoose.Types.ObjectId(userId),
      eventDate: { $gte: currentDate.toDate(), $lt: next7DaysDate.toDate() }
    }).sort('eventDate');

    const financialSummaryCurrentMonth = await FinancialRecord.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), date: { $gte: currentDate.toDate(), $lt: nextMonthDate.toDate() } } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' }
        }
      }
    ]);

    let totalIncome = 0, totalExpenses = 0;
    financialSummaryCurrentMonth.forEach(record => {
      if (record._id === 'income') totalIncome = record.total;
      else if (record._id === 'expense') totalExpenses = record.total;
    });

    res.json({
      success: true,
      data: {
        upcomingEventsCountNext7Days: upcomingEventsNext7Days.length,
        totalIncome,
        totalExpenses
      }
    });
  } catch (error) {
    console.error('API error fetching dashboard summary:', error.message, error.stack);
    res.status(500).json({ success: false, message: 'Server error fetching dashboard summary.' });
  }
});

module.exports = router;