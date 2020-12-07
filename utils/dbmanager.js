const MongoClient = require('mongodb').MongoClient;

let db;

function setDBConnection() {
    MongoClient.connect(process.env.DB_URI, { 
    useNewUrlParser:true,
    useUnifiedTopology: true,
    poolSize: 10
    }).then(client => {
        db = client.db(process.env.DB_NAME);
        console.log(`DB connection up and running: '${process.env.DB_NAME}'`)
    }).catch(error => console.log(error));
}

// function prepareEvent(event) {

    // console.log('--------------------------------')
    // console.log(event.participants)

    // targetParticipants.forEach(target => {
    //     event.participants.find(part => {
    //         if(part.id === target.id) {
    //             part.confirmed = undefined
    //             part.unsubscribed = undefined
    //             part.emailSent = undefined
    //         }
    //     })
    // });

    // console.log('--------------------------------')
    // console.log(event.participants)

    // event.participants.forEach(part => {
    //     if(!part.confirmed) part.confirmed = undefined
    //     if(!part.unsubscribed) part.unsubscribed = undefined
    //     if(!part.emailSent) part.emailSent = undefined
    // })

    // console.log('--------------------------------')
    // console.log(event.participants)

//     for(let i = 0; i < event.participants.length; i++) {
//         event.participants[i].confirmed = undefined;
//         event.participants[i].unsubscribed = undefined;
//         event.participants[i].emailSent = undefined;
//     }
//     event.active = undefined;
//     event.deleted = false;
//     return event;
// }

function prepareEvent(newEvent, callback) {
    
    findEvent(newEvent.id, (error, oldEvent) => {
        if(error) {

            newEvent.participants.forEach(part => {
                part.confirmed = undefined
                part.unsubscribed = undefined
                part.emailSent = undefined
            })
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
                    part.confirmed = undefined
                    part.unsubscribed = undefined
                    part.emailSent = undefined
                    // oldEvent.participants.push(part)
                } else {
                    part.confirmed = oPart.confirmed
                    part.unsubscribed = oPart.unsubscribed
                    part.emailSent = oPart.emailSent
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

        collection.updateOne({id: preparedEvent.id}, { $set: preparedEvent }, {upsert: true})
        .then((updatedEvent) => {
        })
        .catch((error) => {
            console.error(error) //TODO CONSOLE LOG OK
        });
    
    })

    return
}

function unsubsParticipant(eventid, participantid, callback) {

    const collection = db.collection('events');

    collection.updateOne({
        "id": eventid,
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
        "id": eventid,
        "participants.id": participantid,
        deleted: false
    },
    {
        $set: { "participants.$.confirmed": true }
    }).then((result) => {
        if(result.matchedCount === 1) {
            findEvent(eventid, (err, event) => {
                return callback(undefined, event);
            })
        } else {
            callback('Participant does not belong to this event.');
        }
    }).catch((error) => {
        callback(error);
    });
}

function mailSent(eventid, participantid, error) {

    const collection = db.collection('events');

    collection.updateOne({
        "id": eventid,
        "participants.id": participantid,
        deleted: false
    },
    {
        $set: { 
            "participants.$.emailSent": error === false,
            "participants.$.emailerror": error
         }
    }).then((result) => {
        if(result.matchedCount === 1) return false;
        return true;
    }).catch((_) => {
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
