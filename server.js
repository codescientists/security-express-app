const express = require('express');
const path = require('path');
const session = require('express-session');
const app = express();
const PORT = 3000;
const dotenv = require('dotenv');
const { connectDB } = require('./config/db.js');
const authRoute = require('./routes/auth.js');
const paymentRoute = require('./routes/payment.js');
const User = require('./models/User.js');

dotenv.config();
connectDB();

// Middleware for parsing request bodies
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }  // Set to true for HTTPS
}));

// Set EJS as the templating engine
app.set('view engine', 'ejs');

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.render('index', { user: req.session.user });
});

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect('/auth/login');
}

app.use('/auth', authRoute);
app.use('/plans', isAuthenticated, paymentRoute);



// Protected route (dashboard)
app.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    // Fetch the user from the database
    const user = await User.findById(req.session.user);

    if (!user) {
      return res.status(404).send('User not found');
    }

    // Render the dashboard page, passing the user object to the template
    res.render('dashboard', {
      user: {
        username: user.name,
        email: user.email,
        plan: user.subscriptions.length > 0 ? user.subscriptions[user.subscriptions.length - 1].plan : 'No plan',
        apiKey: user.subscriptions.length > 0 ? user.subscriptions[user.subscriptions.length - 1].apiKey : 'N/A',
        endDate: user.subscriptions.length > 0 ? user.subscriptions[user.subscriptions.length - 1]?.endDate : 'N/A',
      }
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).send('An error occurred while loading the dashboard.');
  }
});

// Protected route to access user’s API key and plan info
app.get('/my-api', isAuthenticated, async (req, res) => {
  try {
    // Find the user by their session ID (assuming username is stored in `req.session.user`)
    const user = await User.findById(req.session.user);

    // Check if the user and their subscriptions exist
    if (user && user.subscriptions.length > 0) {
      // Get the most recent subscription (you can adjust this if needed)
      const latestSubscription = user.subscriptions[user.subscriptions.length - 1];

      res.send(`Your plan: ${latestSubscription.plan} <br> API Key: ${latestSubscription.apiKey}`);
    } else {
      res.send('No active plan found. Please purchase one.');
    }
  } catch (error) {
    console.error('Error fetching user plan:', error);
    res.status(500).send('An error occurred while fetching your plan details.');
  }
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on ${process.env.BASE_URL}`);
});
