const express = require('express');
const participant = require('./model/participant')
const { sendResults } = require('../utils/mailer')
// const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// const publicDirectoryPath = path.join(__dirname, '../public');

// app.use(express.static(publicDirectoryPath));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/api/sendresults', (req, res) => {
    if(!req.body) res.status(404).end();
    const {eventname, eventdatetime, amount, language, participants} = req.body;
    sendResults({
        eventname,
        eventdatetime,
        amount,
        language,
        toname: participants[0].name,
        tosurname: participants[0].surname,
        toemail: participants[0].email,
        friendname: participants[0].friendname,
        friendsurname: participants[0].friendsurname,
        sendcalendar: false
    })
    res.status(200).send('Mail send successfully');
})

app.listen(port, () => {
    console.log('Server is up on port ' + port);
})


