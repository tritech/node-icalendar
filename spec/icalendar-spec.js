// Test search

var assert = require('assert');
var fs = require('fs');

var icalendar = require('../lib/icalendar');

// NB: Ported to jasmine from expresso, hence the strange layout
// TODO: Make this look more like a jasmine spec
describe("iCalendar", function() {
    it('formats icalendar data types', function() {
        assert.equal('AAECBAUG', icalendar.format_value('BINARY',
            new Buffer('\u0000\u0001\u0002\u0004\u0005\u0006')));

        var dt = new Date(2011,10,9,17,32,16);
        var dt2 = new Date(2011,10,10,19,32);
        assert.equal('20111109', icalendar.format_value('DATE', dt));
        assert.equal('173216', icalendar.format_value('TIME', dt));
        assert.equal('20111109T173216', icalendar.format_value('DATE-TIME', dt));

        assert.equal('P1W', icalendar.format_value('DURATION', 60*60*24*7));
        assert.equal('P1D', icalendar.format_value('DURATION', 60*60*24));
        assert.equal('PT1H', icalendar.format_value('DURATION', 60*60));
        assert.equal('PT1M', icalendar.format_value('DURATION', 60));
        assert.equal('PT1S', icalendar.format_value('DURATION', 1));

        assert.equal('P1W2DT3H4M5S', icalendar.format_value('DURATION',
            60*60*24*7 + 60*60*24*2 + 60*60*3 + 60*4 + 5));

        assert.equal('1.333', icalendar.format_value('FLOAT', 1.333));
        assert.equal('-3.14', icalendar.format_value('FLOAT', -3.14));

        assert.equal('1234567890', icalendar.format_value('INTEGER', 1234567890));

        assert.equal('20111109T173216/20111110T193200',
                icalendar.format_value('PERIOD', [dt, dt2]));
        assert.equal('20111109T173216/P5DT3H',
                icalendar.format_value('PERIOD', [dt, 60*60*24*5 + 60*60*3]));

        assert.equal('FREQ=YEARLY;BYMONTH=11;BYDAY=1SU', icalendar.format_value('RECUR', {
            BYMONTH: 11, BYDAY: '1SU', FREQ: 'YEARLY'}));

        assert.equal('-0800', icalendar.format_value('UTC-OFFSET', -800));
        assert.equal('+1230', icalendar.format_value('UTC-OFFSET', 1230));

        // Escape some things...
        assert.equal('\\\\ \\; \\, \\n', icalendar.format_value('TEXT', '\\ ; , \n'));
    });

    it('value parsers', function() {
        assert.equal('\u0000\u0001\u0002\u0004\u0005\u0006',
            icalendar.parse_value('BINARY', 'AAECBAUG'));

        expect(icalendar.parse_value('DATE', '20111109'))
            .toEqual(new Date(2011,10,9));
        expect(icalendar.parse_value('DATE', '20111109').date_only)
            .toEqual(true);

        assert.equal((new Date(0,0,0,17,32,16)).valueOf(),
            icalendar.parse_value('TIME', '173216').valueOf());

        expect(icalendar.parse_value('DATE-TIME', '20111109T173216'))
            .toEqual(new Date(2011,10,9,17,32,16));
        expect(icalendar.parse_value('DATE-TIME', '20110725T000000Z'))
            .toEqual(new Date(Date.UTC(2011,6,25)));

        assert.equal(60*60*24*7 + 60*60*24*2 + 60*60*3 + 60*4 + 5,
            icalendar.parse_value('DURATION', 'P1W2DT3H4M5S'));

        assert.deepEqual({FREQ: 'YEARLY', BYMONTH: 11, BYDAY: [1,0]},
            icalendar.parse_value('RECUR', 'FREQ=YEARLY;BYMONTH=11;BYDAY=1SU').valueOf());
    });

    it('calendar object', function() {
        // assert that we create a valid empty iCal object
        var ics = new icalendar.iCalendar();
        assert.deepEqual([
            'BEGIN:VCALENDAR',
            'PRODID:'+icalendar.PRODID,
            'VERSION:2.0',
            'END:VCALENDAR'], ics.format());
    });

    it('format vevent', function() {
        var vevent = new icalendar.VEvent('testuid@daybilling.com');
        vevent.addProperty('DTSTART', new Date(2011,10,12,14,00,00));
        vevent.addProperty('DTEND', new Date(2011,10,12,15,03,00));

        var dtstamp = icalendar.format_value('DATE-TIME',vevent.getPropertyValue('DTSTAMP'));
        assert.deepEqual([
            'BEGIN:VEVENT',
            'DTSTAMP:'+dtstamp,
            'UID:testuid@daybilling.com',
            'DTSTART:20111112T140000',
            'DTEND:20111112T150300',
            'END:VEVENT'], vevent.format());
    });

    it('VEvent.toString', function() {
        // VEvent objects need to get a calendar wrapper...
        var vevent = new icalendar.VEvent('testuid@daybilling.com');
        vevent.addProperty('DTSTART', new Date(2011,10,12,14,00,00));
        vevent.addProperty('DTEND', new Date(2011,10,12,15,03,00));

        var dtstamp = icalendar.format_value('DATE-TIME',vevent.getPropertyValue('DTSTAMP'));
        assert.equal(
            'BEGIN:VCALENDAR\r\n'+
            'PRODID:'+icalendar.PRODID+'\r\n'+
            'VERSION:2.0\r\n'+
            'BEGIN:VEVENT\r\n'+
            'DTSTAMP:'+dtstamp+'\r\n'+
            'UID:testuid@daybilling.com\r\n'+
            'DTSTART:20111112T140000\r\n'+
            'DTEND:20111112T150300\r\n'+
            'END:VEVENT\r\n'+
            'END:VCALENDAR\r\n', vevent.toString());
    });

    it('wraps long lines correctly', function() {
        var vevent = new icalendar.VEvent('testuid@daybilling.com');
        vevent.setDate(new Date(2011,11,2,16,59,00), 3600);
        vevent.setDescription(
            "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod "+
            "tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, "+
            "quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.");

        var dtstamp = icalendar.format_value('DATE-TIME',vevent.getPropertyValue('DTSTAMP'));
        assert.deepEqual([
            'BEGIN:VEVENT',
            'DTSTAMP:'+dtstamp,
            'UID:testuid@daybilling.com',
            'DTSTART:20111202T165900',
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
        dst.addProperty('RRULE', new icalendar.RRule({FREQ: 'YEARLY', BYMONTH: 3, BYDAY: '2SU'}));
        dst.addProperty('TZOFFSETFROM', -500);
        dst.addProperty('TZOFFSETTO', -400);
        dst.addProperty('TZNAME', 'EDT');
        var std = tz.addComponent('STANDARD');
        std.addProperty('DTSTART', new Date(1970,10,1,2,0,0));
        std.addProperty('RRULE', new icalendar.RRule({FREQ: 'YEARLY', BYMONTH: 11, BYDAY: '1SU'}));
        std.addProperty('TZOFFSETFROM', -400);
        std.addProperty('TZOFFSETTO', -500);
        std.addProperty('TZNAME', 'EST');

        assert.equal(-400, tz.getOffsetForDate(new Date(2011,6,2)));
    });

    it('parsing', function() {
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

    it('parse torture test', function() {
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

    it('creates calendar clones', function() {
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

        var cal2 = cal.clone();

        expect(cal).toNotBe(cal2);
        expect(cal.components['VEVENT'][0])
            .toNotBe(cal2.components['VEVENT'][0]);
        expect(cal2.toString())
            .toEqual(cal.toString())

    });
});
