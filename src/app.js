const path = require('path');
const fs = require('fs');
const express = require('express');
const Handlebars = require('handlebars');
const {sendResults} = require('../utils/mailer');
const { body, validationResult, check } =  require('express-validator');

const app = express();
const port = process.env.PORT || 3000;

const publicDirectoryPath = path.join(__dirname, '../public');


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(publicDirectoryPath));

app.post('/api/sendresults', [
    check("eventid", "Event id must be a valid UUID value").isUUID(),
    check("eventname", "Event Name is a required field").notEmpty(),
    check("eventdatetime", "Event date time is a required field").notEmpty(),
    check("language", "Language required field").notEmpty(),
    check("participants.*.id", "Participant id must be a valid UUID value").isUUID(),
    check("participants.*.name", "Participant name is a required field").notEmpty(),
    check("participants.*.email", "Participant email is a required field").notEmpty(),
    check("participants.*.friendname", "Participant friendname is a required field").notEmpty(),
], (req, res) => {
    // if(!req.body) return res.status(404).end();
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const {eventname, eventdatetime, amount, language, participants} = req.body;
    const accepted = [];
    const rejected = [];
    var counter = 0;

    if(participants.length < 3 || participants.length > 20)
        return res.status(404).send({error: 'Unable to send < 3 or > 20 participants. Please review and retry.'})


    for(let i = 0; i < participants.length; i++) {
        let {name: toname, surname: tosurname, email: toemail, friendname, friendsurname} = participants[i];
        createMailContent(eventname, eventdatetime, amount, language, toname, tosurname, toemail, friendname, friendsurname, false, (mailContent) => {
            sendResults({
                eventname,
                toname,
                tosurname,
                toemail,
                sendcalendar: false,
                mailbody: mailContent
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
        });
    }
})

function createMailContent(eventname, eventdatetime, amount, language, toname, tosurname, toemail, friendname, friendsurname, sendcalendar, callback) {
    let source = '../templates/views/';
    let amountMinMax = '';

    switch(language) {
        case 'es':
            source = source + 'esp.html';
            if(amount)
                amountMinMax = 'Monto min: ' + amount.min + ' y max: ' + amount.max
            break;
        case 'en':
            source = source + 'eng.html';
            if(amount)
                amountMinMax = 'Amount min: ' + amount.min + ' and max: ' + amount.max
            break;
        default:
            source = source + 'esp.html';
    }
    file = fs.readFile(path.join(__dirname, source), (err, data) => {
        if(err) return console.log(err);
        var template = Handlebars.compile(data.toString());
        var data = {
            "eventname": eventname,
            "eventdatetime": eventdatetime,
            "toname": toname,
            "tosurname": tosurname,
            "toemail": toemail,
            "friendname": friendname,
            "friendsurname": friendsurname,
            "amountMinMax": amountMinMax
        }
        var result = template(data);
        callback(result);
    })
}

app.listen(port, () => {
    console.log('Server is up on port ' + port);
})


