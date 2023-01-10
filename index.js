require('dotenv').config();
const nodemailer = require('nodemailer');
const axios = require('axios');
const schedule = require('node-schedule');

function InitialRun() {
	console.log('Running on Port 3000');
}

InitialRun();
