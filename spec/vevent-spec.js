
var icalendar = require('../lib');

describe('VEvent objects', function() {
    it('matches time-ranges on start/end events correctly', function() {
        var vevent = new icalendar.VEvent();
        vevent.addProperty('DTSTART', new Date(2011,11,1,5,0,0));
        vevent.addProperty('DTEND', new Date(2011,11,2,5,0,0));

        // Null filters should always match...
        expect(vevent.inTimeRange(null, null))
            .toEqual(true);

        // Matches ranges that completely surround the event...
        expect(vevent.inTimeRange(new Date(2011,10,0), null))
            .toEqual(true);
        expect(vevent.inTimeRange(null, new Date(2011,11,3)))
            .toEqual(true);
        expect(vevent.inTimeRange(new Date(2011,10,0), new Date(2011,11,3)))
            .toEqual(true);

        // Matches ranges that partially overlap the event...
        expect(vevent.inTimeRange(new Date(2011,11,2,4,0,0), null))
            .toEqual(true);
        expect(vevent.inTimeRange(null, new Date(2011,11,2,4,0,0)))
            .toEqual(true);
        expect(vevent.inTimeRange(new Date(2011,11,1,6,0,0), new Date(2011,11,2,4,0,0)))
            .toEqual(true);

        // Events that don't actually overlap don't match...
        expect(vevent.inTimeRange(new Date(2011,11,2,5,0,0),null))
            .toEqual(false);
        expect(vevent.inTimeRange(null, new Date(2011,11,1,5,0,0)))
            .toEqual(false);
    });

    it('matches time-ranges on start/duration events', function() {
        var vevent = new icalendar.VEvent();
        vevent.addProperty('DTSTART', new Date(2011,11,1,5,0,0));
        vevent.addProperty('DURATION', 24*60*60); // 1 day

        // Null filters should always match...
        expect(vevent.inTimeRange(null, null))
            .toEqual(true);

        // Matches ranges that completely surround the event...
        expect(vevent.inTimeRange(new Date(2011,10,0), null))
            .toEqual(true);
        expect(vevent.inTimeRange(null, new Date(2011,11,3)))
            .toEqual(true);
        expect(vevent.inTimeRange(new Date(2011,10,0), new Date(2011,11,3)))
            .toEqual(true);

        // Matches ranges that partially overlap the event...
        expect(vevent.inTimeRange(new Date(2011,11,2,4,0,0), null))
            .toEqual(true);
        expect(vevent.inTimeRange(null, new Date(2011,11,2,4,0,0)))
            .toEqual(true);
        expect(vevent.inTimeRange(new Date(2011,11,1,6,0,0), new Date(2011,11,2,4,0,0)))
            .toEqual(true);

        // Events that don't actually overlap don't match...
        expect(vevent.inTimeRange(new Date(2011,11,2,5,0,0),null))
            .toEqual(false);
        expect(vevent.inTimeRange(null, new Date(2011,11,1,5,0,0)))
            .toEqual(false);
    });

    it('treats zero-duration events correctly', function() {
        var vevent = new icalendar.VEvent();
        vevent.addProperty('DTSTART', new Date(2011,11,1,5,0,0));
        vevent.addProperty('DURATION', 0);

        // If the duration of an event is zero, events overlap if
        // (start <= DTSTART AND end > DTSTART)
        expect(vevent.inTimeRange(new Date(2011,11,1,5,0,0),null))
            .toEqual(true);
        expect(vevent.inTimeRange(null,new Date(2011,11,1,5,0,0)))
            .toEqual(false);
    });

    it('expands appointments without end to 1 day', function() {
        var vevent = new icalendar.VEvent();
        vevent.addProperty('DTSTART', new Date(2011,11,1,5,0,0));

        expect(vevent.inTimeRange(new Date(2011,11,2,4,0,0),null))
            .toEqual(true);
    });

    it('correctly matches recurring events', function() {
        var vevent = new icalendar.VEvent();
        vevent.addProperty('DTSTART', new Date(2011,11,1,5,0,0));
        vevent.addProperty('RRULE', 'FREQ=MONTHLY;COUNT=3');

        expect(vevent.inTimeRange(new Date(2011,10,1), new Date(2011,11,1)))
                .toEqual(false);
        expect(vevent.inTimeRange(new Date(2011,11,1), new Date(2011,11,2)))
                .toEqual(true);
        expect(vevent.inTimeRange(new Date(2011,11,1), null))
                .toEqual(true);
        expect(vevent.inTimeRange(new Date(2012,0,1)), new Date(2012,5,1))
                .toEqual(true);
        expect(vevent.inTimeRange(new Date(2012,2,3), null))
                .toEqual(false);
    });

    it('uses EXDATE properties when calculating recurrence', function() {
        var cal = icalendar.parse_calendar(
            'BEGIN:VCALENDAR\r\n'+
            'PRODID:-//Bobs Software Emporium//NONSGML Bobs Calendar//EN\r\n'+
            'VERSION:2.0\r\n'+
            'BEGIN:VEVENT\r\n'+
            'DTSTAMP:20111202T165900\r\n'+
            'UID:testuid@someotherplace.com\r\n'+
            'DTSTART:20110101T100000\r\n'+
            'RRULE:FREQ=MONTHLY\r\n'+
            'EXDATE;VALUE=DATE:20110201\r\n'+
            'EXDATE:20110301T100000,20110401T120000\r\n'+
            'END:VEVENT\r\n'+
            'END:VCALENDAR\r\n');

        var rrule = cal.getComponents('VEVENT')[0].rrule();
        expect(rrule.nextOccurences(new Date(2010,11,31), 3))
                .toEqual([
                    new Date(2011,0,1,10),
                    new Date(2011,3,1,10),
                    new Date(2011,4,1,10)
                ]);
    });
});

