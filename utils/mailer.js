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
