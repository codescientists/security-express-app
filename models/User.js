const mongoose = require('mongoose');

// Define the subscription schema for storing subscription details
const subscriptionSchema = new mongoose.Schema({
    plan: { type: String, required: true },          // Plan name (e.g., 'monthlyBasic', 'yearlyPremium')
    apiKey: { type: String, required: true },         // Unique API key for accessing the service
    agreementId: { type: String, required: true, unique: true },    // PayPal agreement ID for managing subscriptions
    startDate: { type: Date, default: Date.now },     // Start date of the subscription
    endDate: { type: Date, required: true },     // Start date of the subscription
    status: { type: String, default: 'active' },      // Status of the subscription ('active', 'cancelled', etc.)
});

// Define the user schema for storing user details
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },       // Hashed password
    subscriptions: [subscriptionSchema],              // Array of subscription objects for multiple plans
    createdAt: { type: Date, default: Date.now }
});

// Create a model from the schema
const User = mongoose.model('User', userSchema);

module.exports = User;
