const jwt = require('jsonwebtoken')

function authenticateToken(req, res, next) {

    const authMatrix = [
        {
            route: '/api/dashboard',
            users: ['web-user']
        },
        {
            route: '/api/results',
            users: ['secret-amigos']
        },
        {
            route: '/api/events',
            users: ['secret-amigos']
        }
    ]

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]

    if(token === null) return res.sendStatus(401)

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if(err) return res.sendStatus(403);

        console.log(user.name)
        const auth = authMatrix.find(perm => perm.route === req.originalUrl.substring(0, perm.route.length))

        if(auth) {
            if(auth.users.includes(user.name)) return next()
            else return res.sendStatus(403)
        }
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