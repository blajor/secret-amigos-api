const path = require('path');
const Handlebars = require('handlebars');
const fs = require('fs');
const { sendMail } = require('../../utils/mailer');
const { 
    saveEvent,
    unsubsParticipant,
    mailSent,
    setDBConnection,
    findEvent,
    deleteEventSoft,
    confParticipant,
} = require('../../utils/dbmanager');
const { getIcalObjectInstance } = require('../../utils/ical');

function setDB(db) {
    setDBConnection(db);
}

function addEvent(event, callback) {

    //TODO THE > 20 VALIDATION WILL NEED TO BE REMOVED ONCE JWT IS IMPLEMENTED
    if(typeof event.participants === 'undefined' || event.participants.length < 3)
        return callback('Unable to send < 3 or > 20 participants. Please review and retry.');

    saveEvent(event, (err, objectId) => {

        if(err) return callback(err);

        event.participants.forEach(participant => sendParticipantMail(event, participant));
        callback();
    });

};

function sendParticipantMail(event, participant) {

    const calendarObj = getIcalObjectInstance(
        event.eventdatetime,
        event.eventname,
        event.custommessage,
        event.eventlocation,
    )

    var mailOptions = {
        to: `${participant.name} ${participant.surname} <${participant.email}>`,
        subject: event.eventname,
        text: `Secret Amigos dice hola ${participant.name}`,
        attachments: [
            {
                filename: 'event.ics',
                content: Buffer.from(calendarObj.toString()),
                contentType: 'text/calendar'
            }
        ]
    }

    createMailBody(event, participant, (html) => {
        mailOptions.html = html

        sendMail(mailOptions, error => {
            mailSent(event.eventid, participant.id, !error)
        })
    });
};

function confirmParticipant(eventid, participantid, callback) {
    confParticipant(eventid, participantid, (err) => {
        if(err) return callback(err);
        callback();
    });
};

function unsubscribeParticipant(eventid, participantid, callback) {
    unsubsParticipant(eventid, participantid, (err) => {
        if(err) return callback(err);
        callback();
    });
};

function viewParticipantStatus(eventid, callback) {
    findEvent(eventid, (error, targetEvent) => {
        if(error) return callback(error);

        let mailaccepted = [];
        let mailrejected = [];
        let invitationconfirmed = [];
        let participantunsubscribed = [];

        for(const participant of targetEvent.participants) {
            if(participant.confirmed) invitationconfirmed.push(participant.id);
            if(participant.unsubscribed) participantunsubscribed.push(participant.id);
            participant.emailSent ? mailaccepted.push(participant.id) : mailrejected.push(participant.id);
        }

        callback(undefined, {
            mailaccepted,
            mailrejected,
            invitationconfirmed,
            participantunsubscribed
        });
    })
};

function resendMessage({eventid, participantid}, callback) {

    findEvent(eventid, (error, targetEvent) => {
        if(error)
            return callback(error);

        const targetParticipant = targetEvent.participants.find(participant => participant.id === participantid);
        if(typeof targetParticipant === 'undefined') 
            return callback('Participant not in this event.');

        sendParticipantMail(targetEvent, targetParticipant);
        callback();
    })
}

function createMailBody({
    language, 
    amount, 
    eventid,
    eventname,
    eventdatetime,
    custommessage,
    eventlocation
}, {
    id,
    name,
    surname,
    email,
    friendname,
    friendsurname
}, callback) {

    let source = '../../templates/views/';
    let amountMinMax = '';

    switch(language) {
        case 'es':
            source = source + 'esp.html';
            if(amount)
                amountMinMax = 'Monto min: ' + amount.min + ' y max: ' + amount.max
            break;
        case 'en':
            source = source + 'eng.html';
            if(amount)
                amountMinMax = 'Amount min: ' + amount.min + ' and max: ' + amount.max
            break;
        default:
            source = source + 'esp.html';
    }
    file = fs.readFile(path.join(__dirname, source), (err, data) => {
        if(err) return callback(null);

        var template = Handlebars.compile(data.toString());
        var data = {
            "eventname": eventname,
            "eventdatetime": eventdatetime,
            "eventid": eventid,
            "toid": id,
            "toname": name,
            "tosurname": surname,
            "toemail": email,
            "friendname": friendname,
            "friendsurname": friendsurname,
            "amountMinMax": amountMinMax,
            "custommessage": custommessage,
            "eventlocation": eventlocation,
            "serverurl": process.env.SERVER_URL
        }
        return callback(template(data));
    })
}

function deleteEvent(eventid, callback) {

    deleteEventSoft(eventid, (err) => {
        if(err) return callback(err);
        callback();
    });
}

module.exports = {
    addEvent,
    unsubscribeParticipant,
    resendMessage,
    confirmParticipant,
    viewParticipantStatus,
    deleteEvent,
    setDB,
}
