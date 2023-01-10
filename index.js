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

const HTML_FILE_FOR_EMAIL = fs.readFileSync('index.html', (err) => { console.log(err) });

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_ID,
        pass: process.env.PASSWORD
    }
});

var mailOptions = {
    from: process.env.EMAIL_ID,
    to: process.env.RECIPIENTS,
    subject: 'Today\'s entry not published!',
    text: 'Please publish',
    html: HTML_FILE_FOR_EMAIL,
};

function sendEmailAlert() {
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            writeToLogFile(`Error Sending email: ${error}`)
        } else {
            writeToLogFile(`Email sent: ${info.response}`);
        }
    });
}

function writeToLogFile(message) {
	fs.appendFileSync('task-log.txt', message);
}

function entryIsNotPublished(currentDate, entryDate) {
	const todaysEntryIsPublished = currentDate.getDay() === entryDate.getDay();
	const isPastWeekendPublishTime = currentDate.getDay() === 0 && currentDate.getHours() >= WEEKDAY_RULE.hour;
	const isPastWeekdayPublishTime = currentDate.getHours() >= WEEKEND_RULE.hour;
	
    if (currentDate === 6 || todaysEntryIsPublished) {
        writeToLogFile(`${currentDate} --WAS PUBLISHED SUCCESSFULLY\n`);
        return false;
    } else if (!todaysEntryIsPublished && (isPastWeekendPublishTime || isPastWeekdayPublishTime)) {
        writeToLogFile(`${currentDate} --WAS NOT PUBLISHED\n`);
        return true;
    }
}

function compareTime(title) {
    const currentDate = new Date();
    const mostRecentEntryDate = new Date(title);

    if (entryIsNotPublished(currentDate, mostRecentEntryDate)) {
		sendEmailAlert();
        //runAutoPublish(); -- To Do
    }
}

function getDateOfCurrentEntry() {
	axios.get(process.env.WEBSITE).then(res => {
		compareTime(res.data.title);
	}).catch((err) => {
		console.error(`Error fetching entry: ${err}`);
	});
}
