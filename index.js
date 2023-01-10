require('dotenv').config();
const nodemailer = require('nodemailer');
const axios = require('axios');
const schedule = require('node-schedule');

const WEEKDAY_RULE = new schedule.RecurrenceRule();
WEEKDAY_RULE.dayOfWeek = [new schedule.Range(1, 5)];
WEEKDAY_RULE.hour = 18;
WEEKDAY_RULE.minute = 00;

const WEEKEND_RULE = new schedule.RecurrenceRule();
WEEKEND_RULE.dayOfWeek = [0];
WEEKEND_RULE.hour = 11;
WEEKEND_RULE.minute = 00;

const WEEKDAY_JOB = schedule.scheduleJob(WEEKDAY_RULE, getDateOfCurrentEntry);
const WEEKEND_JOB = schedule.scheduleJob(WEEKEND_RULE, getDateOfCurrentEntry);

function getDateOfCurrentEntry() {
	axios.get(process.env.WEBSITE).then(res => {
		compareTime(res.data.title);
	}).catch((err) => {
		console.error(`Error fetching entry: ${err}`);
	});
}
