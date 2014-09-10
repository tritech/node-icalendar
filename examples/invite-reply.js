// 
// Read an .ics file given on the command line, generate a reply, and email it
// using nodemailer.
//

var fs = require('fs');

var icalendar = require('../lib');


var invite = icalendar.parse_calendar(
    fs.readFileSync(process.argv[2], {encoding: 'utf-8'}));
var vevent = invite.events()[0];


// Find the first attendee that has not responded...
var attendee = 'mailto:james@example.com';

var resp = vevent.reply(attendee, true);
console.log(resp.toString());


var reply_to = vevent.getPropertyValue('ORGANIZER').split(':')[1];
console.log('sending to', reply_to);

var nm = require('nodemailer');

var server = nm.createTransport();

server.sendMail({
    from: 'james@example.com',
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
