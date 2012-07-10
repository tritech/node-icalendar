
var RRule = require('../lib/rrule').RRule;

function date_only(y, m, d) {
    // Return a date object with the date_only set
    var dt = new Date(y, m, d);
    dt.date_only = true;
    return dt;
}

describe("RRule", function() {
    it("should parse RRULEs correctly", function() {
        expect(new RRule(RRule.parse('FREQ=YEARLY;BYMONTH=11;BYDAY=1SU')).valueOf())
            .toEqual({FREQ: 'YEARLY', BYMONTH: [11], BYDAY: [[1,0]]});
        expect(new RRule(RRule.parse('FREQ=YEARLY;BYDAY=-1SU')).valueOf())
            .toEqual({FREQ: 'YEARLY', BYDAY: [[-1,0]]});
        expect(new RRule('FREQ=WEEKLY;BYMONTH=1,2,3').valueOf())
            .toEqual({FREQ: 'WEEKLY', BYMONTH: [1,2,3]});
        rrule = new RRule('FREQ=WEEKLY;BYMONTH=1,2,3').valueOf();
        expect(rrule.FREQ).toEqual('WEEKLY');
        expect(rrule.BYMONTH).toEqual([1,2,3]);
    });

    it("should format RRULEs correctly", function() {
      expect(new RRule('FREQ=WEEKLY;BYMONTH=1,2,3').toString()).toEqual('FREQ=WEEKLY;BYMONTH=1,2,3');
    });

    it("respects UNTIL parts", function() {
        var start = new Date(2011,0,1,2,0,0);
        var rrule = new RRule(RRule.parse('FREQ=MONTHLY;BYDAY=1SU;UNTIL=20110201'), start);

        expect(rrule.next(new Date(2011,0,1,2,0,0)))
                .toEqual(new Date(2011,0,2,2,0,0));

        expect(rrule.next(new Date(2011,0,2,2,0,0)))
                .toEqual(null);
    });

    it("respects COUNT parts", function() {
        var rrule = new RRule('FREQ=MONTHLY;COUNT=3', new Date(2011,0,1));

        expect(rrule.nextOccurences(new Date(2010,11,31), 4))
                .toEqual([
                    new Date(2011,0,1),
                    new Date(2011,1,1),
                    new Date(2011,2,1)
                ]);
    });

    it("finds recurrences in a specific timeframe", function() {
        var rrule = new RRule('FREQ=MONTHLY', new Date(2011,0,1));

        expect(rrule.nextOccurences(new Date(2010,11,31), new Date(2011,2,15)))
                .toEqual([
                    new Date(2011,0,1),
                    new Date(2011,1,1),
                    new Date(2011,2,1)
                ]);
    });

    it("respects EXDATE date_only parts", function() {
        var rrule = new RRule('FREQ=MONTHLY', {
            DTSTART: new Date(2011,0,1),
            EXDATE: [date_only(2011,1,1), date_only(2011,3,1)]
        });

        expect(rrule.nextOccurences(new Date(2010,11,31), 4))
                .toEqual([
                    new Date(2011,0,1),
                    new Date(2011,2,1),
                    new Date(2011,4,1),
                    new Date(2011,5,1)
                ]);
    });

    it("respects EXDATE full date parts", function() {
        var rrule = new RRule('FREQ=MONTHLY', {
            DTSTART: new Date(2011,0,1, 10,0,0),
            EXDATE: [date_only(2011,1,1), new Date(2011,2,1, 10,0,0), new Date(2011,3,1, 12,0,0)]
        });

        expect(rrule.nextOccurences(new Date(2010,11,31), 3))
                .toEqual([
                    new Date(2011,0,1,10),
                    new Date(2011,3,1,10),
                    new Date(2011,4,1,10)
                ]);
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

        it("handles yearly recurrences with time values", function() {
            var rrule = new RRule('FREQ=YEARLY;BYMONTH=3;BYDAY=1SU', new Date(1970,2,8,2,30,30));

            expect(rrule.next(new Date(2011,2,6,2,30,30,259)))
                    .toEqual(new Date(2012,2,4,2,30,30,0));
        });

        it("handles yearly recurrences on the start month and day of month", function() {
          var rrule = new RRule('FREQ=YEARLY', new Date(1970,2,8));

          expect(rrule.next(new Date(2011,2,9)))
                  .toEqual(new Date(2012,2,8));
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

            expect(rrule.next(new Date(2012,3,1,2,0,0)))
                    .toEqual(new Date(2012,4,6,2,0,0));

            expect(rrule.next(new Date(2012,4,6,2,0,0)))
                    .toEqual(new Date(2012,5,3,2,0,0));
        });

        it("handles monthly recurrences with a time value", function() {
            var rrule = new RRule(RRule.parse('FREQ=MONTHLY;BYDAY=1SU'), new Date(2011,0,1,2,30,30));

            expect(rrule.next(new Date(2011,0,3,2,30,30,259)))
                    .toEqual(new Date(2011,1,6,2,30,30,0));

        });

        it("handles monthly recurrences with multiple BYDAY values", function () {
            var rrule = new RRule('FREQ=MONTHLY;BYDAY=1MO,2TU,3WE', new Date(2012, 0, 1));

            expect(rrule.nextOccurences(new Date(2012, 0, 1), 6))
                .toEqual([
                      new Date(2012, 0, 2),
                      new Date(2012, 0, 10),
                      new Date(2012, 0, 18),
                      new Date(2012, 1, 6),
                      new Date(2012, 1, 14),
                      new Date(2012, 1, 15)
                    ]);
        });

        it("handles monthly recurrences on the start day of month", function() {
          var rrule = new RRule(RRule.parse('FREQ=MONTHLY'), new Date(2011,0,1));

          expect(rrule.next(new Date(2011,0,15)))
                  .toEqual(new Date(2011,1,1));
        });

        it("handles monthly recurrence with an interval", function() {
            var rrule = new RRule(RRule.parse('FREQ=MONTHLY;BYDAY=1SU;INTERVAL=3'),
                        new Date(2011,0,1,2,0,0));

            expect(rrule.nextOccurences(new Date(2011,0,1,2,0,0), 3))
                    .toEqual([
                        new Date(2011,0,2,2,0,0),
                        new Date(2011,3,3,2,0,0),
                        new Date(2011,6,3,2,0,0)
                        ]);
        });
        
        it("handles MONTHLY recurrence with BYMONTHDAY", function() {
            var rrule = new RRule(RRule.parse('FREQ=MONTHLY;BYMONTHDAY=14'),
                        new Date(2011,0,1));

            expect(rrule.nextOccurences(new Date(2011,0,2), 3))
                    .toEqual([
                        new Date(2011,0,14),
                        new Date(2011,1,14),
                        new Date(2011,2,14)
                        ]);
        });

        it("handles MONTHLY recurrence with negative BYDAY", function() {
            var rrule = new RRule(RRule.parse('FREQ=MONTHLY;BYDAY=-2SU'),
                        new Date(2012,0,22));

            expect(rrule.next(new Date(2012,1,1)))
                    .toEqual(new Date(2012,1,19));
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

        it("handles weekly recurrence with time granularity", function() {
            var rrule = new RRule('FREQ=WEEKLY;BYDAY=TU', new Date(2012,0,1,2,45,30));

            expect(rrule.next(new Date(2012,0,1,2,45,30)))
                    .toEqual(new Date(2012,0,3,2,45,30));

            expect(rrule.next(new Date(2012,0,5)))
                    .toEqual(new Date(2012,0,10,2,45,30));
        });

        it("handles weekly recurrence with BYDAY", function() {
            var rrule = new RRule('FREQ=WEEKLY;BYDAY=TU', new Date(2012,0,1));

            expect(rrule.next(new Date(2012,0,1)))
                    .toEqual(new Date(2012,0,3));

            expect(rrule.next(new Date(2012,0,5)))
                    .toEqual(new Date(2012,0,10));

            expect(rrule.next(new Date(2012,0,8)))
                    .toEqual(new Date(2012,0,10));

            expect(rrule.next(new Date(2012,0,5)))
                    .toEqual(new Date(2012,0,10));

        });

        it("limits results of weekly recurrences with BYMONTH", function() {
            var rrule = new RRule('FREQ=WEEKLY;BYMONTH=2,3,5', new Date(2012,0,3));

            expect(rrule.next(new Date(2012,0,4)))
                    .toEqual(new Date(2012,1,7));
        });

        it("handles weekly recurrence with interval", function() {
          var rrule = new RRule('FREQ=WEEKLY;INTERVAL=3', new Date(2012,0,3,12,30,45));

          expect(rrule.next(new Date(2012,0,2)))
                  .toEqual(new Date(2012,0,3,12,30,45));

          expect(rrule.next(new Date(2012,0,18)))
                  .toEqual(new Date(2012,0,24,12,30,45));

          expect(rrule.next(new Date(2012,0,3,12,30,45)))
                  .toEqual(new Date(2012,0,24,12,30,45));
        });

    });

    describe("daily recurrence", function() {
        it("handles daily recurrence", function() {
            var rrule = new RRule('FREQ=DAILY;BYDAY=1MO,2TU,3WE', new Date(2012,0,1));

            expect(rrule.nextOccurences(new Date(2012,0,1), 3))
                    .toEqual([new Date(2012,0,2),
                        new Date(2012,0,10),
                        new Date(2012,0,18)]);
        });

        it("handles daily recurrence with time values", function() {
            var rrule = new RRule('FREQ=DAILY', new Date(2012,0,1,12,45,30));

            expect(rrule.next(new Date(2012,0,2,12,45,29,999)))
                    .toEqual(new Date(2012,0,2,12,45,30));

            expect(rrule.next(new Date(2012,0,2,12,45,30)))
                    .toEqual(new Date(2012,0,3,12,45,30));
        });


        it("handles daily weekend recurrence across month boundary", function() {
            var rrule = new RRule('FREQ=DAILY;BYDAY=SA,SU', new Date(2012,3,14,17,0));

            expect(rrule.next(new Date(2012,4,29,17,0)))
                .toEqual(new Date(2012,5,2,17,0));
        });
    });
});

