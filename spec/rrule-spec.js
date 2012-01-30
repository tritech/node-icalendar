
var RRule = require('../lib/icalendar').RRule;

describe("RRule", function() {
    it("should parse RRULEs correctly", function() {
        expect(new RRule(RRule.parse('FREQ=YEARLY;BYMONTH=11;BYDAY=1SU')).valueOf())
            .toEqual({FREQ: 'YEARLY', BYMONTH: [11], BYDAY: [[1,0]]});
        expect(new RRule('FREQ=WEEKLY;BYMONTH=1,2,3').valueOf())
            .toEqual({FREQ: 'WEEKLY', BYMONTH: [1,2,3]});
    });

    it("respects UNTIL parts", function() {
        var start = new Date(2011,0,1,2,0,0);
        var rrule = new RRule(RRule.parse('FREQ=MONTHLY;BYDAY=1SU;UNTIL=20110201'), start);

        expect(rrule.next(new Date(2011,0,1,2,0,0)))
                .toEqual(new Date(2011,0,2,2,0,0));

        expect(rrule.next(new Date(2011,0,2,2,0,0)))
                .toEqual(null);
    });

    describe("yearly recurrence", function() {
        it("handles yearly recurrence", function() {
            var start = new Date(1970,2,8,2,0,0);
            var rrule = new RRule('FREQ=YEARLY;BYMONTH=3;BYDAY=1SU', new Date(1970,2,8,2,0,0));

            expect(rrule.next(new Date(2011,1,4)))
                    .toEqual(new Date(2011,2,6,2,0,0));

            expect(rrule.next(new Date(2011,3,7)))
                    .toEqual(new Date(2012,2,4,2,0,0));

            expect(rrule.next(new Date(2011,2,6,2,0,0)))
                    .toEqual(new Date(2012,2,4,2,0,0));
        });

        it("handles yearly recurrence with an interval", function() {
            var rrule5 = new RRule('FREQ=YEARLY;INTERVAL=5;BYMONTH=3;BYDAY=1SU', new Date(1970,2,8,2,0,0));

            expect(rrule5.next(new Date(2011,1,4)))
                    .toEqual(new Date(2015,2,1,2,0,0));
        });
    });

    describe("monthly recurrence", function() {
        it("handles monthly recurrence", function() {
            var start = new Date(2011,0,1,2,0,0);
            var rrule = new RRule(RRule.parse('FREQ=MONTHLY;BYDAY=1SU'), start);

            expect(rrule.next(new Date(2011,0,1,2,0,0)))
                    .toEqual(new Date(2011,0,2,2,0,0));

            expect(rrule.next(new Date(2011,0,2,2,0,0)))
                    .toEqual(new Date(2011,1,6,2,0,0));
        });

        it("handles monthly recurrence with an interval", function() {
            var rrule = new RRule(RRule.parse('FREQ=MONTHLY;BYDAY=1SU;INTERVAL=3'),
                        new Date(2011,0,1,2,0,0));

            expect(rrule.nextOccurances(new Date(2011,0,1,2,0,0), 3))
                    .toEqual([
                        new Date(2011,0,2,2,0,0),
                        new Date(2011,3,3,2,0,0),
                        new Date(2011,6,3,2,0,0)
                        ]);
        });
    });

    describe("weekly recurrence", function() {
        it("handles simple weekly recurrence", function() {
            var rrule = new RRule('FREQ=WEEKLY', new Date(2012,0,1));

            expect(rrule.next(new Date(2012,0,1)))
                    .toEqual(new Date(2012,0,8));

            expect(rrule.next(new Date(2012,0,5)))
                    .toEqual(new Date(2012,0,8));
        });

        it("handles weekly recurrence with BYDAY", function() {
            var rrule = new RRule('FREQ=WEEKLY;BYDAY=TU', new Date(2012,0,1));

            expect(rrule.next(new Date(2012,0,1)))
                    .toEqual(new Date(2012,0,3));

            expect(rrule.next(new Date(2012,0,5)))
                    .toEqual(new Date(2012,0,10));
        });

        it("limits results of weekly recurrences with BYMONTH", function() {
            var rrule = new RRule('FREQ=WEEKLY;BYMONTH=2,3,5', new Date(2012,0,3));

            expect(rrule.next(new Date(2012,0,4)))
                    .toEqual(new Date(2012,1,7));
        });
    });

    describe("daily recurrence", function() {
        it("handles daily recurrence", function() {
            var rrule = new RRule('FREQ=DAILY;BYDAY=1MO,2TU,3WE', new Date(2012,0,1));

            expect(rrule.nextOccurances(new Date(2012,0,1), 3))
                    .toEqual([new Date(2012,0,2),
                        new Date(2012,0,10),
                        new Date(2012,0,18)]);
        });
    });
});

