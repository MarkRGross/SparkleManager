const express = require('express');
const mongoose = require('mongoose'); // Added to use mongoose.Types.ObjectId
const FinancialRecord = require('../models/FinancialRecord');
const { isAuthenticated } = require('./middleware/authMiddleware');
const router = express.Router();

// Route to display form for adding a new financial record
router.get('/finance/add', isAuthenticated, (req, res) => {
  res.render('finance/addFinancialRecord');
});

// Route to handle submission of the new financial record form
router.post('/finance/add', isAuthenticated, async (req, res) => {
  const { type, amount, category } = req.body;
  try {
    const newRecord = await FinancialRecord.create({
      type,
      amount,
      category,
      user: req.session.userId
    });
    console.log(`New financial record added: ${newRecord}`);
    res.redirect('/finance');
  } catch (error) {
    console.error('Error adding financial record:', error.message, error.stack);
    res.status(500).send('Error adding financial record. Please try again.');
  }
});

// Route to view all financial records
router.get('/finance', isAuthenticated, async (req, res) => {
  try {
    const records = await FinancialRecord.find({ user: req.session.userId }).sort({ date: -1 });
    console.log(`Found ${records.length} financial records for user ${req.session.userId}`);
    res.render('finance/listFinancialRecords', { records });
  } catch (error) {
    console.error('Error fetching financial records:', error.message, error.stack);
    res.status(500).send('Error fetching financial records. Please try again.');
  }
});

// Route to generate year-end tax report
router.get('/finance/report', isAuthenticated, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.session.userId); // Convert string userId to ObjectId using 'new' keyword
    const income = await FinancialRecord.aggregate([
      { $match: { user: userId, type: 'income' } },
      { $group: { _id: null, totalIncome: { $sum: '$amount' } } }
    ]);

    const expenses = await FinancialRecord.aggregate([
      { $match: { user: userId, type: 'expense' } },
      { $group: { _id: null, totalExpenses: { $sum: '$amount' } } }
    ]);

    const totalIncome = income.length ? income[0].totalIncome : 0;
    const totalExpenses = expenses.length ? expenses[0].totalExpenses : 0;
    const netProfit = totalIncome - totalExpenses;

    res.render('finance/report', {
      totalIncome,
      totalExpenses,
      netProfit
    });
    console.log(`Year-end tax report generated for user ${req.session.userId}`);
  } catch (error) {
    console.error('Error generating year-end tax report:', error.message, error.stack);
    res.status(500).send('Error generating year-end tax report. Please try again.');
  }
});

module.exports = router;