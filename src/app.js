const express = require('express');
const path = require('path');
const { validationResult, check } =  require('express-validator');
const {
    eventGateway,
    unsubscribeParticipant,
    confirmParticipant,
    viewParticipantStatus,
    deleteEvent,
    setDB,
} = require('./controller/appcontroller');
const { authenticateToken } = require('../utils/authenticator');

const app = express();
const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, '../public');

setDB()

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
                message: 'You have been unsubscribed',
                eventid,
                participantid
            });
        });
    }
)

app.get('/confirm', [
    check("eventid", "eventid").isUUID(),
    check("participantid", "participantid").isUUID()
    ], (req, res) => {
        const errors = validationResult(req);
        if(!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { eventid, participantid } = req.query;
        confirmParticipant(eventid, participantid, (err, response) => {
            if(err) 
                return res.json({ error: err });

            // res.json({ 
            //     message: 'You have been confirmed!!',
            //     eventid,
            //     participantid
            // });
            res.send(response)
        });
    }
)

app.get('/api/results/:eventid', authenticateToken, (req, res) => {
    const eventid = req.params.eventid;

    viewParticipantStatus(eventid, (err, result) => {
        if(err) return res.sendStatus(404).end();

        res.send(result);
    })
})

app.post('/api/results', [
    check("id", "Event id must be a valid UUID value").isUUID(),
    check("name", "Event Name is a required field").notEmpty(),
    check("language", "Language required field").notEmpty(),
    check("sendemails", "'sendemails' flag is required").notEmpty(),
    check("participants.*.id", "Participant id must be a valid UUID value").isUUID(),
    check("participants.*.name", "Participant name is a required field").notEmpty(),
    check("participants.*.email", "Participant email is a required field").notEmpty(),
    check("participants.*.sendemail", "'sendemail' flag is required").notEmpty(),
    check("participants.*.friendid", "Participant friendid is a required field").notEmpty(),
    ], authenticateToken, (req, res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    eventGateway(req.body, err => {
        if(err) return res.status(404).json({errors: err});

        res.sendStatus(200);
    })
})

app.delete('/api/events/:eventid', authenticateToken, (req, res) => {
    const eventid = req.params.eventid;

    deleteEvent(eventid, (err, result) => {
        if(err) return res.sendStatus(404).end();

        res.send(result);
    })
})

app.use(function (req, res, next) {
    res.status(404).send("Sorry can't find that!")
  })

app.listen(port, () => {
    console.log('Server is up on port ' + port);
})


