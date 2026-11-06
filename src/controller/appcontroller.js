const path = require('path');
const Handlebars = require('handlebars');
const fs = require('fs');
const { sendMail } = require('../../utils/mailer');
const { formatEventDetails, normalizeEventLanguage, resolveLanguage } = require('../../utils/localization');
const { getIcalObjectInstance } = require('../../utils/ical');
const { generateToken } = require('../../utils/authenticator')
const {
    generateDashPage,
    generateDashData,
    prepareDashData,
} = require ('../../utils/dash')
const { 
    saveEvent,
    unsubsParticipant,
    mailSent,
    logViewStatus,
    setDBConnection,
    findEvent,
    deleteEventSoft,
    confParticipant,
} = require('../../utils/dbmanager');

function setDB() {
    setDBConnection();
}

function eventGateway(event, ip, callback) {

    if(typeof event.participants === 'undefined' || event.participants.length < 3)
        return callback('Unable to send < 3 participants. Please review and retry.');

    event = normalizeEventLanguage(event);
    saveEvent(event, ip)

    if(event.sendemails) {
        // saveEvent(event)
        event.participants.forEach(participant => sendParticipantMail(event, participant))
        callback()
    }
    else {
        event.participants.forEach(participant => {
            if(participant.sendemail) {
                // saveEvent(event)
                sendParticipantMail(event, participant)
            }
            // else
            //     saveEvent(event)
        })
        callback()
    }
};

function sendParticipantMail(event, participant) {

    var mailOptions = {
        to: `${participant.name} ${participant.surname} <${participant.email}>`,
        subject: event.name,
        attachments: []
    }

    if(typeof event.datetime === 'string' && event.datetime.trim() !== '') {
        try {
            const calendar = getIcalObjectInstance(event.datetime, event.name, event.custommessage, event.location)
            if(!calendar) {
                console.error(`Unable to generate calendar attachment: invalid event datetime (eventId=${event.id}, participantId=${participant.id})`)
            } else {
            const calendarObj = {
                filename: 'event.ics',
                content: Buffer.from(calendar.toString()),
                contentType: 'text/calendar'
            }
            mailOptions.attachments.push(calendarObj)
            }
        } catch (error) {
            console.error(`Unable to generate calendar attachment (eventId=${event.id}, participantId=${participant.id}):`, error)
        }
    }

    createMailBody(event, participant, (html, text) => {
        mailOptions.html = html
        mailOptions.text = text
        sendMail(mailOptions, error => {
            mailSent(event.id, participant.id, participant.email, error)
        })
    })
};

function confirmParticipant(queryObject, language, ip, callback) {
    language = resolveLanguage(language);
    confParticipant(queryObject, ip, (err, event) => {
        if(err) return callback(err);

        const source = `../../templates/views/conf_${language}.html`
        const participant = event.participants.find(part => part.id === queryObject.participantid)

        mergeDocument(source, event, participant, language, response => {
            callback(undefined, response);
        })
    });
};

function unsubscribeParticipant(queryObject, language, ip, callback) {
    language = resolveLanguage(language);
    unsubsParticipant(queryObject, ip, (err, event) => {
        if(err)
            return callback(err);

        const source = `../../templates/views/unsub_${language}.html`
        const participant = event.participants.find(part => part.id === queryObject.participantid)

        mergeDocument(source, event, participant, language, response => {
            callback(undefined, response);
        })
    });
};

function viewParticipantStatus(eventid, ip, callback) {

    findEvent(eventid, (error, targetEvent) => {
        if(error) return callback(error);

        let mailaccepted = [];
        let mailrejected = [];
        let mailpending = [];
        let invitationconfirmed = [];
        let participantunsubscribed = [];

        targetEvent.participants.forEach(part => {
            switch(part.status) {
                case 'pending': mailpending.push(part.id)
                    break;
                case 'accepted': mailaccepted.push(part.id)
                    break;
                case 'rejected': mailrejected.push(part.id)
                    break;
                case 'confirmed': invitationconfirmed.push(part.id)
                    break;
                case 'unsubscribed': participantunsubscribed.push(part.id)
                    break;
            }
        })

        let result = {
            mailaccepted,
            mailrejected,
            mailpending,
            invitationconfirmed,
            participantunsubscribed
        }

        logViewStatus(eventid, ip, result)
        callback(undefined, result);
    })
};

function createMailBody(event, participant, callback) {
    const language = resolveLanguage(event.language);
    let htmlSource = `../../templates/views/mail_${language}.html`;
    let textSource = `../../templates/views/text_${language}.txt`;

    // let amountTxt, datetime = '';
    // let options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

    // switch(event.language) {
    //     case 'es':
    //         htmlSource = htmlSource + 'esp.html';
    //         textSource = textSource + 'esp.txt';
    //         let precioTxt = 'El precio sugerido del regalo es ';
    //         if(event.amount.min !== '' && event.amount.max === '') {
    //             amountTxt = precioTxt + 'mínimo de ' + event.amount.min
    //         }
    //         if(event.amount.min === '' && event.amount.max !== '') {
    //             amountTxt = precioTxt + 'máximo de ' + event.amount.max
    //         }
    //         if(event.amount.min !== '' && event.amount.max !== '') {
    //             amountTxt = precioTxt + 'entre ' + event.amount.min + ' y ' + event.amount.max
    //         }
    //         if(event.datetime !== '')
    //         var date = new Date(event.datetime)
    //         datetime = 'el ' + date.toLocaleDateString("es-MX", options)
    //     break;
    //     case 'en':
    //         htmlSource = htmlSource + 'eng.html';
    //         textSource = textSource + 'eng.txt';
    //         let priceTxt = 'The suggested gift price is ';
    //         if(event.amount.min !== '' && event.amount.max === '') {
    //             amountTxt = priceTxt + 'minimum ' + event.amount.min
    //         }
    //         if(event.amount.min === '' && event.amount.max !== '') {
    //             amountTxt = priceTxt + 'maximum ' + event.amount.max
    //         }
    //         if(event.amount.min !== '' && event.amount.max !== '') {
    //             amountTxt = priceTxt + 'between ' + event.amount.min + ' and ' + event.amount.max
    //         }
    //         if(event.datetime !== '')
    //             var date = new Date(event.datetime)
    //             datetime = 'on ' + date.toLocaleDateString("en-US", options)
    //         break;
    //     default:
    //         htmlSource = htmlSource + 'esp.html';
    //         textSource = textSource + 'esp.txt';
    // }

    mergeDocument(htmlSource, event, participant, language, (htmlData) => {
        mergeDocument(textSource, event, participant, language, (textData) => {
            return callback(htmlData, textData)
        })
    })
}

function mergeDocument(source, event, participant, language, callback) {

    language = resolveLanguage(language);
    const eventDetails = formatEventDetails(event, language);

    const friend = event.participants.find(part => part.id == participant.friendid) ?? { name: '', surname: '' }
    const token = generateToken(event.id, participant.id, participant.email)

    fs.readFile(path.join(__dirname, source), (err, data) => {
        if(err) {
            console.error(err)
            return
        }

        var template = Handlebars.compile(data.toString())

        var data = {
            "eventname": event.name,
            "datetime": eventDetails.datetime,
            "eventid": event.id,
            "toid": participant.id,
            "toname": participant.name,
            "tosurname": participant.surname,
            "toemail": participant.email,
            "friendname": friend.name,
            "friendsurname": friend.surname,
            "amountTxt": eventDetails.amountTxt,
            "custommessage": event.custommessage,
            "location": eventDetails.location,
            "serverurl": process.env.SERVER_URL,
            "token": token,
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

function getDashPage(callback) {
    generateDashPage(response => callback(response))
}

function getDashData(callback) {
    generateDashData(response => callback(response))
}

function prepareDash(callback) {
    prepareDashData(response => callback(response))
}

module.exports = {
    eventGateway,
    unsubscribeParticipant,
    confirmParticipant,
    viewParticipantStatus,
    deleteEvent,
    setDB,
    getDashPage,
    getDashData,
    prepareDash,
}
