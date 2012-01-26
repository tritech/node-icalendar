
var RRule = require('../lib/icalendar').RRule;

describe("RRule", function() {
    it("should parse RRULEs correctly", function() {
        expect(RRule.parse('FREQ=YEARLY;BYMONTH=11;BYDAY=1SU').valueOf())
            .toEqual({FREQ: 'YEARLY', BYMONTH: 11, BYDAY: [1,0]});
    });

    it("handles yearly recurrence", function() {
        var start = new Date(1970,2,8,2,0,0);
        var rrule = RRule.parse('FREQ=YEARLY;BYMONTH=3;BYDAY=1SU');
        var rrule5 = RRule.parse('FREQ=YEARLY;INTERVAL=5;BYMONTH=3;BYDAY=1SU');

        expect(rrule.nextOccurs(start, new Date(2011,1,4)))
                .toEqual(new Date(2011,2,6,2,0,0));

        expect(rrule.nextOccurs(start, new Date(2011,3,7)))
                .toEqual(new Date(2012,2,4,2,0,0));

        expect(rrule.nextOccurs(start, new Date(2011,2,6,2,0,0)))
                .toEqual(new Date(2012,2,4,2,0,0));


        expect(rrule5.nextOccurs(start, new Date(2011,1,4)))
                .toEqual(new Date(2015,2,1,2,0,0));
    });

//    it("handles monthly recurrence", function() {
//        var start = new Date(2011,0,1,2,0,0);
//        var rrule = RRule.parse('FREQ=MONTHLY;BYDAY=1SU');
//
//        expect(rrule.nextOccurs(start, new Date(2011,0,1,2,0,0)))
//                .toEqual(new Date(2011,1,
//    });
});

