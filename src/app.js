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
    getDashPage,
    getDashData,
    prepareDash,
} = require('./controller/appcontroller');
const { authenticateToken, getQueryData } = require('../utils/authenticator');

const app = express();
const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, '../public');

setDB()

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(publicDirectoryPath));

app.get('/en/unsubscribe/:queryToken', (req, res) => {
    getQueryData(req.params.queryToken, (err, queryObject) => {
        if(err) return res.json({ error: err})

        unsubscribeParticipant(queryObject, 'en', req.ip, (err, response) => {
            if(err)
                return res.json({ error: err })

            res.send(response)
        })
    })
})

app.get('/es/unsubscribe/:queryToken', (req, res) => {
    getQueryData(req.params.queryToken, (err, queryObject) => {
        if(err) return res.json({ error: err})

        unsubscribeParticipant(queryObject, 'es', req.ip, (err, response) => {
            if(err)
                return res.json({ error: err })

            res.send(response)
        })
    })
})

app.get('/en/confirm/:queryToken', (req, res) => {
        getQueryData(req.params.queryToken, (err, queryObject) => {
            if(err) return res.json({ error: err})

        confirmParticipant(queryObject, 'en', req.ip, (err, response) => {
            if(err) 
                return res.json({ error: err });

            res.send(response)
        });

    })
})

app.get('/es/confirm/:queryToken', (req, res) => {
    getQueryData(req.params.queryToken, (err, queryObject) => {
        if(err) return res.json({ error: err})

        confirmParticipant(queryObject, 'es', req.ip, (err, response) => {
            if(err) 
                return res.json({ error: err });

            res.send(response)
        });

    })
})

app.get('/api/results/:eventid', authenticateToken, (req, res) => {
    const eventid = req.params.eventid;

    viewParticipantStatus(eventid, req.ip, (err, result) => {
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

    eventGateway(req.body, req.ip, err => {
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

app.get('/dash', (req, res) => {
    getDashPage(result => {
        res.send(result)
    })
})

app.get('/api/dashboard', authenticateToken, (req, res) => {
    getDashData(result => {
        res.send(result)
    })
})

app.post('/api/preparedash', (req, res) => {
    prepareDash(result => {
        res.send(result)
    })
})

app.use(function (req, res, next) {
    res.status(404).send("Sorry can't find that!")
  })

app.listen(port, () => {
    console.log('Server is up on port ' + port);
})


