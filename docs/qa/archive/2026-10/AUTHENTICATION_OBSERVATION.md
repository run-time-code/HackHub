

\# Bug Observation – Authentication Session Handling



\*\*Project:\*\* HackHub  

\*\*Work Area:\*\* WA9 – QA  

\*\*Date:\*\* 31 October 2026  

\*\*Environment:\*\* Local Development  

\*\*Module:\*\* Authentication / Session Management



\## Observation ID: AUTH-OBS-001



\*\*Title:\*\* Authentication endpoints return HTTP 401 during initial frontend loading.



\*\*Steps to Reproduce:\*\*

1\. Start the HackHub backend.

2\. Start the frontend.

3\. Open `http://localhost:5173/auth?panel=register`.

4\. Open browser Developer Tools.

5\. Inspect the Network and Console tabs.

6\. Observe requests to `/api/users/me` and `/api/auth/refresh`.



\*\*Actual Result:\*\*

\- `/api/users/me` returns HTTP 401.

\- `/api/auth/refresh` returns HTTP 401.

\- Browser console displays failed resource messages.



\*\*Expected Result:\*\*

\- An unauthenticated user should be handled gracefully.

\- The application should redirect to or display the login/registration interface.

\- A valid authenticated session should be restored when a valid refresh token exists.



\*\*Initial Classification:\*\* Authentication/session behaviour – requires investigation.



\*\*Severity:\*\* Not assigned pending reproduction after successful login.



\*\*Status:\*\* OPEN – INVESTIGATION REQUIRED.



\*\*Evidence:\*\* Browser console output captured on 31 October 2026.



