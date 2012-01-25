
var icalendar = require('../lib/icalendar');

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
});

