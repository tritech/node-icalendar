iCalendar for Node
==================

Provides iCalendar (RFC5545) parsing as well as a convenient API for generating iCalendar data.


Generating iCalendar Files
--------------------------

You can generate a single event:

    var event = new icalendar.VEvent('cded25be-3d7a-45e2-b8fe-8d10c1f8e5a9');
    event.setSummary("Test calendar event");
    event.setDate(new Date(2011,11,1,17,0,0), new Date(2011,11,1,18,0,0));
    event.toString();


Or create a collection of events:

    var ical = new icalendar.iCalendar();
    ical.addComponent(event);

    var event2 = ical.addComponent('VEVENT');
    event2.setSummary("Second test event");
    event2.setDate(new Date(2011,11,5,12,0,0), 60*60); // Duration in seconds


Parsing iCalendar Files
-----------------------

Create a iCalendar collection from a string:

    // data is a string containing RFC5545 data
    var ical = icalendar.parse_calendar(data);

Access an array of the events defined within:

    ical.events()


Implementation Status
---------------------

Several portions of the iCalendar spec remain unimplemented:

    * HOURLY, MINUTELY, and SECONDLY recurrence are not implemented.
        - Support for these is not currently planned, as they do not
          seem to be found in actual use.
    * BYHOUR, BYMINUTE, and BYSECOND modifiers are not implement as above.
    * BYSETPOS
    * WKST
        - This could very likely become important
    * BYWEEKNO
    * BYYEARDAY

    * RDATE is not yet implemented
    * RECURRENCE-ID and multiple related VEVENTS are not currently supported

    * Documentation is pretty weak


Contact
-------

 * James Emerton <james@tri-tech.com>
