const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;

const oauth2Client = new OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, 'https://developers.google.com/oauthplayground');

oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const accessToken = oauth2Client.getAccessToken();

const smtpTransport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type: 'OAuth2',
        user: process.env.MAIL_USER,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
        accessToken,
        // tls: {
        //     rejectUnauthorized: false
        // }
    }
});

/*
const sendResults = ({
    eventname, 
    toname,
    tosurname,
    toemail,
    sendcalendar=false,
    mailbody
}, callback) => {

    const mailOptions = {
        from: 'Secret Amigos <secret.amigos.app@gmail.com>',
        to: `${toname} ${tosurname} <${toemail}>`,
        // bcc: 'jrblanco@gmail.com',
        subject: eventname,
        generateTextFromHTML: true,
        html: mailbody,
        text: `Secret Amigos. Hola ${toname}!`
    };

    smtpTransport.sendMail(mailOptions, (error, response) => {
        error? callback(error, undefined): callback(undefined, response);
            smtpTransport.close();
            // return resp;
        // } else {
            // resp = response;
            // console.log(resp);
            // smtpTransport.close();
            // return response;
            // callback(undefined, response);
        // }
    })

}*/

function sendMail({
    to,
    subject,
    html,
    text,
    attachments
}, callback) {

    const mailOptions = {
        from: 'Secret Amigos <secret.amigos.app@gmail.com>',
        to,
        subject,
        generateTextFromHTML: true,
        html,
        text,
        attachments
    };

    smtpTransport.sendMail(mailOptions, (error, response) => {
        if(error) callback(true);
        else callback( !(response.accepted.length === 1) );
        
        smtpTransport.close();
    })
}

module.exports = {
    // sendResults,
    sendMail
}
