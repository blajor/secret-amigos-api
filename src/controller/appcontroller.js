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
    findParticipant,
} = require('../../utils/dbmanager');
const { getIcalObjectInstance } = require('../../utils/ical');

function setDB(db) {
    setDBConnection(db);
}

function eventGateway(event, callback) {

    if(typeof event.participants === 'undefined' || event.participants.length < 3)
        return callback('Unable to send < 3 participants. Please review and retry.');

    saveEvent(event, (err, objectId) => {

        if(err) return callback(err);

        event.participants.forEach(participant => sendParticipantMail(event, participant));
        callback();
    });

};

function sendParticipantMail(event, participant) {

    var mailOptions = {
        to: `${participant.name} ${participant.surname} <${participant.email}>`,
        subject: event.eventname,
        text: `Secret Amigos dice hola ${participant.name}`,
        attachments: []
    }

    if(event.eventdatetime !== '') {
        const calendarObj = {
            filename: 'event.ics',
            content: Buffer.from(getIcalObjectInstance(event.eventdatetime, event.eventname, event.custommessage, event.eventlocation).toString()),
            contentType: 'text/calendar'
        }
        mailOptions.attachments.push(calendarObj)
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
        let mailpending = [];
        let invitationconfirmed = [];
        let participantunsubscribed = [];

        for(const participant of targetEvent.participants) {
            if(participant.confirmed) invitationconfirmed.push(participant.id);
            if(participant.unsubscribed) participantunsubscribed.push(participant.id);
            if(participant.emailSent)
                mailaccepted.push(participant.id)
            else if (participant.emailSent === false)
                mailrejected.push(participant.id);
            else
                mailpending.push(participant.id);
        }

        callback(undefined, {
            mailaccepted,
            mailrejected,
            mailpending,
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
    friendid
    // friendname,
    // friendsurname
}, callback) {

    let source = '../../templates/views/';
    let amountMinMax = '';

    switch(language) {
        case 'es':
            source = source + 'esp.html';
            if(amount.min !== '' || amount.max !== '') {
                amountMinMax = 'Monto sugerido '
                if(amount.min !== '' && amount.max !== '')
                    amountMinMax += 'entre ' + amount.min + ' y ' + amount.max
                else {
                    amountMinMax += amount.min
                    amountMinMax += amount.max
                }
            }
            if(eventdatetime !== '')
                eventdatetime = 'Fecha y hora: ' + eventdatetime
            break;
        case 'en':
            source = source + 'eng.html';
            if(amount.min !== '' || amount.max !== '') {
                amountMinMax = 'Suggested amount '
                if(amount.min !== '' && amount.max !== '')
                    amountMinMax += 'between ' + amount.min + ' and ' + amount.max
                else {
                    amountMinMax += amount.min
                    amountMinMax += amount.max
                }
            }
            if(eventdatetime !== '')
                eventdatetime = 'Date time: ' + eventdatetime
            break;
        default:
            source = source + 'esp.html';
    }

    findParticipant(eventid, friendid, (error, friend) => {
        if(error) return callback(null)

        else {
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
                    "friendname": friend.name,
                    "friendsurname": friend.surname,
                    "amountMinMax": amountMinMax,
                    "custommessage": custommessage,
                    "eventlocation": eventlocation,
                    "serverurl": process.env.SERVER_URL
                }
                return callback(template(data));
            })
        }
    })
}

function deleteEvent(eventid, callback) {

    deleteEventSoft(eventid, (err) => {
        if(err) return callback(err);
        callback();
    });
}

module.exports = {
    eventGateway,
    unsubscribeParticipant,
    resendMessage,
    confirmParticipant,
    viewParticipantStatus,
    deleteEvent,
    setDB,
}
