var ip = require('ip');
const myip = ip.address();

module.exports = {
    // HOST: '192.168.29.36',
    HOST: myip,
    USER: 'root',
    PASSWORD: '',
    DB: 'mt4',
    dialect: 'mysql',

    // pool: {
    //     max: 5,
    //     min: 0,
    //     acquire: 30000,
    //     idle: 10000
    // }
}