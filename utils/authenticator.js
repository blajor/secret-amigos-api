const jwt = require('jsonwebtoken')

function authenticateToken(req, res, next) {

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]

    if(token === null) return res.sendStatus(401)

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if(err) return res.sendStatus(403);

        if(user.name === 'secret-amigos') return next()
        else return res.sendStatus(403)
    })
}

function getQueryData(token, callback) {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, queryObject) => {
        if(err) return callback(err)

        return callback(undefined, queryObject)
    })
}

function generateToken(eventid, participantid, email) {

    const queryObject = {
        eventid,
        participantid,
        email
    }

    return jwt.sign(queryObject, process.env.ACCESS_TOKEN_SECRET)
}

module.exports = {
    authenticateToken,
    getQueryData,
    generateToken
}