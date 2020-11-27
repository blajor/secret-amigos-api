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
        callback(error, undefined)
    });
}

function unsubsParticipant(eventid, participantid, callback) {

    const collection = db.collection('events');

    collection.updateOne({
        eventid,
        "participants.id": participantid
    },
    {
        $set: { "participants.$.unsubscribed": true }
    }).then(() => callback()).catch((error) => {
        console.log(error); //TODO ERASE
        callback(error);
    });
}

function mailSent(eventid, participantid, accepted) {

    const collection = db.collection('events');

    collection.updateOne({
        eventid,
        "participants.id": participantid
    },
    {
        $set: { "participants.$.emailSent": accepted }
    }).then((updated) => {
        return false;
    }).catch((error) => {
        return true;
    });
}

function findEvent(eventid, callback) {
    const collection = db.collection('events');

    collection.findOne({eventid})
    .then(targetEvent => {
        callback(undefined, targetEvent);
    }).catch((error) => {
        callback(error, undefined);
    })
}

module.exports = {
    saveEvent,
    unsubsParticipant,
    mailSent,
    setDBConnection,
    findEvent,
}
