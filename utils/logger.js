let collection

function setDBConn(db) {
    collection = db.collection('events');
}

function eventLogExists(event) {
    collection.findOne({ id: event.id })
    .then(result =>
        result ? true : false)
}

function eventSaved(event) {

    let now = new Date()

    collection.updateOne(
        { "id": event.id },
        { $push: 
            {
                "logs": {
                    "updatedOn": now.toISOString(),
                    "sendemails": event.sendemails,
                    "countParticipants": event.participants.length,
                    "server": process.env.SERVER_NAME
                }
            }
        },
        // { upsert: true }
    ).catch(error => console.error(error))
    console.log('event log created')

    // event.participants.forEach(part => participantSaved(event, part, now))
}

function participantSaved(event, participant, now) {

    collection.updateOne(
        { 
            "id": event.id,
            "participants.id": participant.id,
            "participants.email": participant.email },
        { $push: 
            {
                "participants.$.logs": {
                    "updatedOn": now.toISOString(),
                    "sendemail": participant.sendemail
                }
            }
        },
        // { upsert: true }
    ).then(result => {
        if(result.matchedCount === 1) {
            console.log('participant log created')
        } else {
            console.log(result.matchedCount)
            console.log('participant log NOT created')
        }
    }).catch(error => console.error(error))
    

}

function logParticipantStatus(eventid, participantid, email, status, successful, message) {

    let now = new Date()

    collection.updateOne(
        {
            "id": eventid,
            "participants.id": participantid,
            "participants.email": email },
        { $push: 
            {
                "participants.$.logs": {
                    "updatedOn": now.toISOString(),
                    "status": status,
                    "successful": successful,
                    "message": message,
                }
            }
        },
        // { upsert: true }
    ).catch(error => console.error(error))
}

function findEvent(id, callback) {

    collection.findOne({ id })
    .then(targetEvent => {
        if(targetEvent === null) return callback()
        callback(targetEvent)
    })
    .catch((_) => {
        callback()
    })
}

module.exports = {
    setDBConn,
    eventSaved,
    logParticipantStatus,
}