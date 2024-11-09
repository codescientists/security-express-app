const bcrypt = require('bcrypt');
const User = require('../models/User');

const renderRegisterPage = async (req, res) => {
    try {
        if (req.session.user) {
            res.redirect('/dashboard')
        }

        res.render('register');
    } catch (error) {
        console.log(error.message);
    }
}


const handleRegistration = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.send('User already exists');
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save the new user to MongoDB
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();

        if (newUser) {
            res.render('registration-success')
        }
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: "Error registering user." });
    }
};


const renderLoginPage = async (req, res) => {
    try {
        if (req.session.user) {
            res.redirect('/dashboard')
        }

        res.render('login');
    } catch (error) {
        console.log(error.message);
    }
}

const handleLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user in MongoDB
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.send('Invalid username or password');
        }

        // Set the session user ID
        req.session.user = user._id;
        res.redirect('/dashboard');
    } catch (error) {
        console.log(error.message);
    }
};

const handleLogout = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                return res.send('Error logging out');
            }
            res.redirect('/auth/login');
        });
    } catch (error) {
        console.log(error.message);
    }
};


module.exports = {
    renderRegisterPage,
    renderLoginPage,
    handleRegistration,
    handleLogin,
    handleLogout
}