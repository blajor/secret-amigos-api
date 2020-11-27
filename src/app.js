const MongoClient = require('mongodb').MongoClient;
const express = require('express');
const path = require('path');
const { validationResult, check } =  require('express-validator');
const {
    addEvent,
    unsubscribeParticipant,
    resendMessage,
    confirmParticipant,
    viewParticipantStatus,
    deleteEvent,
    setDB,
} = require('./controller/appcontroller');

const app = express();
const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, '../public');

let db;

MongoClient.connect(process.env.DB_URI, { 
    useNewUrlParser:true,
    useUnifiedTopology: true,
    poolSize: 10
}).then(client => {
    db = client.db(process.env.DB_NAME);
    setDB(db);
}).catch(error => console.log(error));

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

app.get('/api/results/:eventid', (req, res) => {
    const eventid = req.params.eventid;

    viewParticipantStatus(eventid, (err, result) => {
        if(err) return res.sendStatus(404).end();

        res.send(result);
    })
})

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
        if(err) return res.status(404).json({errors: err});

        res.sendStatus(200);
    })
})

app.post('/api/results/resend', [
    check("eventid", "Event id must be a valid UUID value").isUUID(),
    check("participantid", "Participant id must be a valid UUID value").isUUID(),
], (req, res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    resendMessage(req.body, err => {
        if(err) return res.status(404).json({errors: err});

        res.sendStatus(200);
    })

})

app.delete('/api/events/:eventid', (req, res) => {
    const eventid = req.params.eventid;

    deleteEvent(eventid, (err, result) => {
        if(err) return res.sendStatus(404).end();

        res.send(result);
    })
})

app.listen(port, () => {
    console.log('Server is up on port ' + port);
})


