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
        user: 'secret.amigos.app@gmail.com',
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
        accessToken,
        // tls: {
        //     rejectUnauthorized: false
        // }
    }
});

const sendResults = ({eventname, eventdatetime, amount, language, 
    toname, tosurname, toemail, friendname, friendsurname, sendcalendar=false, }) => {

    const mailOptions = {
        from: 'Secret Amigos <secret.amigos.app@gmail.com>',
        to: `${toname} ${tosurname} <${toemail}>`,
        // bcc: 'jrblanco@gmail.com',
        subject: eventname,
        generateTextFromHTML: true,
        html: `<b>Secret Amigos</b><p>Hola ${toname}! <br>Tu amigo secreto es: ${friendname} ${friendsurname}</p><p>Cheers!</p>`,
        text: `Secret Amigos. Hola ${toname}!`
    };
    
    smtpTransport.sendMail(mailOptions, (error, response) => {
        if(error) {
            smtpTransport.close();
            return error;
        }
        return response;
    })
}

module.exports = {
    sendResults
}
