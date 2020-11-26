const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true });


function addEvent(event, callback) {

    client.connect(err => {
        if(err) return callback('Unable to connect to database');
        
        const collection = client.db(process.env.DB_NAME).collection("events");
        
        collection.insertOne(event, (error, result) => {
            if(error) return callback(error, undefined);

            // console.log(result.ops[0]._id);
            callback(undefined, result.ops[0]._id);
        });
    });
}

module.exports = {
    addEvent,
}
