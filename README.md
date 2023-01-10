# Auto-Publish-Script-Node
This is a scheduled job to check for an event that should be published at a specific
time each day. If it isn't published, this program will automatically publish and
notify the user if there is any error with publishing via email.

To run use 
`node index.js` or `nodemon index.js`

This program once finished should
1. Check for an event that should be published at a specific time
2. Publish the event in the case it isn't.
3. Notify the admin in the event there was an issue with publishing

This project uses the following dependencies
1. axios
2. dotenv
3. node-schedule
4. nodemailer
5. nodemon

