const express = require('express');
const path = require('path');
const { validationResult } = require('express-validator');
const { registerLanguageRoutes } = require('./routes/languageRoutes');
const { resultsValidation } = require('./validators/results');
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

registerLanguageRoutes(app, { getQueryData, unsubscribeParticipant, confirmParticipant });

app.get('/api/results/:eventid', authenticateToken, (req, res) => {
    const eventid = req.params.eventid;

    viewParticipantStatus(eventid, req.ip, (err, result) => {
        if(err) return res.sendStatus(404).end();

        res.send(result);
    })
})

app.post('/api/results', resultsValidation, authenticateToken, (req, res) => {
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

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    })
})

app.use(function (req, res, next) {
    res.status(404).send("Sorry can't find that!")
  })

app.listen(port, () => {
    console.log('Server is up on port ' + port);
})


