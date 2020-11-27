const path = require('path');
const Handlebars = require('handlebars');
const fs = require('fs');
const { sendMail } = require('../../utils/mailer');
// const { 
//     unsubsParticipant,
//     saveEvent,
//     mailSent
// } = require('../../utils/dbmanager');
const { 
    // unsubsParticipant,
    saveEvent,
    mailSent
} = require('../../utils/db');

function addEvent(event, callback) {

    //TODO THE FOLLOWING VALIDATION WILL NEED TO BE REMOVED ONCE JWT IS IMPLEMENTED
    if(event.participants.length < 3 || event.participants.length > 20)
        return callback('Unable to send < 3 or > 20 participants. Please review and retry.');

    saveEvent(event, (err, objectId) => {

        if(err) return callback(err);

        event.participants.forEach(participant => sendParticipantMail(event, participant));
        callback();
    });

};

function sendParticipantMail(event, participant) {

    createMailBody(event, participant, (html) => {
        sendMail({
            to: `${participant.name} ${participant.surname} <${participant.email}>`,
            subject: event.eventname,
            html,
            text: `Secret Amigos dice hola ${participant.name}`
        }, error => mailSent(event.eventid, participant.id, !error ))
    
    });
};

function unsubscribeParticipant(eventid, participantid, callback) {
    unsubsParticipant(eventid, participantid, (err) => {
        callback(err ?? undefined);
    });
};

function confirmParticipant() {};

function viewEventConfirmations() {};

function viewParticipantStatus() {};

function createMailBody({
    language, 
    amount, 
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
            "toid": id,
            "toname": name,
            "tosurname": surname,
            "toemail": email,
            "friendname": friendname,
            "friendsurname": friendsurname,
            "amountMinMax": amountMinMax,
            "custommessage": custommessage,
            "eventlocation": eventlocation,
        }
        return callback(template(data));
    })
}

module.exports = {
    addEvent,
    unsubscribeParticipant,
    confirmParticipant,
    viewEventConfirmations,
    viewParticipantStatus,
}
