const MongoClient = require('mongodb').MongoClient;
const {
    setDBConn,
    eventSaved,
    statusReview,
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

function saveEvent(event, ip) {

    const collection = db.collection('events');

    prepareEvent(event, preparedEvent => {
        preparedEvent.active = true;

        collection.updateOne(
            { id: preparedEvent.id },
            { $set: preparedEvent },
            { upsert: true })
        .then((updatedEvent) => {
            eventSaved(event, ip)
        })
        .catch((error) => {
            console.error(error) //TODO CONSOLE LOG OK
        });
    })
    return
}

function unsubsParticipant({eventid, participantid, email}, ip, callback) {
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
                logParticipantStatus(eventid, participantid, email, 'unsubscribed', true, ip)
                return callback(undefined, event)
            })
        } else {
            logParticipantStatus(eventid, participantid, email, 'unsubscribed', false, 'Participant does not belong to this event.', ip)
            callback('Participant does not belong to this event.');
        }
    }).catch((error) => {
        logParticipantStatus(eventid, participantid, email, 'unsubscribed', false, error, ip)
        callback(error);
    });
}

function confParticipant({eventid, participantid, email}, ip, callback) {
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
                logParticipantStatus(eventid, participantid, email, 'confirmed', true, '', ip)
                return callback(undefined, event);
            })
        } else {
            logParticipantStatus(eventid, participantid, email, 'confirmed', false, 'Participant does not belong to this event.', ip)
            callback('Participant does not belong to this event.');
        }
    }).catch((error) => {
        logParticipantStatus(eventid, participantid, email, 'confirmed', false, error, ip)
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

    collection.findOne({"id": id, deleted: false})
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

function findAll(callback) {
    const collection = db.collection('events');
    collection.find({}).toArray((err, result) => {
        callback(err, result)
    })
}

function logViewStatus(eventid, ip, result) {
    statusReview(eventid, ip, result)
}

function existIP(ip, callback) {

    const collection = db.collection('ipdata')

    collection.findOne({"ip": ip}, (error, data) => {
        if(error) console.error(error)

        else if (data) callback(true)
        else callback(false)
    })
    /*
    collection.find({"ip":ip}).toArray((err, result) => {
        if(err) return callback(false)
        else {
            callback(result.length > 0)
        }
    })
    */
}

function saveIPData(ipData) {

    const collection = db.collection('ipdata')
    collection.updateOne(
        { ip: ipData.ip },
        { $set: ipData },
        { upsert: true })
    .catch((error) => {
        console.error(error) //TODO CONSOLE LOG OK
    });
    return

}

function languages(collection, callback) {

    collection.aggregate([
        { $match: {} },
        { $group: { _id: '$language', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]).toArray((err, result) => {
        callback(err ? err : result)
    })
}

function totalParticipants(collection, callback) {

    collection.aggregate([
        { $match: {} },
        { $group: { _id: 'participants', count: { $sum: { $size: '$participants' } } } },
        { $sort: { count: -1 } }
    ]).toArray((err, result) => {
        callback( err ? err : result )
    })
}

function participantsStatus(collection, callback) {

    collection.aggregate([
        { $unwind: '$participants' },
        { $group: { _id: '$participants.status', count: { $sum: 1 }} },
        { $sort: { count: -1} }
    ]).toArray((err, result) => {
        callback( err ? err : result )
    })
}

function serverUsage(collection, callback) {

    collection.aggregate([
        { $unwind: '$logs'},
        { $group: { _id: '$logs.server', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]).toArray((err, result) => {
        callback(err ? err : result)
    })
}

async function dashboardData(callback) {

    // const collection = db.collection('ipdata')

    // collection.aggregate([
    //     { $match: { } },
    //     { $group: { _id: '$country_name', count: { $sum: 1 }} },
    //     { $sort: { count: -1 }}
    // ]).toArray((err, result) => {
    //     console.log(result)
    // })

    // console.log(await collection.countDocuments({country_name: "Mexico"}))

    // console.log(await collection.distinct('country_name'))

    let data = {}

    const collection = db.collection('events')

    data.events = await collection.countDocuments({})

    languages(collection, result => {
        result.forEach(r => data[r._id] = r.count )

        participantsStatus(collection, result => {
            result.forEach(r => data[r._id] = r.count )
        
            serverUsage(collection, result => {
                result.forEach(r => data[r._id] = r.count )

                totalParticipants(collection, result => {
                    result.forEach(r => data[r._id] = r.count )

                    callback({
                        events: data.events ?? 0,
                        eventsEs: data.es ? data.es : 0,
                        eventsEn: data.en ? data.en : 0,
                        participants: data.participants ? data.participants : 0,
                        pending: data.pending ? data.pending : 0,
                        accepted: data.accepted ? data.accepted : 0,
                        rejected: data.rejected ? data.rejected : 0,
                        confirmed: data.confirmed ? data.confirmed : 0,
                        unsubscribed: data.unsubscribed ? data.unsubscribed : 0,
                        raspberry: data.PI ? data.PI : 0,
                        heroku: data.HEROKU ? data.HEROKU : 0,
                        serverUnknown: data.null ? data.null : 0,
                    })
                })
            })
        })
    })
}


module.exports = {
    saveEvent,
    unsubsParticipant,
    mailSent,
    logViewStatus,
    setDBConnection,
    findEvent,
    findAll,
    confParticipant,
    deleteEventSoft,
    findParticipant,
    saveIPData,
    existIP,
    dashboardData,
}