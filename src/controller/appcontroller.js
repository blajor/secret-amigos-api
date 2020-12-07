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

function setDB() {
    setDBConnection();
}

function eventGateway(event, callback) {

    if(typeof event.participants === 'undefined' || event.participants.length < 3)
        return callback('Unable to send < 3 participants. Please review and retry.');

    if(event.sendemails) {
        saveEvent(event, event.participants)
        event.participants.forEach(participant => sendParticipantMail(event, participant))
        callback()
    }
    else {
        event.participants.forEach(participant => {
            if(participant.sendemail) {
                saveEvent(event, [participant])
                sendParticipantMail(event, participant)
            }
            else
                saveEvent(event, [])
        })
        callback()
    }
};

function sendParticipantMail(event, participant) {

    var mailOptions = {
        to: `${participant.name} ${participant.surname} <${participant.email}>`,
        subject: event.name,
        // text: `Secret Amigo dice hola ${participant.name}`,
        attachments: []
    }

    if(event.datetime !== '') {
        const calendarObj = {
            filename: 'event.ics',
            content: Buffer.from(getIcalObjectInstance(event.datetime, event.name, event.custommessage, event.location).toString()),
            contentType: 'text/calendar'
        }
        mailOptions.attachments.push(calendarObj)
    }

    createMailBody(event, participant, (html, text) => {
        mailOptions.html = html
        mailOptions.text = text

        sendMail(mailOptions, error => {
            mailSent(event.id, participant.id, error)
        })
    })
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

function createMailBody(event, participant, callback) {

    let htmlSource = '../../templates/views/';
    let textSource = '../../templates/views/';
    let amountMinMax, datetime = '';

    switch(event.language) {
        case 'es':
            htmlSource = htmlSource + 'esp.html';
            textSource = textSource + 'esp.txt';
            if(event.amount.min !== '' || event.amount.max !== '') {
                amountMinMax = 'Monto sugerido '
                if(event.amount.min !== '' && event.amount.max !== '')
                    amountMinMax += 'entre ' + event.amount.min + ' y ' + event.amount.max
                else {
                    amountMinMax += event.amount.min
                    amountMinMax += event.amount.max
                }
            }
            if(event.datetime !== '')
                datetime = 'Fecha y hora: ' + event.datetime
            break;
        case 'en':
            htmlSource = htmlSource + 'eng.html';
            textSource = textSource + 'eng.txt';
            if(event.amount.min !== '' || event.amount.max !== '') {
                amountMinMax = 'Suggested amount '
                if(event.amount.min !== '' && event.amount.max !== '')
                    amountMinMax += 'between ' + event.amount.min + ' and ' + event.amount.max
                else {
                    amountMinMax += event.amount.min
                    amountMinMax += event.amount.max
                }
            }
            if(event.datetime !== '')
                datetime = 'Date time: ' + event.datetime
            break;
        default:
            htmlSource = htmlSource + 'esp.html';
            textSource = textSource + 'esp.txt';
    }

    let friend = event.participants.find(part => part.id == participant.friendid)

    mergeDocument(htmlSource, event, participant, friend, amountMinMax, datetime, (htmlData) => {
        mergeDocument(textSource, event, participant, friend, amountMinMax, datetime, (textData) => {
            return callback(htmlData, textData)
        })
    })
}

function mergeDocument(source, event, participant, friend, amountMinMax, datetime, callback) {

    file = fs.readFile(path.join(__dirname, source), (err, data) => {
        if(err) {
            console.error(err)
            return
        }

        var template = Handlebars.compile(data.toString())

        var data = {
            "eventname": event.name,
            "datetime": datetime,
            "eventid": event.id,
            "toid": participant.id,
            "toname": participant.name,
            "tosurname": participant.surname,
            "toemail": participant.email,
            "friendname": friend.name,
            "friendsurname": friend.surname,
            "amountMinMax": amountMinMax,
            "custommessage": event.custommessage,
            "location": event.location,
            "serverurl": process.env.SERVER_URL,
            "confVisible": participant.confirmed ? 'none' : 'initial', //TODO REFINE THIS LOGIC
            "appstorelink": process.env.APP_STORE_LINK,
        }
        return callback(template(data))
    })
}

function deleteEvent(id, callback) {

    deleteEventSoft(id, (err) => {
        if(err) return callback(err);
        callback();
    });
}

module.exports = {
    eventGateway,
    unsubscribeParticipant,
    confirmParticipant,
    viewParticipantStatus,
    deleteEvent,
    setDB,
}
