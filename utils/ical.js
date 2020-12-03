const ical = require('ical-generator');

function getIcalObjectInstance(
    starttime, 
    summary, 
    description, 
    location, 
    ) {

    let endtime = new Date(starttime)
    endtime.setMinutes(endtime.getMinutes() + process.env.CALENDAR_EVENT_DURATION)
    // console.log(endtime.toDateString())

    const cal = ical({ domain: process.env.DOMAIN_NAME, name: 'Secret Amigo Event' });
    
    cal.domain(process.env.DOMAIN_NAME);
    cal.createEvent({
        start: starttime,         // eg : moment()
        end: endtime,             // eg : moment(1,'days')
        summary: summary,         // 'Summary of your event'
        description: description, // 'More description'
        location: location,       // 'Delhi'
        url: '',                 // 'event url'
        organizer: {              // 'organizer details'
            name: 'Secret Amigo',
            email: process.env.MAIL_USER
        },
    });
    return cal;
}

module.exports= {
    getIcalObjectInstance,
}