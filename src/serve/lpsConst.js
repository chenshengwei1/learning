


const path = require('path');
const fileURLToPath = require('url');


let LOCAL_IP = '43.142.164.166';
let LOCAL_PORT = 3002;
let LOCAL_HTTPS_PORT = 3011;
//let BASE_SERVER_PATH = '/root/ursa/virco/';
let BASE_SERVER_PATH = __dirname;
let ENABLE_HTTP = true;
let ENABLE_HTTPS = false;


module.exports = {LOCAL_IP, LOCAL_PORT, BASE_SERVER_PATH, LOCAL_HTTPS_PORT, ENABLE_HTTP, ENABLE_HTTPS}