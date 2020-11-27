const { MongoClient, ObjectID } = require('mongodb');

const client = new MongoClient(process.env.DB_URI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true
});

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

    client.connect(err => {
        if(err) return callback(err);
        
        const collection = client.db(process.env.DB_NAME).collection("events");
        
        const preparedEvent = prepareEvent(event);
        preparedEvent.active = true;

        collection.updateOne({eventid: preparedEvent.eventid}, { $set: preparedEvent }, {upsert: true})
        .then((updatedEvent) => {
            callback(undefined, updatedEvent._id)
        })
        .catch((error) => {
            callback(error, undefined)
        });
    });
}

function unsubsParticipant(eventid, participantid, callback) {

    client.connect(err => {
        if(err) return callback(err);

        const collection = client.db(process.env.DB_NAME).collection("events");

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
    })
}

function mailSent(eventid, participantid, accepted) {

    console.log('*** sending email...'); //TODO ERASE
    client.connect(err => {
        if(err) {
            console.log('*** ERROR UP ***'); //TODO ERASE
            console.log(err);
            console.log('*** END ***');
            client.close();
            return false;
        }

        const collection = client.db(process.env.DB_NAME).collection("events");

        collection.updateOne({
            eventid,
            "participants.id": participantid
        },
        {
            $set: { "participants.$.emailSent": accepted }
        }).then((updated) => {
            // console.log('*** UPDATED DATA ***'); //TODO ERASE
            // console.log(updated);
            // console.log('*** END UPDATED DATA ***');
            client.close();
            return false;
        }).catch((error) => {
            // console.log('*** ERROR DOWN ***'); //TODO ERASE
            // console.log(error);
            // console.log('*** END ***');
            client.close();
            return true;
        });
    })
    client.close();
}

module.exports = {
    saveEvent,
    unsubsParticipant,
    mailSent
}
