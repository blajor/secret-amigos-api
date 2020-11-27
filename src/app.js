// var mongoUtil = require('../utils/mongoUtil');
const express = require('express');
const path = require('path');
const { validationResult, check } =  require('express-validator');
const {
    addEvent,
    sendParticipanMail,
    unsubscribeParticipant,
    confirmParticipant,
    viewEventConfirmations,
    viewParticipantStatus,
} = require('./controller/appcontroller');

const app = express();
const port = process.env.PORT || 3000;

const publicDirectoryPath = path.join(__dirname, '../public');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(publicDirectoryPath));

app.get('/unsubscribe', [
    check("eventid", "eventid").isUUID(),
    check("participantid", "participantid").isUUID()
    ], (req, res) => {
        const errors = validationResult(req);
        if(!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { eventid, participantid } = req.query;
        unsubscribeParticipant(eventid, participantid, (err) => {
            if(err) 
                return res.json({ error: err });

            res.json({ 
                message: 'You habe been unsubscribed',
                eventid,
                participantid
            });
        });
    }
)

app.post('/api/results', [
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

        addEvent(req.body, err => {

            if(err) return res.json({error: err});

            res.sendStatus(200);
        })
    }
)

app.listen(port, () => {
    console.log('Server is up on port ' + port);
})


