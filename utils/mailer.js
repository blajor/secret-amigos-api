const nodemailer = require('nodemailer');
// const { google } = require('googleapis');
// const OAuth2 = google.auth.OAuth2;

// const oauth2Client = new OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, 'https://developers.google.com/oauthplayground');

// oauth2Client.setCredentials({
//     refresh_token: process.env.GOOGLE_REFRESH_TOKEN
// });

// const accessToken = oauth2Client.getAccessToken();

// const smtpTransport = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         type: 'OAuth2',
//         user: process.env.MAIL_USER,
//         clientId: process.env.GOOGLE_CLIENT_ID,
//         clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//         refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
//         accessToken,
//         // tls: {
//         //     rejectUnauthorized: false
//         // }
//     }
// });

const smtpTransport = nodemailer.createTransport({
    // pool: true,
    host: 'mail.privateemail.com',
    port: 465,
    // secure: process.env.MAIL_SECURE,
    secure: true,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    },
    tls: {
        // rejectUnauthorized: process.env.MAIL_REJECT_UNAUTH
        rejectUnauthorized: false
    }
})



function sendMail({
    to,
    subject,
    html,
    text,
    attachments
}, callback) {

    const mailOptions = {
        from: `Secret Amigo <${process.env.MAIL_USER}>`,
        to,
        subject,
        generateTextFromHTML: true,
        html,
        text,
        attachments
    };

    smtpTransport.sendMail(mailOptions, (error, response) => {
        if(error) {
            console.log(error)
            callback(error);
        } 
        else callback( !(response.accepted.length === 1) );
        
        smtpTransport.close();
    })
}

module.exports = {
    // sendResults,
    sendMail
}
