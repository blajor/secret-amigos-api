
class EventLog {

     id
     updatedOn
     countParticipants
     countSendAll
     countSendOne
     
}

class ParticipantLog {

    id
    eventid
    countMails
    countChangedMail

}

class MailLog {
    mail
    participantid
    eventId
    countMailAccept
    countMailRejected
    countConfirmed
    countUnsubscribed
}