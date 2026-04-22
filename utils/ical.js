const icalGenerator = require('ical-generator');
const ical = icalGenerator.default || icalGenerator;

function getIcalObjectInstance(
    starttime, 
    summary, 
    description, 
    location, 
    ) {

    const normalizedStart = new Date(starttime)
    if (Number.isNaN(normalizedStart.getTime())) {
        throw new Error('Invalid event start time')
    }

    let endtime = new Date(normalizedStart)
    endtime.setMinutes(endtime.getMinutes() + 90)
    // console.log(endtime.toDateString())

    const cal = ical({ domain: process.env.DOMAIN_NAME, name: 'Secret Amigo Event' });

    cal.createEvent({
        start: normalizedStart,   // normalized Date for consistent timezone handling
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