// Load environment variables
require("dotenv").config();
const fs = require('fs');
const mongoose = require("mongoose");
const express = require("express");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const Event = require('./models/Event');
const FinancialRecord = require('./models/FinancialRecord');
const authRoutes = require("./routes/authRoutes");
const eventRoutes = require('./routes/eventRoutes');
const financialRoutes = require('./routes/financialRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const indexRoutes = require('./routes/index'); 
const apiRoutes = require('./routes/api');
const userRoutes = require('./routes/userRoutes'); // Added import for userRoutes
const morgan = require('morgan'); 
const cron = require('node-cron'); 
const GoogleCalendarAPI = require('./utils/googleCalendarAPI');
const User = require('./models/User');
const GoogleAuth = require('./models/GoogleAuth');
const SyncEventsToGoogleCalendar = require('./utils/syncEventsToGoogleCalendar'); // Import the new utility for syncing events to Google Calendar

if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET) {
  console.error("Error: config environment variables not set. Please create/edit .env configuration file.");
  process.exit(-1);
}

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Use morgan for logging HTTP requests
app.use(morgan('dev'));

// Setting the templating engine to EJS
app.set("view engine", "ejs");

// Serve static files
app.use(express.static("public"));

// Database connection
mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => {
    console.log("Database connected successfully");
  })
  .catch((err) => {
    console.error(`Database connection error: ${err.message}`);
    console.error(err.stack);
    console.log("Please ensure MongoDB is running and accessible. Check the DATABASE_URL in the .env file.");
    process.exit(1); // Exiting the process if the database connection fails
  });

// Session configuration with connect-mongo
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.DATABASE_URL }),
  }),
);

app.on("error", (error) => {
  console.error(`Server error: ${error.message}`);
  console.error(error.stack);
});

// Make session available to all views and log session access
app.use((req, res, next) => {
  res.locals.session = req.session;
  if (!req.session.views) {
    req.session.views = 1;
    console.log("Session created at: ", new Date().toISOString());
  } else {
    req.session.views++;
    console.log(`Session accessed again at: ${new Date().toISOString()}, Views: ${req.session.views}, User ID: ${req.session.userId || '(unauthenticated)'}`);
  }
  next();
});

// Authentication Routes
app.use(authRoutes);

// Event Routes
app.use(eventRoutes);

// Financial Routes
app.use(financialRoutes);

// Feedback Routes
app.use(feedbackRoutes);

// Index Routes for the About page
app.use(indexRoutes);

// Use the API routes with a base path of '/api'
app.use('/api', apiRoutes);

// Adding userRoutes to the application
app.use(userRoutes); // Use the userRoutes in the application

// Scheduled task for syncing Google Calendar events
cron.schedule('*/15 * * * *', async () => {
  console.log('Attempting two-way sync with Google Calendar');
  try {
    const syncEvents = new SyncEventsToGoogleCalendar();
    const users = await User.find({}).exec();
    for (const user of users) {
      console.log(`Starting the synchronization process for user ID: ${user._id}`);
      await syncEvents.syncToGoogleCalendar(user._id.toString()).catch(error => {
        console.error(`Error during synchronization for user ID: ${user._id}:`, error.message);
        console.error(error.stack);
      });
    }
    console.log('Two-way sync with Google Calendar completed successfully');
  } catch (error) {
    console.error('Error during two-way sync with Google Calendar:', error.message);
    console.error(error.stack);
  }
});

// Root path response with dashboard functionality
app.get("/", async (req, res) => {
  if (req.session && req.session.userId) {
    try {
      const userId = new mongoose.Types.ObjectId(req.session.userId); // Correctly instantiate ObjectId
      const currentDate = new Date();
      currentDate.setHours(0,0,0,0);
      const nextMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());

      // Fetch upcoming events
      const upcomingEvents = await Event.find({
        user: userId,
        eventDate: { $gte: currentDate, $lt: nextMonthDate }
      }).sort('eventDate');

      // Calculate total income and expenses for the current month
      const financialSummary = await FinancialRecord.aggregate([
        { $match: { user: userId, date: { $gte: currentDate, $lt: nextMonthDate } } },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' }
          }
        }
      ]);

      let totalIncome = 0, totalExpenses = 0;
      financialSummary.forEach(record => {
        if (record._id === 'income') totalIncome = record.total;
        else if (record._id === 'expense') totalExpenses = record.total;
      });

      res.render("index", { logged_in: true, upcomingEvents, totalIncome, totalExpenses });
    } catch (error) {
      console.error(`Dashboard data fetching error: ${error.message}`);
      console.error(error.stack);
      // Provide default values to prevent reference errors
      res.render("index", { logged_in: true, upcomingEvents: [], totalIncome: 0, totalExpenses: 0, error: "Error fetching dashboard data." });
    }
  } else {
    // Also provide default values here for consistency
    res.render("index", { logged_in: false, upcomingEvents: [], totalIncome: 0, totalExpenses: 0 });
  }
});

// If no routes handled the request, it's a 404
app.use((req, res, next) => {
  res.status(404).send("Page not found.");
});

// Custom route to handle authentication errors
app.get('/auth/error', (req, res) => {
  res.render('authError'); // Render the authentication error page
});

// Error handling
app.use((err, req, res, next) => {
  console.error(`Unhandled application error: ${err.message}`);
  console.error(err.stack);
  res.status(500).send("There was an error serving your request.");
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});