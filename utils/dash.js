const path = require('path');
const Handlebars = require('handlebars');
const fs = require('fs');
const { findAll } = require('./dbmanager');

function generateDashData(callback) {

    findAll((error, list) => {

        let events = list.length
        let eventsEs = 0 
        let eventsEn = 0
        let participants = 0
        let accepted = 0
        let confirmed = 0
        let unsubscribed = 0
        let rejected = 0
        let pending = 0

        list.forEach(ev => {

            if(ev.logs) {
                fetchIPData(ev.logs[0].IP)
            }

            if(ev.language === 'en') {
                eventsEn++
            } 
            if(ev.language === 'es') eventsEs++
            participants += ev.participants.length
            ev.participants.forEach(part => {
                switch(part.status) {
                    case 'accepted': accepted++
                    break;
                    case 'rejected': rejected++
                    break;
                    case 'pending': pending++
                    break;
                    case 'confirmed': confirmed++
                    break;
                    case 'unsubscribed': unsubscribed++
                    break;
                }
            })
        })

        callback({
            events,
            eventsEs,
            eventsEn,
            participants,
            accepted,
            confirmed,
            unsubscribed,
            rejected,
            pending,
        })
    
    })

}

function generateDashPage(callback) {
    generateDashData(data => {
        const source = '../templates/views/dashboard.html'
        mergeDash(source, data, response => {
            callback(response)
        })
    })
}

function mergeDash(source, results, callback) {

    file = fs.readFile(path.join(__dirname, source), (err, data) => {
        if(err) {
            console.error(err)
            return
        }

        var template = Handlebars.compile(data.toString())

        var data = {
            "events": results.events,
            "eventsEs": results.eventsEs,
            "eventsEn": results.eventsEn,
            "participants": results.participants,
            "accepted": results.accepted,
            "confirmed": results.confirmed,
            "unsubscribed": results.unsubscribed,
            "rejected": results.rejected,
            "pending": results.pending,
        }
        return callback(template(data))
    })
}

function fetchIPData(ip) {

}

module.exports = {
    generateDashPage,
    generateDashData,
}