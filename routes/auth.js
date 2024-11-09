const express = require('express');
const auth_route = express();

const bodyParser = require('body-parser');
auth_route.use(bodyParser.json());
auth_route.use(bodyParser.urlencoded({ extended: false }));

const path = require('path');

auth_route.set('view engine', 'ejs');
auth_route.set('views', path.join(__dirname, '../views'));

const authController = require('../controllers/authController');

auth_route.get('/register', authController.renderRegisterPage);
auth_route.post('/register', authController.handleRegistration);

auth_route.get('/login', authController.renderLoginPage);
auth_route.post('/login', authController.handleLogin);

auth_route.get('/logout', authController.handleLogout);

module.exports = auth_route;