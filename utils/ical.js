const ical = require('ical-generator');

function getIcalObjectInstance(
    starttime, 
    summary, 
    description, 
    location, 
    ) {

    let endtime = new Date(starttime)
    endtime.setMinutes(endtime.getMinutes() + 90)
    // console.log(endtime.toDateString())

    const cal = ical({ domain: "mytestwebsite.com", name: 'My test calendar event' });
    
    cal.domain("mytestwebsite.com");
    cal.createEvent({
        start: starttime,         // eg : moment()
        end: endtime,             // eg : moment(1,'days')
        summary: summary,         // 'Summary of your event'
        description: description, // 'More description'
        location: location,       // 'Delhi'
        url: '',                 // 'event url'
        organizer: {              // 'organizer details'
            name: 'Secret Amigos',
            email: 'secret.amigos.app@gmail.com'
        },
    });
    return cal;
}

module.exports= {
    getIcalObjectInstance,
}