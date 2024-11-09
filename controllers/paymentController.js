const User = require('../models/User');
const paypal = require('paypal-rest-sdk');
const { v4: uuidv4 } = require('uuid'); // For generating API keys
const dotenv = require('dotenv');
dotenv.config();

// PayPal configuration
paypal.configure({
    mode: process.env.PAYPAL_MODE, // Use 'live' for production
    client_id: process.env.PAYPAL_CLIENT_ID,
    client_secret: process.env.PAYPAL_CLIENT_SECRET
});

// Available plans with recurring options
const plans = {
    monthlyStarter: { name: 'Starter Monthly Plan', price: '19.00', frequency: 'MONTH', currency: 'USD' },
    yearlyStarter: { name: 'Starter Yearly Plan', price: '199.00', frequency: 'YEAR', currency: 'USD' },

    monthlyPro: { name: 'Pro Monthly Plan', price: '29.00', frequency: 'MONTH', currency: 'USD' },
    yearlyPro: { name: 'Pro Yearly Plan', price: '299.00', frequency: 'YEAR', currency: 'USD' },

    monthlyUltimate: { name: 'Ultimate Monthly Plan', price: '59.00', frequency: 'MONTH', currency: 'USD' },
    yearlyUltimate: { name: 'Ultimate Yearly Plan', price: '599.00', frequency: 'YEAR', currency: 'USD' },
};

// Render the plans selection page
const renderPlansPage = async (req, res) => {
    try {
        res.render('plans')
    } catch (error) {
        console.log(error.message);
    }
};

// Create subscription billing plan
const createSubscription = async (req, res) => {
    try {
        const planKey = req.params.plan;
        const selectedPlan = plans[planKey];
        if (!selectedPlan) return res.send('Plan not found');

        // PayPal billing plan configuration
        const billingPlanAttributes = {
            name: selectedPlan.name,
            description: `Subscription for ${selectedPlan.name}`,
            type: 'INFINITE', // 'INFINITE' for auto-renewing, 'FIXED' for one-time payment
            payment_definitions: [{
                name: selectedPlan.name,
                type: 'REGULAR',
                frequency_interval: '1',
                frequency: selectedPlan.frequency,
                amount: { currency: selectedPlan.currency, value: selectedPlan.price },
                cycles: '0' // '0' for infinite cycles
            }],
            merchant_preferences: {
                setup_fee: { currency: selectedPlan.currency, value: '0' },
                return_url: `${process.env.BASE_URL}/plans/success?plan=${planKey}`,
                cancel_url: `${process.env.BASE_URL}/plans/cancel`,
                auto_bill_amount: 'YES',
                initial_fail_amount_action: 'CONTINUE',
                max_fail_attempts: '1'
            }
        };

        // Create PayPal billing plan
        paypal.billingPlan.create(billingPlanAttributes, (error, billingPlan) => {
            if (error) {
                console.error(error);
                return res.send('Error creating billing plan');
            }
            // Activate the billing plan
            const billingPlanUpdateAttributes = [{ op: 'replace', path: '/', value: { state: 'ACTIVE' } }];
            paypal.billingPlan.update(billingPlan.id, billingPlanUpdateAttributes, (error, response) => {
                if (error) {
                    console.error(error);
                    return res.send('Error activating billing plan');
                }
                // Create billing agreement for the active plan
                const billingAgreementAttributes = {
                    name: selectedPlan.name,
                    description: `Subscription to ${selectedPlan.name}`,
                    start_date: new Date(Date.now() + 3600000).toISOString(), // Start one hour from now
                    plan: { id: billingPlan.id },
                    payer: { payment_method: 'paypal' }
                };
                paypal.billingAgreement.create(billingAgreementAttributes, (error, billingAgreement) => {
                    if (error) {
                        console.error(error);
                        return res.send('Error creating billing agreement');
                    }
                    // Redirect user to PayPal approval URL
                    const approvalUrl = billingAgreement.links.find(link => link.rel === 'approval_url').href;
                    res.redirect(approvalUrl);
                });
            });
        });
    } catch (error) {
        console.log(error.message);
    }
};

// Handle success (payment execution)
const successPage = async (req, res) => {
    try {
        const { token, plan } = req.query;
        if (!plans[plan]) return res.send('Plan not found');

        // Execute the billing agreement
        paypal.billingAgreement.execute(token, {}, async (error, billingAgreement) => {
            if (error) {
                console.error(error);
                return res.send('Subscription execution failed');
            }

            // Generate an API key and save the subscription to the user
            const apiKey = uuidv4();
            const currentDate = new Date();

            // Calculate the subscription end date based on the plan
            let endDate;
            if (plan.includes('monthly')) {
                endDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1)); // Add 1 month
            } else if (plan.includes('yearly')) {
                endDate = new Date(currentDate.setFullYear(currentDate.getFullYear() + 1)); // Add 1 year
            }

            if (req.session.user) {
                const user = await User.findById(req.session.user);
                user.subscriptions.push({
                    plan,
                    apiKey,
                    agreementId: billingAgreement.id,
                    endDate: endDate // Save the endDate to the subscription
                });
                await user.save();

                res.redirect('/dashboard');
            } else {
                res.send('User not authenticated');
            }
        });
    } catch (error) {
        console.log(error.message);
    }
};

// Handle subscription cancellation
const cancelPage = async (req, res) => {
    try {
        res.send('Subscription cancelled');
    } catch (error) {
        console.log(error.message);
    }
};

module.exports = {
    renderPlansPage,
    createSubscription,
    successPage,
    cancelPage,
};
