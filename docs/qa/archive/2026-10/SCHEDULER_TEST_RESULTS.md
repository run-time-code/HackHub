\# HackHub – Scheduler and Reminder Test Results



\*\*Work Area:\*\* WA9 – QA  

\*\*Owner:\*\* Deva Kanchana  

\*\*Week:\*\* 3  

\*\*Task:\*\* W3.T2 – Scheduler, Timezone, Duplicate-Send and Email Validation  

\*\*Test File:\*\* `apps/api/test/calendar-reminders-saved.test.js`  

\*\*Implementation:\*\* `apps/api/src/services/reminderScheduler.js`



\## 1. Test Environment



| Item | Details |

|---|---|

| Backend | Express / Node.js |

| Test runner | Node.js built-in test runner |

| Database | MongoDB Memory Server |

| Scheduler timezone | Asia/Kolkata (IST) |

| Reminder processing lock | 5 minutes |

| Maximum batch size | 50 reminders |

| Test environment | Local Windows environment |



\## 2. Scheduler Functionality Identified



The reminder scheduler implements the following behavior:



\- Processes active reminders whose scheduled time has arrived.

\- Uses a five-minute processing lock to reduce concurrent processing.

\- Prevents repeated delivery by checking `deliveredAt`.

\- Checks user notification-channel preferences.

\- Postpones reminders during configured quiet hours.

\- Records failed delivery attempts using `lastError`.

\- Continues processing other reminders when an individual reminder fails.

\- Processes reminders in batches, with a default limit of 50.



\## 3. Scheduler Test Execution



An additional automated test was introduced:



\*\*Test:\*\* `postpones reminders until the exact end of overnight IST quiet hours`



The test verifies that a reminder due at 23:30 IST is postponed until 08:00 IST the following day.



| Validation | Expected Result | Actual Result |

|---|---|---|

| Reminder falls within quiet hours | Postpone reminder | PASS |

| Rescheduled reminder time | 08:00 IST next day | PASS |

| Delivery timestamp | Remains empty | PASS |

| Processing lock | Released | PASS |

| Notification creation | No notification created | PASS |



The expected rescheduled UTC timestamp was `2031-01-02T02:30:00.000Z`, equivalent to 08:00 IST.



\## 4. Existing Scheduler and Reminder Coverage



| Test scenario | Result |

|---|---|

| Reminder creation and persistence | PASS |

| Duplicate reminder creation rejection (HTTP 409) | PASS |

| Successful reminder delivery | PASS |

| Prevention of repeated delivery | PASS |

| IST quiet-hours detection | PASS |

| Overnight quiet-hours handling | PASS |

| Exact quiet-hours-end rescheduling | PASS |

| Failed reminder handling | PASS |

| Continuation after an individual reminder failure | PASS |

| Reminder preference channel validation | PASS |

| Invalid quiet-hours input rejection | PASS |



\## 5. Automated Regression Execution



\*\*Command executed:\*\*



`npm test --workspace @hackhub/api -- --test-name-pattern="calendar, reminders, saved hackathons and account settings"`



The execution output shows that all API test suites ran.



| Metric | Result |

|---|---:|

| Test suites | 17 |

| Tests executed | 98 |

| Tests passed | 98 |

| Tests failed | 0 |

| Tests cancelled | 0 |

| Tests skipped | 0 |

| Tests marked todo | 0 |

| Total duration | Approximately 23.44 seconds |

| Overall result | PASS |



The additional quiet-hours test increased the backend test count from 97 to 98.



\## 6. Timezone and Daylight-Saving Validation



The scheduler uses `Asia/Kolkata` and a fixed UTC offset of UTC+05:30.



India does not currently observe daylight-saving time. Therefore, the scheduler's fixed-offset approach is consistent with its configured IST use case.



However, DST transitions in other timezones have not been tested. The implementation should not be considered DST-compatible for arbitrary timezone configurations.



\## 7. Email Notification Validation



The notification service uses best-effort email delivery through the configured Resend integration.



Email delivery requires both:



\- `RESEND\_API\_KEY`

\- `EMAIL\_FROM`



When these values are unavailable, email delivery is skipped. Provider errors are logged without failing the notification operation.



\*\*Status:\*\*



| Validation | Status |

|---|---|

| Notification creation during reminder delivery | PASS |

| Email configuration requirements identified | VERIFIED |

| Actual Resend provider invocation | NOT VERIFIED |

| Email receipt in a real inbox | NOT VERIFIED |

| Provider outage and retry behavior | NOT VERIFIED |



The automated test results do not establish successful external email delivery.



\## 8. Observations and Limitations



\- The scheduler has a five-minute processing lock.

\- Failed reminders retain error information and a processing lock.

\- The newly added test confirms exact quiet-hours rescheduling.

\- Duplicate reminder creation is rejected by the API.

\- Some non-fatal audit-log messages about closed database connections appeared during the broader regression run. They did not cause test failures.

\- Real email delivery and external provider behavior require separate integration validation.



\## 9. Evidence



The execution evidence is available in the terminal output from the API test run.



Recommended evidence file:



`docs/qa/WEEK\_3/scheduler-test-output.txt`



Recommended report location:



`docs/qa/WEEK\_3/SCHEDULER\_TEST\_RESULTS.md`



\## 10. Conclusion



The Week 3 scheduler validation completed successfully. The backend regression run passed all 98 tests across 17 suites, including the newly added test for exact overnight IST quiet-hours rescheduling.



Reminder persistence, duplicate prevention, delivery tracking, quiet-hours handling and failure isolation are covered by automated tests.



External email delivery and DST behavior outside the configured IST timezone remain unverified.



\*\*Overall scheduler automated test status: PASS\*\*  

\*\*External email delivery status: NOT VERIFIED\*\*  

\*\*Week 3 scheduler validation: COMPLETED WITH LIMITATIONS\*\*

