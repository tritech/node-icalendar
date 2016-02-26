var icalendar = require('../lib');

describe('VAlarm objects', function(){

  it('VAlarm class must be exposed', function(){
    expect(icalendar.VAlarm).toBeDefined();
  });

  it('VAlarm instance must expose methods', function(){
    var alarm = new icalendar.VAlarm();
    expect(alarm.setAction).toBeDefined();
    expect(alarm.setTrigger).toBeDefined();
    expect(alarm.setAttach).toBeDefined();
    expect(alarm.setSummary).toBeDefined();
    expect(alarm.setAttendee).toBeDefined();
    expect(alarm.setRepeat).toBeDefined();
    expect(alarm.setDuration).toBeDefined();
    expect(alarm.setDescription).toBeDefined();
  });

  it('VAlarm.setAction must add ACTION property', function(){
    var alarm = new icalendar.VAlarm();
    expect(alarm.getPropertyValue('ACTION')).toBeUndefined();
    alarm.setAction('SOME ACTION');
    expect(alarm.getPropertyValue('ACTION')).toEqual('SOME ACTION');
  });

  it('VAlarm.setTrigger must add TRIGGER property', function(){
    var alarm = new icalendar.VAlarm();
    expect(alarm.getPropertyValue('TRIGGER')).toBeUndefined();
    alarm.setTrigger(65);
    expect(alarm.getPropertyValue('TRIGGER')).toEqual(65);
  });

  it('VAlarm.setAttach must add ATTACH property', function(){
    var alarm = new icalendar.VAlarm();
    expect(alarm.getPropertyValue('ATTACH')).toBeUndefined();
    alarm.setAttach('uri://resource');
    expect(alarm.getPropertyValue('ATTACH')).toEqual('uri://resource');
  });

  it('VAlarm.setSummary must add SUMMARY property', function(){
    var alarm = new icalendar.VAlarm();
    expect(alarm.getPropertyValue('SUMMARY')).toBeUndefined();
    alarm.setSummary('Summary text');
    expect(alarm.getPropertyValue('SUMMARY')).toEqual('Summary text');
  });

  it('VAlarm.setAttendee must add ATTENDEE property', function(){
    var alarm = new icalendar.VAlarm();
    expect(alarm.getPropertyValue('ATTENDEE')).toBeUndefined();
    alarm.setAttendee('attendee@test.com');
    expect(alarm.getPropertyValue('ATTENDEE')).toEqual('attendee@test.com');
  });

  it('VAlarm.setDuration must add DURATION property', function(){
    var alarm = new icalendar.VAlarm();
    expect(alarm.getPropertyValue('DURATION')).toBeUndefined();
    alarm.setDuration('PT15M');
    expect(alarm.getPropertyValue('DURATION')).toEqual('PT15M');
  });

  it('VAlarm.setDescription must add DESCRIPTION property', function(){
    var alarm = new icalendar.VAlarm();
    expect(alarm.getPropertyValue('DESCRIPTION')).toBeUndefined();
    alarm.setDescription('Description text');
    expect(alarm.getPropertyValue('DESCRIPTION')).toEqual('Description text');
  });

  it('VAlarm must be created with calendar, action and trigger', function(){
    var calendar = new icalendar.iCalendar();
    var alarm = new icalendar.VAlarm(calendar, 'AUDIO', '-PT10M');

    expect(alarm.calendar).toBe(calendar);
    expect(alarm.getPropertyValue('ACTION')).toBe('AUDIO');
    expect(alarm.getPropertyValue('TRIGGER')).toBe('-PT10M');
  });

  describe('Validations', function(){

    describe('General', function(){

      var alarm;

      beforeEach(function(){
        var calendar = new icalendar.iCalendar();
        var event = calendar.addComponent('VEVENT');
        alarm = event.addComponent('VALARM');
      });

      it('VAlarm must not pass validation (Reason: ACTION missing)', function(){
        alarm.addProperty('TRIGGER', '-PT10M');
        expect(alarm.validate.bind(alarm)).toThrow('ACTION is a required property of VALARM');
      });

      it('VAlarm must not pass validation (Reason: TRIGGER missing)', function(){
        alarm.addProperty('ACTION', 'SOME ACTION');
        expect(alarm.validate.bind(alarm)).toThrow('TRIGGER is a required property of VALARM');
      });

      it('VAlarm must not pass validation (Reason: ACTION occurs more than once)', function(){
        alarm.addProperty('ACTION', 'SOME ACTION');
        alarm.addProperty('ACTION', 'SOME ACTION');
        alarm.addProperty('TRIGGER', '-PT10M');
        expect(alarm.validate.bind(alarm)).toThrow('ACTION property is required and must not occur more than once.');
      });

      it('VAlarm must not pass validation (Reason: TRIGGER occurs more than once)', function(){
        alarm.addProperty('ACTION', 'SOME ACTION');
        alarm.addProperty('TRIGGER', '-PT10M');
        alarm.addProperty('TRIGGER', '-PT10M');
        expect(alarm.validate.bind(alarm)).toThrow('TRIGGER property is required and must not occur more than once.');
      });

      it('VAlarm must not pass validation (Reason: ACTION and TRIGGER occur more than once, but only no-more-than-one-ACTION error is thrown)', function(){
        alarm.addProperty('ACTION', 'SOME ACTION');
        alarm.addProperty('ACTION', 'SOME ACTION');
        alarm.addProperty('TRIGGER', '-PT10M');
        alarm.addProperty('TRIGGER', '-PT10M');
        expect(alarm.validate.bind(alarm)).toThrow('ACTION property is required and must not occur more than once.');
      });

      it('VAlarm must not pass validation (Reason: ACTION invalid)', function(){
        alarm.addProperty('ACTION', 'SOME ACTION');
        alarm.addProperty('TRIGGER', '-PT10M');
        expect(alarm.validate.bind(alarm)).toThrow('Invalid ACTION value for VALARM');
      });

      it('VAlarm must not pass validation (Reason: REPEAT is present but DURATION is not)', function(){
        alarm.addProperty('ACTION', 'SOME ACTION');
        alarm.addProperty('TRIGGER', '-PT10M');
        alarm.setRepeat(1);
        expect(alarm.validate.bind(alarm)).toThrow('Properties [\'REPEAT\'] exists but properties [\'DURATION\'] are not present.');
      });

      it('VAlarm must not pass validation (Reason: DURATION is present but REPEAT is not)', function(){
        alarm.addProperty('ACTION', 'SOME ACTION');
        alarm.addProperty('TRIGGER', '-PT10M');
        alarm.setDuration('-PT10M');
        expect(alarm.validate.bind(alarm)).toThrow('Properties [\'DURATION\'] exists but properties [\'REPEAT\'] are not present.');
      });

      it('VAlarm must not pass validation (Reason: REPEAT occurs more than once and DURATION is missing, but only no-more-than-one-REPEAT error is thrown)', function(){
        alarm.addProperty('ACTION', 'SOME ACTION');
        alarm.addProperty('TRIGGER', '-PT10M');
        alarm.setRepeat(1);
        alarm.setRepeat(1);
        expect(alarm.validate.bind(alarm)).toThrow('REPEAT property must not occur more than once.');
      });

      it('VAlarm must not pass validation (Reason: DURATION occurs more than once and REPEAT is missing, but n onlyo-more-than-one-DURATION error is thrown)', function(){
        alarm.addProperty('ACTION', 'SOME ACTION');
        alarm.addProperty('TRIGGER', '-PT10M');
        alarm.setDuration(1);
        alarm.setDuration(1);
        expect(alarm.validate.bind(alarm)).toThrow('DURATION property must not occur more than once.');
      });

      it('VAlarm must not pass validation (Reason: REPEAT occurs more than once)', function(){
        alarm.addProperty('ACTION', 'SOME ACTION');
        alarm.addProperty('TRIGGER', '-PT10M');
        alarm.setRepeat(1);
        alarm.setRepeat(1);
        alarm.setDuration('-PT10M');
        expect(alarm.validate.bind(alarm)).toThrow('REPEAT property must not occur more than once.');
      });

      it('VAlarm must not pass validation (Reason: DURATION occurs more than once)', function(){
        alarm.addProperty('ACTION', 'SOME ACTION');
        alarm.addProperty('TRIGGER', '-PT10M');
        alarm.setRepeat(1);
        alarm.setDuration('-PT10M');
        alarm.setDuration('-PT10M');
        expect(alarm.validate.bind(alarm)).toThrow('DURATION property must not occur more than once.');
      });

      it('VAlarm must not pass validation (Reason: REPEAT and DURATION occurs more only than once, but DURATION error is thrown)', function(){
        alarm.addProperty('ACTION', 'SOME ACTION');
        alarm.addProperty('TRIGGER', '-PT10M');
        alarm.setRepeat(1);
        alarm.setRepeat(1);
        alarm.setDuration('-PT10M');
        alarm.setDuration('-PT10M');
        expect(alarm.validate.bind(alarm)).toThrow('DURATION property must not occur more than once.');
      });

    });


    describe('Specific', function(){

      describe('ACTION:AUDIO', function(){

        var alarm;

        beforeEach(function(){
          var calendar = new icalendar.iCalendar();
          var event = calendar.addComponent('VEVENT');
          alarm = event.addComponent('VALARM');
          alarm.addProperty('ACTION', 'AUDIO');
          alarm.addProperty('TRIGGER', '-PT10M');
        });

        it('VAlarm must pass validation', function(){
          expect(alarm.validate.bind(alarm)).not.toThrow();
        });

        it('VAlarm must pass validation', function(){
          alarm.setAttach('ATTACH', 'uri://audio.mp3');
          expect(alarm.validate.bind(alarm)).not.toThrow();
        });

        it('VAlarm must not pass validation (Reason: ATTACH occurs more than once.)', function(){
          alarm.setAttach('ATTACH', 'uri://audio1.mp3');
          alarm.setAttach('ATTACH', 'uri://audio2.mp3');
          expect(alarm.validate.bind(alarm)).toThrow('ATTACH property must not occur more than once.');
        });

      });

      describe('ACTION:DISPLAY', function(){

        var alarm;

        beforeEach(function(){
          var calendar = new icalendar.iCalendar();
          var event = calendar.addComponent('VEVENT');
          alarm = event.addComponent('VALARM');
          alarm.addProperty('ACTION', 'DISPLAY');
          alarm.addProperty('TRIGGER', '-PT10M');
        });

        it('VAlarm must not pass validation (Reason: DESCRIPTION is missing)', function(){
          expect(alarm.validate.bind(alarm)).toThrow('DESCRIPTION property is required and must not occur more than once.');
        });

        it('VAlarm must not pass validation (Reason: DESCRIPTION occurs more than once)', function(){
          alarm.setDescription('Description text');
          alarm.setDescription('Another description text');
          expect(alarm.validate.bind(alarm)).toThrow('DESCRIPTION property is required and must not occur more than once.');
        });

        it('VAlarm must pass validation', function(){
          alarm.setDescription('Description text');
          expect(alarm.validate.bind(alarm)).not.toThrow();
        });

      });

      describe('ACTION:EMAIL', function(){

        var alarm;

        beforeEach(function(){
          var calendar = new icalendar.iCalendar();
          var event = calendar.addComponent('VEVENT');
          alarm = event.addComponent('VALARM');
          alarm.addProperty('ACTION', 'EMAIL');
          alarm.addProperty('TRIGGER', '-PT10M');
        });

        it('VAlarm must not pass validation (Reason: DESCRIPTION is required)', function(){
          expect(alarm.validate.bind(alarm)).toThrow('DESCRIPTION property is required and must not occur more than once.');
        });

        it('VAlarm must not pass validation (Reason: SUMMARY is required)', function(){
          alarm.setDescription('Description text');
          expect(alarm.validate.bind(alarm)).toThrow('SUMMARY property is required and must not occur more than once.');
        });

        it('VAlarm must not pass validation (Reason: ATTENDEE is required)', function(){
          alarm.setDescription('Description text');
          alarm.setSummary('Summary text');
          expect(alarm.validate.bind(alarm)).toThrow('ATTENDEE property is required.');
        });

        it('VAlarm must not pass validation (Reason: DESCRIPTION occurs more than once)', function(){
          alarm.setDescription('Description text');
          alarm.setDescription('Description text');
          alarm.setSummary('Summary text');
          alarm.setAttendee('attendee@test.com');
          expect(alarm.validate.bind(alarm)).toThrow('DESCRIPTION property is required and must not occur more than once.');
        });

        it('VAlarm must not pass validation (Reason: SUMMARY occurs more than once)', function(){
          alarm.setDescription('Description text');
          alarm.setSummary('Summary text');
          alarm.setSummary('Summary text');
          alarm.setAttendee('attendee@test.com');
          expect(alarm.validate.bind(alarm)).toThrow('SUMMARY property is required and must not occur more than once.');
        });

        it('VAlarm must not pass validation (Reason: DESCRIPTION and SUMMARY occurs more than once, but only no-more-than-one-DESCRIPTION error is thrown.)', function(){
          alarm.setDescription('Description text');
          alarm.setDescription('Description text');
          alarm.setSummary('Summary text');
          alarm.setSummary('Summary text');
          alarm.setAttendee('attendee@test.com');
          expect(alarm.validate.bind(alarm)).toThrow('DESCRIPTION property is required and must not occur more than once.');
        });

        it('VAlarm must pass validation', function(){
          alarm.setDescription('Description text');
          alarm.setSummary('Summary text');
          alarm.setAttendee('attendee@test.com');
          expect(alarm.validate.bind(alarm)).not.toThrow();
        });

        it('VAlarm must pass validation', function(){
          alarm.setDescription('Description text');
          alarm.setSummary('Summary text');
          alarm.setAttendee('attendee1@test.com');
          alarm.setAttendee('attendee1@test.com');
          alarm.setAttendee('attendee2@test.com');
          expect(alarm.validate.bind(alarm)).not.toThrow();
        });

        it('VAlarm must pass validation', function(){
          alarm.setDescription('Description text');
          alarm.setSummary('Summary text');
          alarm.setAttendee('attendee1@test.com');
          alarm.setAttendee('attendee1@test.com');
          alarm.setAttach('uri://audio.mp3');
          expect(alarm.validate.bind(alarm)).not.toThrow();
        });

        it('VAlarm must pass validation', function(){
          alarm.setDescription('Description text');
          alarm.setSummary('Summary text');
          alarm.setAttendee('attendee1@test.com');
          alarm.setAttendee('attendee1@test.com');
          alarm.setAttach('uri://audio1.mp3');
          alarm.setAttach('uri://audio2.mp3');
          expect(alarm.validate.bind(alarm)).not.toThrow();
        });

      });

    });

  });
});

