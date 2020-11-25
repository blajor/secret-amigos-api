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
    const accepted = [];
    const rejected = [];
    var counter = 0;

    if(participants.length < 3 || participants.length > 20)
        return res.status(404).send({error: 'Unable to send < 3 or > 20 participants. Please review and retry.'})

    for(let i = 0; i < participants.length; i++) {
        sendResults({
            eventname,
            eventdatetime,
            amount,
            language,
            toname: participants[i].name,
            tosurname: participants[i].surname,
            toemail: participants[i].email,
            friendname: participants[i].friendname,
            friendsurname: participants[i].friendsurname,
            sendcalendar: false
        }, (error, response) => {
            counter++;
            if(error) {
                if(error.accepted[0]) accepted.push(error.accepted[0]);
                if(error.rejected[0]) rejected.push(error.rejected[0]);
            } else {
                if(response.accepted[0]) accepted.push(response.accepted[0]);
                if(response.rejected[0]) rejected.push(response.rejected[0]);
                }
            if(counter === participants.length)
                res.status(200).send({
                    accepted,
                    rejected
                });
        });
    }
})

app.listen(port, () => {
    console.log('Server is up on port ' + port);
})


