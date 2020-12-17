// const request = require('postman-request')

// const ipdata = (ip, callback) => {

//     const url = 'http://api.ipstack.com/' + ip + '?access_key=' + process.env.IPSTACK_KEY

//     request({url, json:true}, (error, _, response) => {

//         if(error) {
//             console.error('Error',error)
//             callback()
//         }
//         console.log(response)
//         callback()
//     })
// }

// module.exports = ipdata

const ipstack = require('ipstack')

const ipdata = (ip, callback) => {

    console.log('request')
    ipstack(ip,process.env.IPSTACK_KEY,(err, response) => {
        callback(err, response)
    })
}

module.exports = ipdata
