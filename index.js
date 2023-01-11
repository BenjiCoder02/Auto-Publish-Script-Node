require('dotenv').config();
const nodemailer = require('nodemailer');
const axios = require('axios');
const schedule = require('node-schedule');
const fs = require('fs');
const FormData = require('form-data');

const WEEKDAY_PUBLISH_HOUR = 18;
const WEEKDAY_PUBLISH_MINUTE = 15;
const WEEKEND_PUBLISH_HOUR = 11;

const WEEKDAY_RULE = new schedule.RecurrenceRule();
WEEKDAY_RULE.dayOfWeek = [new schedule.Range(1, 5)];
WEEKDAY_RULE.hour = WEEKDAY_PUBLISH_HOUR;
WEEKDAY_RULE.minute = WEEKDAY_PUBLISH_MINUTE;

const WEEKEND_RULE = new schedule.RecurrenceRule();
WEEKEND_RULE.dayOfWeek = [0];
WEEKEND_RULE.hour = WEEKEND_PUBLISH_HOUR;
WEEKEND_RULE.minute = 00;

const WEEKDAY_JOB = schedule.scheduleJob(WEEKDAY_RULE, getDateOfCurrentEntry);
const WEEKEND_JOB = schedule.scheduleJob(WEEKEND_RULE, getDateOfCurrentEntry);

const HTML_FILE_FOR_EMAIL = fs.readFileSync('index.html', (err) => { console.log(err) });

function writeToLogFile(message) {
	fs.appendFileSync('task-log.txt', message);
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_ID,
        pass: process.env.PASSWORD
    }
});

const mailOptions = {
    from: process.env.EMAIL_ID,
    to: process.env.RECIPIENTS,
    subject: 'Today\'s entry not published!',
    text: 'Please publish',
    html: HTML_FILE_FOR_EMAIL,
};

function sendEmailAlert() {
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            writeToLogFile(`Error Sending email: ${error}\n`)
        } else {
            writeToLogFile(`Email sent: ${info.response}\n`);
        }
    });
}

function sendPublishPutRequest(url, data, token) {
    axios.put(url, data.entity, {
        headers: {
            username: process.env.ADMIN_USERNAME,
            token: token,
            }
    }).then(res => {
            writeToLogFile(`${new Date()}  |   ${res.data.entity.id}   |   PUBLISHED VIA SCRIPT\n`);
        }).catch((err) => {
            sendEmailAlert();
            writeToLogFile(`${err}   |   ERROR ON PUT REQUEST\n`);
        });
}

function publishIfNotAlreadyPublished(showId, token) {
    let url = `${process.env.ADMIN_WEBSITE}${process.env.ADMIN_PROGRAM_URL}`;
    url = url.replace('{entryId}', showId);

    axios.get(url, {
        headers: {
            username: process.env.ADMIN_USERNAME,
            token: token,
        }
    }).then(res => {
        if (res.status === 200) {
            const data = res.data;
            if (res.data.entity.publishable && !res.data.entity.published) {
                data.entity.published = true;
                sendPublishPutRequest(url, data, token);
            }
        }
    }).catch(err => {
        writeToLogFile(`Entry Not found error' ${err}\n`);
        sendEmailAlert();
    })
}

function findTodaysEntryID(token) {
    const formattedCurrentDate = new Date().toISOString().split('T')[0];
    let url = `${process.env.ADMIN_WEBSITE}${process.env.ADMIN_SEARCH_PROGRAM}`;
    url = url.replace('{publishDate}', formattedCurrentDate);
    axios.get(url, {
        headers: {
            username: process.env.ADMIN_USERNAME,
            token: token
    }
    }).then((res) => {
        if (res.status === 200 && res.data.elements.length > 0) {
            publishIfNotAlreadyPublished(res.data.elements[0].id, token);
            return res.data.elements[0].id;
        }
    }).catch((err) => {
        writeToLogFile(`Entry not found error: \n${err}\n`)
    })
}

function runAutoPublish() {
    const token = fs.readFileSync('./token.txt', {encoding: 'utf-8'});
    writeToLogFile(`${new Date()}  |  PUBLISHING AUTOMATICALLY VIA SCRIPT\n`);
    const formData = new FormData();
    formData.append('username', process.env.ADMIN_USERNAME);
    formData.append('password', process.env.ADMIN_PASSWORD);
    axios.get(`${process.env.ADMIN_WEBSITE}${process.env.ADMIN_STATUS}`, {
        headers: {
            username: process.env.ADMIN_USERNAME,
            token: token,
        }
    }).then((res) => {
        if (res.status === 200 && res.data.authenticated) {
            findTodaysEntryID(token);
            return token;
        } else {
            axios.post(`${process.env.ADMIN_WEBSITE}${process.env.ADMIN_LOGIN}`, formData).
                then((res) => {
                    if (res.status === 200) {
                        fs.writeFileSync('./token.txt', res.data.token);
                        findTodaysEntryID(res.data.token);
                        writeToLogFile('TOKEN EXPIRED: FETCHING NEW TOKEN\n');
                        return res.data.token;
                    }
            }).catch(err => {console.error(err)})
        }
    }).catch((err) => console.error(err));
}

function entryIsNotPublished(currentDate, entryDate) {
	const todaysEntryIsPublished = currentDate.getDay() === entryDate.getDay();
	const isPastWeekendPublishTime = currentDate.getDay() === 0 && currentDate.getHours() >= WEEKEND_PUBLISH_HOUR;
	const isPastWeekdayPublishTime = currentDate.getHours() >= WEEKDAY_PUBLISH_HOUR;

    if (currentDate.getDay() === 6 || todaysEntryIsPublished) {
        writeToLogFile(`${currentDate}  |           |   WAS PUBLISHED SUCCESSFULLY\n`);
        return false;
    } else if (!todaysEntryIsPublished && (isPastWeekendPublishTime || isPastWeekdayPublishTime)) {
        writeToLogFile(`${currentDate}  |           |   WAS NOT PUBLISHED\n`);
        return true;
    }
}

function compareTime(title) {
    const currentDate = new Date();
    const mostRecentEntryDate = new Date(title);

    if (entryIsNotPublished(currentDate, mostRecentEntryDate)) {
        runAutoPublish();
    }
}

function getDateOfCurrentEntry() {
	axios.get(`${process.env.WEBSITE}`).then(res => {
		compareTime(res.data.title);
	}).catch((err) => {
		console.error(`Error fetching entry: ${err}`);
	});
}

