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
        saveEvent(event)
        event.participants.forEach(participant => sendParticipantMail(event, participant))
        callback()
    }
    else {
        event.participants.forEach(participant => {
            if(participant.sendemail) {
                saveEvent(event)
                sendParticipantMail(event, participant)
            }
            else
                saveEvent(event)
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
    let amountTxt, datetime = '';

    switch(event.language) {
        case 'es':
            htmlSource = htmlSource + 'esp.html';
            textSource = textSource + 'esp.txt';
            let precioTxt = 'El precio sugerido del regalo es ';
            if(event.amount.min !== '' && event.amount.max === '') {
                amountTxt = precioTxt + 'mínimo de ' + event.amount.min
            }
            if(event.amount.min === '' && event.amount.max !== '') {
                amountTxt = precioTxt + 'máximo de ' + event.amount.max
            }
            if(event.amount.min !== '' && event.amount.max !== '') {
                amountTxt = precioTxt + 'entre ' + event.amount.min + ' y ' + event.amount.max
            }
            if(event.datetime !== '')
                datetime = 'el ' + event.datetime
            break;
        case 'en':
            htmlSource = htmlSource + 'eng.html';
            textSource = textSource + 'eng.txt';
            let priceTxt = 'The suggested gift price is ';
            if(event.amount.min !== '' && event.amount.max === '') {
                amountTxt = priceTxt + 'minimum ' + event.amount.min
            }
            if(event.amount.min === '' && event.amount.max !== '') {
                amountTxt = priceTxt + 'maximum ' + event.amount.max
            }
            if(event.amount.min !== '' && event.amount.max !== '') {
                amountTxt = priceTxt + 'between ' + event.amount.min + ' and ' + event.amount.max
            }
            if(event.datetime !== '')
                datetime = 'on ' + event.datetime
            break;
        default:
            htmlSource = htmlSource + 'esp.html';
            textSource = textSource + 'esp.txt';
    }

    let friend = event.participants.find(part => part.id == participant.friendid)

    mergeDocument(htmlSource, event, participant, friend, amountTxt, datetime, (htmlData) => {
        mergeDocument(textSource, event, participant, friend, amountTxt, datetime, (textData) => {
            return callback(htmlData, textData)
        })
    })
}

function mergeDocument(source, event, participant, friend, amountTxt, datetime, callback) {

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
            "amountTxt": amountTxt,
            "custommessage": event.custommessage,
            "location": event.location,
            "serverurl": process.env.SERVER_URL,
            "confVisible": participant.confirmed ? 'none' : 'initial', //TODO REFINE THIS LOGIC
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
