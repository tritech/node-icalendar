// Test search

var assert = require('assert');
var fs = require('fs');

var parse_calendar = require('../lib/parser').parse_calendar;

describe("iCalendar.parse", function() {
    it('parses data correctly', function() {
        var cal = parse_calendar(
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

    it("decodes escaped chars as per RFC", function() {
        var cal = parse_calendar(
            'BEGIN:VCALENDAR\r\n'+
            'PRODID:-//Microsoft Corporation//Outlook 14.0 MIMEDIR//EN\r\n'+
            'VERSION:2.0\r\n'+
            'BEGIN:VEVENT\r\n'+
            'DESCRIPTION:Once upon a time\\; someone used a comma\\,\\nand a newline!\r\n'+
            'DTEND:20120427T170000Z\r\n'+
            'DTSTART:20120427T150000Z\r\n'+
            'UID:testuid@someotherplace.com\r\n'+
            'END:VEVENT\r\n'+
            'END:VCALENDAR\r\n');

        var vevent = cal.components['VEVENT'][0];
        assert.equal('Once upon a time; someone used a comma,\nand a newline!',
            vevent.getPropertyValue('DESCRIPTION'));
    });

    it("handles data using tabs for line continuations (Outlook)", function() {
        var cal = parse_calendar(
            'BEGIN:VCALENDAR\r\n'+
            'PRODID:-//Microsoft Corporation//Outlook 14.0 MIMEDIR//EN\r\n'+
            'VERSION:2.0\r\n'+
            'BEGIN:VEVENT\r\n'+
            'CLASS:PUBLIC\r\n'+
            'DESCRIPTION:Come print for free! We will have more ally prints\\, and all th\r\n'+
            '	e great colors you’ve come to expect from Open. \\n\\nFood! \\n\\nMusic! \\n\\\r\n'+
            '	nSun!\\n\r\n'+
            'DTEND:20120427T170000Z\r\n'+
            'DTSTART:20120427T150000Z\r\n'+
            'UID:040000008200E00074C5B7101A82E00800000000C0132EF80F0ECD01000000000000000\r\n'+
            '	0100000008B70F4BD4D344E418B5834B8D78C50A3\r\n'+
            'END:VEVENT\r\n'+
            'END:VCALENDAR\r\n');
                    
        var vevent = cal.components['VEVENT'][0];
        assert.equal('Come print for free! We will have more ally prints, and all '+
            'the great colors you’ve come to expect from Open. \n\nFood! \n\nMusic! \n\nSun!\n',
            vevent.getPropertyValue('DESCRIPTION'));

        assert.equal('040000008200E00074C5B7101A82E00800000000C0132EF80F0ECD0100000000000'+
            '00000100000008B70F4BD4D344E418B5834B8D78C50A3',
            vevent.getPropertyValue('UID'));
    });

    it('parses large collections', function() {
        var cal = parse_calendar(
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
        var cal = parse_calendar(
                fs.readFileSync(__dirname+'/evolution.ics', 'utf8'));
    });

    it('parsing', function() {
        var cal = parse_calendar(
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

    it('parse torture test', function() {
        var cal = parse_calendar(
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

    it('uses timezone data parameter when parsing', function() {
        var cal = parse_calendar(
            'BEGIN:VCALENDAR\r\n'+
            'PRODID:-//Google Inc//Google Calendar 70.9054//EN\r\n'+
            'VERSION:2.0\r\n'+
            'BEGIN:VEVENT\r\n'+
            'DTSTART;TZID=America/New_York:20110926T150000\r\n'+
            'DTEND;TZID=America/New_York:20110926T160000\r\n'+
            'DTSTAMP:20111206T175451Z\r\n'+
            'UID:jmdoebbto9vubpjf32aokpojb4@google.com\r\n'+
            'CREATED:20110913T133341Z\r\n'+
            'LAST-MODIFIED:20110913T133341Z\r\n'+
            'SUMMARY:Girl Scout Cadettes\r\n'+
            'END:VEVENT\r\n'+
            'END:VCALENDAR\r\n',

            'BEGIN:VCALENDAR\r\n'+
            'PRODID:-//Google Inc//Google Calendar 70.9054//EN\r\n'+
            'VERSION:2.0\r\n'+
            'BEGIN:VTIMEZONE\r\n'+
            'TZID:America/New_York\r\n'+
            'X-LIC-LOCATION:America/New_York\r\n'+
            'BEGIN:DAYLIGHT\r\n'+
            'TZOFFSETFROM:-0500\r\n'+
            'TZOFFSETTO:-0400\r\n'+
            'TZNAME:EDT\r\n'+
            'DTSTART:19700308T020000\r\n'+
            'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU\r\n'+
            'END:DAYLIGHT\r\n'+
            'BEGIN:STANDARD\r\n'+
            'TZOFFSETFROM:-0400\r\n'+
            'TZOFFSETTO:-0500\r\n'+
            'TZNAME:EST\r\n'+
            'DTSTART:19701101T020000\r\n'+
            'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU\r\n'+
            'END:STANDARD\r\n'+
            'END:VTIMEZONE\r\n'+
            'END:VCALENDAR\r\n'
            );

        var vevent = cal.getComponents('VEVENT')[0];
        expect(vevent.getPropertyValue('DTSTART'))
            .toEqual(new Date(Date.UTC(2011,8,26,19,0,0)));
        expect(vevent.getPropertyValue('DTEND'))
            .toEqual(new Date(Date.UTC(2011,8,26,20,0,0)));
    });

    it('parses EXDATE properties', function() {
        var cal = parse_calendar(
            'BEGIN:VCALENDAR\r\n'+
            'PRODID:-//Bobs Software Emporium//NONSGML Bobs Calendar//EN\r\n'+
            'VERSION:2.0\r\n'+
            'BEGIN:VEVENT\r\n'+
            'DTSTAMP:20111202T165900\r\n'+
            'UID:testuid@someotherplace.com\r\n'+
            'EXDATE:20120102T100000,20120203T100000\r\n'+
            'EXDATE;VALUE=DATE:20120304\r\n'+
            'END:VEVENT\r\n'+
            'END:VCALENDAR\r\n');

        var vevent = cal.getComponents('VEVENT')[0];
        expect(vevent.getPropertyValue('EXDATE'))
            .toEqual([new Date(2012,0,2, 10,0,0), new Date(2012,1,3, 10,0,0)]);
        expect(vevent.getPropertyValue('EXDATE',1))
            .toEqual([new Date(2012,2,4)]);
        expect(vevent.getPropertyValue('EXDATE',1)[0].date_only).toBeTruthy();
    });

    it('parses quoted property parameter values', function() {
        var cal = parse_calendar(
            'BEGIN:VCALENDAR\r\n'+
            'PRODID:-//Bobs Software Emporium//NONSGML Bobs Calendar//EN\r\n'+
            'VERSION:2.0\r\n'+
            'BEGIN:VEVENT\r\n'+
            'DTSTAMP:20111202T165900\r\n'+
            'X-TEST;TESTPARAM="Something;:, here":testvalue\r\n'+
            'UID:testuid@someotherplace.com\r\n'+
            'END:VEVENT\r\n'+
            'END:VCALENDAR\r\n');

        var vevent = cal.getComponents('VEVENT')[0];
        assert.equal('Something;:, here',
            vevent.getProperty('X-TEST').getParameter('TESTPARAM'));
    });
});

