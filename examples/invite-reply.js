// 
// Read an .ics file given on the command line, generate a reply, and email it
// using nodemailer.
//

var fs = require('fs');

var icalendar = require('../lib');


var invite = icalendar.parse_calendar(
    fs.readFileSync(process.argv[2], {encoding: 'utf-8'}));
var vevent = invite.events()[0];


// Email address to respond with
var attendee = process.argv[3];

var resp = vevent.reply('mailto:'+attendee, true);
console.log(resp.toString());


var reply_to = vevent.getPropertyValue('ORGANIZER').split(':')[1];
console.log('sending to', reply_to);

var nm = require('nodemailer');

var server = nm.createTransport({host: 'localhost'});

server.sendMail({
    from: attendee,
    to: reply_to,

    subject: 'Meeting accepted',
    text: 'Invitation accepted!',

    alternatives: [
        {
            content: resp.toString(),
            contentType: 'text/calendar; method=REPLY; charset=utf-8',
            }
    ]
}, function(err, msg) {
    console.log(err, msg);
});
