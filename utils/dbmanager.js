// const { MongoClient, ObjectID } = require('mongodb');

// const client = new MongoClient(process.env.DB_URI, { 
//     useNewUrlParser: true, 
//     useUnifiedTopology: true
// });

let db;
function setDBConnection(dbConn) {
    db=dbConn;
}

function prepareEvent(event) {
    for(let i = 0; i < event.participants.length; i++) {
        event.participants[i].confirmed = undefined;
        event.participants[i].unsubscribed = undefined;
        event.participants[i].emailSent = undefined;
    }
    event.active = undefined;
    event.deleted = false;
    return event;
}

function saveEvent(event, callback) {

    const collection = db.collection('events');

    const preparedEvent = prepareEvent(event);
    preparedEvent.active = true;

    collection.updateOne({eventid: preparedEvent.eventid}, { $set: preparedEvent }, {upsert: true})
    .then((updatedEvent) => {
        callback(undefined, updatedEvent._id)
    })
    .catch((error) => {
        console.error(error)
        callback(error, undefined)
    });
}

function unsubsParticipant(eventid, participantid, callback) {

    const collection = db.collection('events');

    collection.updateOne({
        eventid,
        "participants.id": participantid,
        deleted: false
    },
    {
        $set: { "participants.$.unsubscribed": true }
    }).then((result) => {
        if(result.matchedCount === 1) return callback();
        callback('Participant does not belong to this event.');
    }).catch((error) => {
        callback(error);
    });
}

function confParticipant(eventid, participantid, callback) {

    const collection = db.collection('events');

    collection.updateOne({
        eventid,
        "participants.id": participantid,
        deleted: false
    },
    {
        $set: { "participants.$.confirmed": true }
    }).then((result) => {
        if(result.matchedCount === 1) return callback();
        callback('Participant does not belong to this event.');
    }).catch((error) => {
        callback(error);
    });
}

function mailSent(eventid, participantid, accepted) {

    const collection = db.collection('events');

    collection.updateOne({
        eventid,
        "participants.id": participantid,
        deleted: false
    },
    {
        $set: { "participants.$.emailSent": accepted }
    }).then((result) => {
        if(result.matchedCount === 1) return false;
        return true;
    }).catch((_) => {
        return true;
    });
}

function findEvent(eventid, callback) {
    const collection = db.collection('events');

    collection.findOne({eventid, deleted: false})
    .then(targetEvent => {
        if(targetEvent === null) return callback('Event does not exist.');
        callback(undefined, targetEvent);
    }).catch((error) => {
        callback(error, undefined);
    })
}

// TODO COMPLETE IMPLEMENTATION
// function findParticipant(eventid, participantid, callback) {
//     const collection = db.collection()
// }

function deleteEventSoft(eventid, callback) {
    const collection = db.collection('events');

    collection.updateOne({eventid, deleted: false},
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
}
