// Test search

var assert = require('assert');
var fs = require('fs');

var icalendar = require('../lib');

// NB: Ported to jasmine from expresso, hence the strange layout
// TODO: Make this look more like a jasmine spec
describe("iCalendar", function() {
    it('calendar object', function() {
        // assert that we create a valid empty iCal object
        var ics = new icalendar.iCalendar();
        assert.deepEqual([
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:'+icalendar.PRODID,
            'END:VCALENDAR'], ics.format());
    });

    it('format vevent', function() {
        var vevent = new icalendar.VEvent('testuid@daybilling.com');
        vevent.addProperty('DTSTART', new Date(Date.UTC(2011,10,12,14,00,00)));
        vevent.addProperty('DTEND', new Date(Date.UTC(2011,10,12,15,03,00)));

        var dtstamp = icalendar.format_value('DATE-TIME',vevent.getPropertyValue('DTSTAMP'));
        assert.deepEqual([
            'BEGIN:VEVENT',
            'DTSTAMP:'+dtstamp,
            'UID:testuid@daybilling.com',
            'DTSTART:20111112T140000Z',
            'DTEND:20111112T150300Z',
            'END:VEVENT'], vevent.format());
    });

    it('VEvent.toString', function() {
        // VEvent objects need to get a calendar wrapper...
        var vevent = new icalendar.VEvent('testuid@daybilling.com');
        vevent.addProperty('DTSTART', new Date(Date.UTC(2011,10,12,14,00,00)));
        vevent.addProperty('DTEND', new Date(Date.UTC(2011,10,12,15,03,00)));

        var dtstamp = icalendar.format_value('DATE-TIME',vevent.getPropertyValue('DTSTAMP'));
        assert.equal(
            'BEGIN:VCALENDAR\r\n'+
            'VERSION:2.0\r\n'+
            'PRODID:'+icalendar.PRODID+'\r\n'+
            'BEGIN:VEVENT\r\n'+
            'DTSTAMP:'+dtstamp+'\r\n'+
            'UID:testuid@daybilling.com\r\n'+
            'DTSTART:20111112T140000Z\r\n'+
            'DTEND:20111112T150300Z\r\n'+
            'END:VEVENT\r\n'+
            'END:VCALENDAR\r\n', vevent.toString());
    });

    it('wraps long lines correctly', function() {
        var vevent = new icalendar.VEvent('testuid@daybilling.com');
        vevent.setDate(new Date(Date.UTC(2011,11,2,16,59,00)), 3600);
        vevent.setDescription(
            "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod "+
            "tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, "+
            "quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.");

        var dtstamp = icalendar.format_value('DATE-TIME',vevent.getPropertyValue('DTSTAMP'));
        assert.deepEqual([
            'BEGIN:VEVENT',
            'DTSTAMP:'+dtstamp,
            'UID:testuid@daybilling.com',
            'DTSTART:20111202T165900Z',
            'DURATION:PT1H',
            'DESCRIPTION:Lorem ipsum dolor sit amet\\, consectetur adipisicing elit\\, sed',
            '  do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad',
            '  minim veniam\\, quis nostrud exercitation ullamco laboris nisi ut aliquip ',
            ' ex ea commodo consequat.',
            'END:VEVENT'], vevent.format());
    });

    it('timezone object', function() {
        var tz = new icalendar.VTimezone(null, 'Totally/Bogus');
        var dst = tz.addComponent('DAYLIGHT');
        dst.addProperty('DTSTART', new Date(1970,2,8,2,0,0));
        dst.addProperty('RRULE', {FREQ: 'YEARLY', BYMONTH: 3, BYDAY: '2SU'});
        dst.addProperty('TZOFFSETFROM', -500);
        dst.addProperty('TZOFFSETTO', -400);
        dst.addProperty('TZNAME', 'EDT');
        var std = tz.addComponent('STANDARD');
        std.addProperty('DTSTART', new Date(1970,10,1,2,0,0));
        std.addProperty('RRULE', {FREQ: 'YEARLY', BYMONTH: 11, BYDAY: '1SU'});
        std.addProperty('TZOFFSETFROM', -400);
        std.addProperty('TZOFFSETTO', -500);
        std.addProperty('TZNAME', 'EST');

        // These are easy...
        expect(tz.getOffsetForDate(new Date(2011,6,2))).toEqual(-400);
        expect(tz.getOffsetForDate(new Date(2011,1,2))).toEqual(-500);

        // Do we handle transitions correctly?
        // NB: These come in as an array because Date objects can't
        //     represent a time that doesn't actually exist
        expect(tz.getOffsetForDate([2011,3,13,1,59,59])).toEqual(-500);
        expect(tz.getOffsetForDate([2011,3,13,2,0,0])).toEqual(-400);

        expect(tz.getOffsetForDate([2011,11,6,1,59,59])).toEqual(-400);
        expect(tz.getOffsetForDate([2011,11,6,2,0,0])).toEqual(-500);
    });

    it('creates calendar clones', function() {
        var cal = icalendar.parse_calendar(
            'BEGIN:VCALENDAR\r\n'+
            'VERSION:2.0\r\n'+
            'PRODID:-//Bobs Software Emporium//NONSGML Bobs Calendar//EN\r\n'+
            'BEGIN:VEVENT\r\n'+
            'DTSTAMP:20111202T165900\r\n'+
            'UID:testuid@someotherplace.com\r\n'+
            'DESCRIPTION:This bit of text is long and should be sp\r\n'+
            ' lit across multiple lines of output\r\n'+
            'END:VEVENT\r\n'+
            'END:VCALENDAR\r\n');

        var cal2 = cal.clone();

        expect(cal).toNotBe(cal2);
        expect(cal.components['VEVENT'][0])
            .toNotBe(cal2.components['VEVENT'][0]);
        expect(cal2.toString())
            .toEqual(cal.toString())

    });

    it('formats objects with multiple occurrences of a property', function() {
        var vevent = new icalendar.VEvent('testuid@tri-tech.com');
        vevent.addProperty('EXDATE', new Date(Date.UTC(2012,2,3, 11,30,00)));
        vevent.addProperty('EXDATE', new Date(2011,1,2), { VALUE: 'DATE' });

        var dtstamp = icalendar.format_value('DATE-TIME',vevent.getPropertyValue('DTSTAMP'));
        assert.deepEqual([
            'BEGIN:VEVENT',
            'DTSTAMP:'+dtstamp,
            'UID:testuid@tri-tech.com',
            'EXDATE:20120303T113000Z',
            'EXDATE;VALUE=DATE:20110202',
            'END:VEVENT'
            ],
            vevent.format());
    });
});
