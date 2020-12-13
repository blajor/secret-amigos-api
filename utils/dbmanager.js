const MongoClient = require('mongodb').MongoClient;
const {
    setDBConn,
    eventSaved,
    logParticipantStatus,
} = require('./logger')

let db;

function setDBConnection() {
    MongoClient.connect(process.env.DB_URI, { 
    useNewUrlParser:true,
    useUnifiedTopology: true,
    poolSize: 10
    }).then(client => {
        db = client.db(process.env.DB_NAME);
        console.log(`DB connection up and running: '${process.env.DB_NAME}'`)
        setDBConn(db)
    }).catch(error => console.log(error));
}

function prepareEvent(newEvent, callback) {
    
    findEvent(newEvent.id, (error, oldEvent) => {
        if(error) {

            newEvent.participants.forEach(part => part.status = 'pending')
            newEvent.active = undefined;
            newEvent.deleted = false;
            return callback(newEvent);
        
        } else {

            oldEvent.amount = newEvent.amount
            oldEvent.custommessage = newEvent.custommessage
            oldEvent.datetime = newEvent.datetime
            oldEvent.language = newEvent.language
            oldEvent.location = newEvent.location
            oldEvent.name = newEvent.name
            oldEvent.sendemails = newEvent.sendemails
    
            newEvent.participants.forEach(part => {
                let oPart = oldEvent.participants.find(oopart => oopart.id === part.id)
                if(typeof oPart === 'undefined') {
                    part.status = 'pending'
                } else {
                    part.status = oPart.status
                    part.emailerror = oPart.emailerror
                }
            })
    
            oldEvent.participants = newEvent.participants
            
            return callback(oldEvent)
        }
    })
}

function saveEvent(event) {

    const collection = db.collection('events');

    prepareEvent(event, preparedEvent => {
        preparedEvent.active = true;

        collection.updateOne(
            { id: preparedEvent.id },
            { $set: preparedEvent },
            { upsert: true })
        .then((updatedEvent) => {
            eventSaved(event)
        })
        .catch((error) => {
            console.error(error) //TODO CONSOLE LOG OK
        });
    })
    return
}

function unsubsParticipant({eventid, participantid, email}, callback) {
    const collection = db.collection('events');

    collection.updateOne({
        "id": eventid,
        "participants.id": participantid,
        "participants.email": email,
        deleted: false
    },
    {
        $set: { 
            "participants.$.status": "unsubscribed",
            "participants.$.emailerror": undefined,
        }
    }).then((result) => {
        if(result.matchedCount === 1) {
            findEvent(eventid, (err, event) => {
                logParticipantStatus(eventid, participantid, email, 'unsubscribed', true)
                return callback(undefined, event)
            })
        } else {
            logParticipantStatus(eventid, participantid, email, 'unsubscribed', false, 'Participant does not belong to this event.')
            callback('Participant does not belong to this event.');
        }
    }).catch((error) => {
        logParticipantStatus(eventid, participantid, email, 'unsubscribed', false, error)
        callback(error);
    });
}

function confParticipant({eventid, participantid, email}, callback) {
    const collection = db.collection('events');

    collection.updateOne({
        "id": eventid,
        "participants.id": participantid,
        "participants.email": email,
        deleted: false
    },
    {
        $set: { 
            "participants.$.status": "confirmed",
            "participants.$.emailerror": undefined,
        }
    }).then((result) => {
        if(result.matchedCount === 1) {
            findEvent(eventid, (err, event) => {
                logParticipantStatus(eventid, participantid, email, 'confirmed', true, '')
                return callback(undefined, event);
            })
        } else {
            logParticipantStatus(eventid, participantid, email, 'confirmed', false, 'Participant does not belong to this event.')
            callback('Participant does not belong to this event.');
        }
    }).catch((error) => {
        logParticipantStatus(eventid, participantid, email, 'confirmed', false, error)
                callback(error);
    });
}

function mailSent(eventid, participantid, email, error) {
    const collection = db.collection('events');

    collection.updateOne({
        "id": eventid,
        "participants.id": participantid,
        deleted: false
    },
    {
        $set: { 
            "participants.$.status": error === false ? 'accepted' : 'rejected',
            "participants.$.emailerror": error
         }
    }).then((result) => {
        if(result.matchedCount === 1) {
            logParticipantStatus(eventid, participantid, email, error === false ? 'accepted' : 'rejected', error === false, '')
            return false;
        } else {
            logParticipantStatus(eventid, participantid, email, error === false ? 'accepted' : 'rejected', error === false, 'No ')
            return true;
        }
    }).catch((error) => {
        logParticipantStatus(eventid, participantid, email, 'rejected', false, error)
        return true;
    });
}

function findEvent(id, callback) {
    const collection = db.collection('events');

    collection.findOne({id, deleted: false})
    .then(targetEvent => {
        if(targetEvent === null) return callback('Event does not exist.');
        callback(undefined, targetEvent);
    }).catch((error) => {
        callback(error, undefined);
    })
}

function findParticipant(eventid, participantid, callback) {
    const collection = db.collection('events')

    collection.findOne({"id": eventid, deleted: false})
    .then(targetEvent => {
        if(targetEvent === null) return callback('Event does not exist.')

        let targetParticipant = targetEvent.participants.find(particip => particip.id === participantid)

        if(typeof targetParticipant !== 'undefined')
            return callback(undefined, targetParticipant)

        callback('Participant does not belong to this event.')
    }).catch((error) => {
        callback(error, undefined)
    })
}

function deleteEventSoft(id, callback) {
    const collection = db.collection('events');

    collection.updateOne({id, deleted: false},
    {
        $set: { deleted: true }
    }).then((result) => {
        if(result.matchedCount === 1) return callback();
        callback('Event does not exist.');
    }).catch((error) => {
        callback(error);
    });
}

module.exports = {
    saveEvent,
    unsubsParticipant,
    mailSent,
    setDBConnection,
    findEvent,
    confParticipant,
    deleteEventSoft,
    findParticipant,
}