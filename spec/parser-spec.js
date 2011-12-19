// Test search

var assert = require('assert');
var fs = require('fs');

var icalendar = require('../lib/icalendar');

describe("iCalendar.parse", function() {
    it('parses data correctly', function() {
        var cal = icalendar.iCalendar.parse(
            'BEGIN:VCALENDAR\r\n'+
            'PRODID:-//Bobs Software Emporium//NONSGML Bobs Calendar//EN\r\n'+
            'VERSION:2.0\r\n'+
            'BEGIN:VEVENT\r\n'+
            'DTSTAMP:20111202T165900\r\n'+
            'UID:testuid@someotherplace.com\r\n'+
            'DESCRIPTION:This bit of text is long and should be sp\r\n'+
            ' lit across multiple lines of output\r\n'+
            'END:VEVENT\r\n'+
            'END:VCALENDAR\r\n');

        assert.equal('-//Bobs Software Emporium//NONSGML Bobs Calendar//EN',
                    cal.getPropertyValue('PRODID'));
        assert.equal('2.0', cal.getPropertyValue('VERSION'));
        assert.equal(1, cal.components['VEVENT'].length);
        var vevent = cal.components['VEVENT'][0];
        assert.equal('This bit of text is long and should be '+
            'split across multiple lines of output',
            vevent.getPropertyValue('DESCRIPTION'));
        assert.equal(new Date(2011, 11, 2, 16, 59).valueOf(),
                vevent.getPropertyValue('DTSTAMP').valueOf());
    });

    it('parses large collections', function() {
        var cal = icalendar.iCalendar.parse(
                fs.readFileSync(__dirname+'/icalendar-test.ics', 'utf8'));

        assert.equal('-//Google Inc//Google Calendar 70.9054//EN',
                    cal.getPropertyValue('PRODID'));
        assert.equal('Gilsum NH Calendar', cal.getPropertyValue('X-WR-CALNAME'));
        assert.equal(153, cal.events().length);

        var vevent = cal.events()[0];
        assert.equal('01meijjkccslk5acp8rngq30es@google.com',
                vevent.getPropertyValue('UID'));

        vevent = cal.events()[1];
        assert.equal('jmdoebbto9vubpjf32aokpojb4@google.com',
                vevent.getPropertyValue('UID'));
        assert.equal('America/New_York',
                vevent.getProperty('DTSTART').getParameter('TZID'));
        assert.equal('2011-09-26T19:00:00.000Z',
                vevent.getPropertyValue('DTSTART').toISOString());
    });

    it('parses data from evolution', function() {
        // Evolution doesn't seem to provide very consistent line endings
        var cal = icalendar.iCalendar.parse(
                fs.readFileSync(__dirname+'/evolution.ics', 'utf8'));
    });
});

