const path = require('path');
const Handlebars = require('handlebars');
const fs = require('fs');
const { sendMail } = require('../../utils/mailer');
const { getIcalObjectInstance } = require('../../utils/ical');
const { generateToken } = require('../../utils/authenticator')
const {
    generateDashPage,
    generateDashData,
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
            mailSent(event.id, participant.id, participant.email, error)
        })
    })
};

function confirmParticipant(queryObject, language, ip, callback) {
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

    let htmlSource = `../../templates/views/mail_${event.language}.html`;
    let textSource = `../../templates/views/text_${event.language}.txt`;

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

    mergeDocument(htmlSource, event, participant, event.language, (htmlData) => {
        mergeDocument(textSource, event, participant, event.language, (textData) => {
            return callback(htmlData, textData)
        })
    })
}

function mergeDocument(source, event, participant, language, callback) {

    let amountTxt, datetime, location = '';
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Dicimbre']

    switch(language) {
        case "es":
            let precioTxt = 'El precio sugerido del regalo es ';
            if(event.amount.min !== '' && event.amount.max === '') {
                amountTxt = precioTxt + 'mínimo de ' + event.amount.min
            } else if(event.amount.min === '' && event.amount.max !== '') {
                amountTxt = precioTxt + 'máximo de ' + event.amount.max
            } else if(event.amount.min !== '' && event.amount.max !== '') {
                amountTxt = precioTxt + 'entre ' + event.amount.min + ' y ' + event.amount.max
            }
            if(event.datetime !== '') {
                // TODO the following lines are the proper way to display dates
                var date = new Date(event.datetime)
                datetime = 'el ' + date.toLocaleDateString("es-MX", options)
                // TODO the following line fixes how the date is displayed on the email body
                datetime = 'on ' + meses[parseInt(event.datetime.substring(5,7))-1] + ' ' + event.datetime.substring(8,10) + ', ' + event.datetime.substring(0,4)
            }
            if(event.location !== '') {
                location = 'Ubicación: ' + event.location
            }
        break;
        case "en":
            let priceTxt = 'The suggested gift price is ';
            if(event.amount.min !== '' && event.amount.max === '') {
                amountTxt = priceTxt + 'minimum ' + event.amount.min
            } else if(event.amount.min === '' && event.amount.max !== '') {
                amountTxt = priceTxt + 'maximum ' + event.amount.max
            } else if(event.amount.min !== '' && event.amount.max !== '') {
                amountTxt = priceTxt + 'between ' + event.amount.min + ' and ' + event.amount.max
            }
            if(event.datetime !== '') {
                // TODO the following lines are the proper way to display dates
                // var date = new Date(event.datetime)
                // datetime = 'el ' + date.toLocaleDateString("en-US", options)
                // TODO the following line fixes how the date is displayed on the email body
                datetime = 'on ' + months[parseInt(event.datetime.substring(5,7))-1] + ' ' + event.datetime.substring(8,10) + ', ' + event.datetime.substring(0,4)
            }
            if(event.location !== '') {
                location = 'Location: ' + event.location
            }
        break;
    }

    const friend = event.participants.find(part => part.id == participant.friendid)
    const token = generateToken(event.id, participant.id, participant.email)

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
            "location": location,
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

module.exports = {
    eventGateway,
    unsubscribeParticipant,
    confirmParticipant,
    viewParticipantStatus,
    deleteEvent,
    setDB,
    getDashPage,
    getDashData,
}
