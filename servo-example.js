var intel = require("galileo-io");
var five = require("johnny-five");
var meshblu = require("meshblu");
var meshbluJSON = require("./meshblu.json");
var fs = require("fs");

// Specifies how you want your message payload to be passed
// from Octoblu to your device
var MESSAGE_SCHEMA = {
  type: 'object',
  properties: {
    servo: {
      type: 'string',
      enum: ['3', '5'],
      required: true
    },
    value: {
      type: 'number',
      required: true
    }
  }
};

var conn = meshblu.createConnection({
  "uuid": meshbluJSON.uuid,
  "token": meshbluJSON.token,
  "server": "meshblu.octoblu.com", // optional - defaults to ws://meshblu.octoblu.com
  "port": 80  // optional - defaults to 80
});

conn.on('notReady', function(data) {
  console.log('UUID FAILED AUTHENTICATION!');
  console.log('not ready', data);

  // Register your device on Meshblu
  conn.register({
    "type": "intel-servo"
  }, function (data) {
    console.log('registered device', data);
    meshbluJSON.uuid = data.uuid;
    meshbluJSON.token = data.token;
    fs.writeFile('meshblu.json', JSON.stringify(meshbluJSON), function(err) {
      if(err) return;
    });

  // Login to Meshblu to fire onready event
  conn.authenticate({
    "uuid": data.uuid,
    "token": data.token
    }, function (data) {
      console.log('authenticating', data);
    });
  });
});

// Wait for connection to be ready to send/receive messages
// from/to Meshblu
conn.on('ready', function(data) {
  console.log('ready event', data);

  conn.update({
    "uuid": meshbluJSON.uuid,
    "token": meshbluJSON.token,
    "messageSchema": MESSAGE_SCHEMA
  });


  var board = new five.Board({
    io: new intel()
  });

// Wait for the board to be ready for message passing
// board-specific code
  board.on('ready', function() {
    
    var servo = new five.Servo(3);
    var servo2 = new five.Servo(5);

    // Handles incoming Octoblu messages
    conn.on('message', function(data) {
     console.log('message received');
     console.log(data);

     // Let's extract the payload
     var payload = data.payload;

    /* Manipulate the servos based on the message passed
       from an Octoblu/Meshblu generic device node
       example:
      {
        "servo": "3",
        "value": 180
      }
    */
     if(payload.servo == "3"){
       servo.to(payload.value);
     } else if(payload.servo == "5") {
       servo2.to(payload.value);
     }
   }); // end Meshblu connection onMessage
 }); // end johnny-five board onReady
}); // end Meshblu connection onReady
