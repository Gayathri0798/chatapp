const mysql = require('mysql2');
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Rithanya@14',
  database: 'video_call_app'
});
connection.connect();
module.exports = connection;
