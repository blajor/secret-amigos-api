const { Resend } = require('resend');

function getResendClient() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        return null;
    }

    return new Resend(apiKey);
}

function normalizeAttachments(attachments = []) {
    return attachments
        .filter((attachment) => attachment && attachment.filename && attachment.content)
        .map((attachment) => {
            let content = attachment.content;

            if (Buffer.isBuffer(content)) {
                content = content.toString('base64');
            } else if (content && ArrayBuffer.isView(content)) {
                content = Buffer.from(content.buffer, content.byteOffset, content.byteLength).toString('base64');
            }

            return {
                filename: attachment.filename,
                content,
                contentType: attachment.contentType
            };
        });
}



function sendMail({
    to,
    subject,
    html,
    text,
    attachments
}, callback) {
    const resend = getResendClient();
    if (!resend) {
        callback(new Error('Missing RESEND_API_KEY'));
        return;
    }

    const fromAddress = process.env.MAIL_FROM;
    if (!fromAddress) {
        callback(new Error('Missing MAIL_FROM'));
        return;
    }
    const from = `${process.env.SERVER_NAME || 'Secret Amigo'} <${fromAddress}>`;
    const resendAttachments = normalizeAttachments(attachments);

    resend.emails.send({
        from,
        to,
        subject,
        html,
        text,
        attachments: resendAttachments
    }).then(({ data, error }) => {
        if(error) {
            console.log(error);
            callback(error);
            return;
        }

        callback(!(data && data.id));
    }).catch((error) => {
        console.log(error);
        callback(error);
    });
}

module.exports = {
    // sendResults,
    sendMail
}
