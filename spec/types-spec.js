
var icalendar = require('../lib');
var assert = require('assert');

// NB: Ported to jasmine from expresso, hence the strange layout
// TODO: Make this look more like a jasmine spec
describe('iCalendar type formatters and parsers', function() {
    it('formats icalendar data types', function() {
        assert.equal('AAECBAUG', icalendar.format_value('BINARY',
            new Buffer('\u0000\u0001\u0002\u0004\u0005\u0006')));

        var date_only = new Date(2011,10,9);
        var dt = new Date(Date.UTC(2011,10,9,17,32,16));
        var dt2 = new Date(Date.UTC(2011,10,10,19,32));
        assert.equal('20111109', icalendar.format_value('DATE', date_only));
        assert.equal('173216Z', icalendar.format_value('TIME', dt));
        assert.equal('20111109T173216Z', icalendar.format_value('DATE-TIME', dt));

        assert.equal('P1W', icalendar.format_value('DURATION', 60*60*24*7));
        assert.equal('P1D', icalendar.format_value('DURATION', 60*60*24));
        assert.equal('PT1H', icalendar.format_value('DURATION', 60*60));
        assert.equal('PT1M', icalendar.format_value('DURATION', 60));
        assert.equal('PT1S', icalendar.format_value('DURATION', 1));

        assert.equal('P1W2DT3H4M5S', icalendar.format_value('DURATION',
            60*60*24*7 + 60*60*24*2 + 60*60*3 + 60*4 + 5));

        assert.equal('-PT11M', icalendar.format_value('DURATION', -60*11));

        assert.equal('1.333', icalendar.format_value('FLOAT', 1.333));
        assert.equal('-3.14', icalendar.format_value('FLOAT', -3.14));

        assert.equal('1234567890', icalendar.format_value('INTEGER', 1234567890));

        assert.equal('20111109T173216Z/20111110T193200Z',
                icalendar.format_value('PERIOD', [dt, dt2]));
        assert.equal('20111109T173216Z/P5DT3H',
                icalendar.format_value('PERIOD', [dt, 60*60*24*5 + 60*60*3]));

        assert.equal('FREQ=YEARLY;BYMONTH=11;BYDAY=1SU', icalendar.format_value('RECUR', {
            BYMONTH: 11, BYDAY: '1SU', FREQ: 'YEARLY'}));

        assert.equal('-0800', icalendar.format_value('UTC-OFFSET', -800));
        assert.equal('+1230', icalendar.format_value('UTC-OFFSET', 1230));

        // Escape some things...
        assert.equal('\\\\ \\; \\, \\n', icalendar.format_value('TEXT', '\\ ; , \n'));
    });
    
    it('formats array values correctly', function() {
        assert.equal(
            '20120101,20120201',
            icalendar.format_value('DATE', [new Date(2012,0,1), new Date(2012,1,1)]));

        var dt = new Date(Date.UTC(2011,10,9,17,32,16));
        var dt2 = new Date(Date.UTC(2011,10,10,19,32));
        assert.equal(
            '20111109T173216Z/20111110T193200Z,20111110T193200Z/20111109T173216Z',
            icalendar.format_value('PERIOD', [[dt, dt2], [dt2, dt]]));

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

        expect(icalendar.parse_value('DURATION', 'P1W2DT3H4M5S'))
            .toEqual(60*60*24*7 + 60*60*24*2 + 60*60*3 + 60*4 + 5);
        expect(icalendar.parse_value('DURATION', 'P1W'))
            .toEqual(60*60*24*7);
        expect(icalendar.parse_value('DURATION', 'P1D'))
            .toEqual(60*60*24);
        expect(icalendar.parse_value('DURATION', 'PT1H'))
            .toEqual(60*60);
        expect(icalendar.parse_value('DURATION', 'PT1M'))
            .toEqual(60);
        expect(icalendar.parse_value('DURATION', 'PT1S'))
            .toEqual(1);
        expect(icalendar.parse_value('DURATION', '-PT11M'))
            .toEqual(-60*11);

        expect(icalendar.parse_value('RECUR', 'FREQ=YEARLY;BYMONTH=11;BYDAY=1SU'))
            .toEqual({FREQ: 'YEARLY', BYMONTH: '11', BYDAY: '1SU'});
    });

});
