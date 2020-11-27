var mongoUtil = require( './mongoUtil' );
var database = mongoUtil.getDb();

mongoUtil.connectToServer( function(err, client) {
    if(err) console.log("error!",err);
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

    // client.connect(err => {
        // if(err) return callback(err);
        
        // const collection = client.db(process.env.DB_NAME).collection("events");
        
        const preparedEvent = prepareEvent(event);
        preparedEvent.active = true;

        database.db().collection('events').updateOne({eventid: preparedEvent.eventid}, { $set: preparedEvent }, {upsert: true})
        .then((updatedEvent) => {
            callback(undefined, updatedEvent._id)
        })
        .catch((error) => {
            callback(error, undefined)
        });
    // });
}

function mailSent(eventid, participantid, accepted) {

    // console.log('*** sending email...'); //TODO ERASE
    // client.connect(err => {
    //     if(err) {
    //         console.log('*** ERROR UP ***'); //TODO ERASE
    //         console.log(err);
    //         console.log('*** END ***');
    //         client.close();
    //         return false;
    //     }

        // const collection = client.db(process.env.DB_NAME).collection("events");

        database.db().collection("events").updateOne({
            eventid,
            "participants.id": participantid
        },
        {
            $set: { "participants.$.emailSent": accepted }
        }).then((updated) => {
            // console.log('*** UPDATED DATA ***'); //TODO ERASE
            // console.log(updated);
            // console.log('*** END UPDATED DATA ***');
            // client.close();
            return false;
        }).catch((error) => {
            // console.log('*** ERROR DOWN ***'); //TODO ERASE
            // console.log(error);
            // console.log('*** END ***');
            // client.close();
            return true;
        });
    // })
    // client.close();
}

module.exports = {
    saveEvent,
    mailSent
}
