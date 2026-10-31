
# ============================================================
# HACKHUB - WORK AREA 9
# COMPLETE API TEST SUITE (TC-01 TO TC-12)
# ============================================================
# Requirements:
# - HackHub API running at http://localhost:5000
# - Dedicated, verified QA user account
# - Dedicated second QA user account for team tests
# - Dedicated admin QA account
# - Valid hackathon MongoDB ID
#
# Safety:
# - Does not register accounts.
# - Does not delete existing accounts.
# - Does not intentionally modify existing teams.
# - Removes only records created by this test run.
# - Some tests may be BLOCKED if required data is unavailable.
# ============================================================

$ErrorActionPreference = "Stop"

$BaseUrl = "http://localhost:5000"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$CsvFile = "WA9_API_Test_Results-$Timestamp.csv"

$Results = [System.Collections.Generic.List[object]]::new()

$UserA = $null
$UserB = $null
$Admin = $null

$HackathonId = ""
$CreatedSavedId = ""
$CreatedReminderId = ""
$CreatedTeamId = ""
$CreatedJoinRequestId = ""

$Script:UserASession = $null
$Script:UserBSession = $null
$Script:AdminSession = $null

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " HACKHUB WA9 API TEST SUITE" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "API: $BaseUrl"
Write-Host "Time: $(Get-Date)"
Write-Host ""

# ------------------------------------------------------------
# INPUTS
# ------------------------------------------------------------

Write-Host "Enter dedicated QA account credentials." -ForegroundColor Yellow
Write-Host "Do not use your personal production account."
Write-Host ""

$UserAEmail = Read-Host "QA User A email"
$UserAPasswordSecure = Read-Host "QA User A password" -AsSecureString
$UserAPassword = [System.Net.NetworkCredential]::new("", $UserAPasswordSecure).Password

$UserBEmail = Read-Host "QA User B email"
$UserBPasswordSecure = Read-Host "QA User B password" -AsSecureString
$UserBPassword = [System.Net.NetworkCredential]::new("", $UserBPasswordSecure).Password

$AdminEmail = Read-Host "QA Admin email"
$AdminPasswordSecure = Read-Host "QA Admin password" -AsSecureString
$AdminPassword = [System.Net.NetworkCredential]::new("", $AdminPasswordSecure).Password

$HackathonId = Read-Host "Valid hackathon MongoDB ID for QA"

Write-Host ""
Write-Host "Credentials will be used only in this script execution." -ForegroundColor Yellow
Write-Host "They will not be written to the CSV." -ForegroundColor Yellow
Write-Host ""

# ------------------------------------------------------------
# HELPER: RECORD RESULT
# ------------------------------------------------------------

function Add-Result {
    param(
        [string]$Id,
        [string]$Name,
        [string]$Status,
        [string]$Expected,
        [string]$Actual,
        [string]$Notes = ""
    )

    $Results.Add([PSCustomObject]@{
        TestCase = $Id
        TestName = $Name
        Status   = $Status
        Expected = $Expected
        Actual   = $Actual
        Notes    = $Notes
    })

    $color = switch ($Status) {
        "PASS"    { "Green" }
        "FAIL"    { "Red" }
        "REVIEW"  { "Yellow" }
        "BLOCKED" { "DarkYellow" }
        "NOT RUN" { "Gray" }
        default   { "White" }
    }

    Write-Host "$Id | $Name | $Status" -ForegroundColor $color
}

# ------------------------------------------------------------
# HELPER: HTTP REQUEST
# ------------------------------------------------------------

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Path,
        [object]$Body = $null,
        [object]$Session = $null,
        [string]$CsrfToken = ""
    )

    $headers = @{}

    if ($CsrfToken) {
        $headers["x-csrf-token"] = $CsrfToken
    }

    $params = @{
        Uri         = "$BaseUrl$Path"
        Method      = $Method
        Headers     = $headers
        ErrorAction = "Stop"
    }

    if ($Session) {
        $params["WebSession"] = $Session
    }

    if ($null -ne $Body) {
        $params["ContentType"] = "application/json"
        $params["Body"] = $Body | ConvertTo-Json -Depth 15
    }

    try {
        $response = Invoke-WebRequest -UseBasicParsing @params

        return @{
            StatusCode = [int]$response.StatusCode
            Body       = [string]$response.Content
        }
    }
    catch {
        $code = 0
        $bodyText = ""

        if ($_.Exception.Response) {
            try {
                $code = [int]$_.Exception.Response.StatusCode
            } catch {}

            try {
                if ($_.Exception.Response.Content) {
                    $bodyText = $_.Exception.Response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
                }
                elseif ($_.Exception.Response.GetResponseStream()) {
                    $stream = $_.Exception.Response.GetResponseStream()
                    $reader = New-Object System.IO.StreamReader($stream)
                    $bodyText = $reader.ReadToEnd()
                    $reader.Dispose()
                }
            } catch {}
        }

        if (-not $bodyText -and $_.ErrorDetails.Message) {
            $bodyText = $_.ErrorDetails.Message
        }

        return @{
            StatusCode = $code
            Body       = [string]$bodyText
        }
    }
}

# ------------------------------------------------------------
# HELPER: JSON PARSING
# ------------------------------------------------------------

function Convert-ResponseJson {
    param([string]$Body)

    if ([string]::IsNullOrWhiteSpace($Body)) {
        return $null
    }

    try {
        return $Body | ConvertFrom-Json -ErrorAction Stop
    }
    catch {
        return $null
    }
}

function Get-ResponseData {
    param([object]$Json)

    if ($null -eq $Json) {
        return $null
    }

    if ($Json.data) {
        return $Json.data
    }

    if ($Json.user) {
        return $Json.user
    }

    return $Json
}

function Get-ObjectId {
    param([object]$Object)

    if ($null -eq $Object) {
        return ""
    }

    foreach ($property in @("_id", "id", "savedHackathonId", "reminderId", "teamId", "requestId")) {
        if ($Object.PSObject.Properties.Name -contains $property) {
            $value = [string]$Object.$property
            if ($value) {
                return $value
            }
        }
    }

    return ""
}

function Get-FirstArrayItem {
    param([object]$Object)

    if ($null -eq $Object) {
        return $null
    }

    if ($Object -is [array] -and $Object.Count -gt 0) {
        return $Object[0]
    }

    foreach ($property in @("data", "items", "results", "savedHackathons", "reminders", "teams", "requests", "notifications")) {
        if ($Object.PSObject.Properties.Name -contains $property) {
            $value = $Object.$property

            if ($value -is [array] -and $value.Count -gt 0) {
                return $value[0]
            }
        }
    }

    return $null
}

# ------------------------------------------------------------
# HELPER: CSRF + LOGIN
# ------------------------------------------------------------

function Connect-QAAccount {
    param(
        [string]$Email,
        [string]$Password
    )

    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

    # Step 1: Obtain CSRF token
    $tokenResponse = Invoke-Api `
        -Method "GET" `
        -Path "/api/auth/csrf-token" `
        -Session $session

    if ($tokenResponse.StatusCode -ne 200) {
        return @{
            Success = $false
            Session = $session
            Token = ""
            Message = "CSRF bootstrap failed: HTTP $($tokenResponse.StatusCode)"
        }
    }

    $tokenJson = Convert-ResponseJson $tokenResponse.Body
    $token = [string]$tokenJson.csrfToken

    if ([string]::IsNullOrWhiteSpace($token)) {
        return @{
            Success = $false
            Session = $session
            Token = ""
            Message = "CSRF token missing from response"
        }
    }

    # Step 2: Attempt login
    $loginBody = @{
        email = $Email
        password = $Password
    }

    $loginResponse = Invoke-Api `
        -Method "POST" `
        -Path "/api/auth/login" `
        -Body $loginBody `
        -Session $session `
        -CsrfToken $token

    if ($loginResponse.StatusCode -ne 200) {
        $errorMessage = "No response details returned."

        $errorJson = Convert-ResponseJson $loginResponse.Body

        if ($errorJson) {
            if ($errorJson.message) {
                $errorMessage = [string]$errorJson.message
            }
            elseif ($errorJson.error) {
                $errorMessage = [string]$errorJson.error
            }
        }
        elseif (-not [string]::IsNullOrWhiteSpace($loginResponse.Body)) {
            $errorMessage = $loginResponse.Body
        }

        return @{
            Success = $false
            Session = $session
            Token = $token
            Message = "Login failed: HTTP $($loginResponse.StatusCode). $errorMessage"
        }
    }

    return @{
        Success = $true
        Session = $session
        Token = $token
        Message = "Login successful"
    }
}
    
    
# ------------------------------------------------------------
# HELPER: STATUS ASSERTION
# ------------------------------------------------------------

function Test-StatusCode {
    param(
        [int]$Actual,
        [int[]]$Expected
    )

    if ($Actual -eq 429) {
        return "BLOCKED"
    }

    if ($Expected -contains $Actual) {
        return "PASS"
    }

    return "FAIL"
}

# ------------------------------------------------------------
# TC-01: API HEALTH
# ------------------------------------------------------------

$r = Invoke-Api -Method "GET" -Path "/api/health"
$s = Test-StatusCode $r.StatusCode @(200)

Add-Result "TC-01" "API health check" $s "HTTP 200" "HTTP $($r.StatusCode)" $r.Body

# ------------------------------------------------------------
# TC-02: CSRF TOKEN
# ------------------------------------------------------------

$publicSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$r = Invoke-Api -Method "GET" -Path "/api/auth/csrf-token" -Session $publicSession
$j = Convert-ResponseJson $r.Body

if ($r.StatusCode -eq 429) {
    $s = "BLOCKED"
}
elseif ($r.StatusCode -eq 200 -and $j.csrfToken) {
    $s = "PASS"
}
else {
    $s = "FAIL"
}

Add-Result "TC-02" "CSRF token bootstrap" $s "HTTP 200 and token returned" "HTTP $($r.StatusCode)" $r.Body

# ------------------------------------------------------------
# TC-03: INVALID EMAIL REGISTRATION
# ------------------------------------------------------------

$invalidRegistration = @{
    name = "WA9 QA Invalid Email"
    email = "invalid-email-format"
    password = "TestPassword@123"
}

$r = Invoke-Api -Method "POST" -Path "/api/auth/register" -Body $invalidRegistration
$containsEmailError = $r.Body -match "(?i)invalid email|valid email|email.*invalid|email.*valid"

if ($r.StatusCode -eq 429) {
    $s = "BLOCKED"
    $notes = "Registration rate limit reached. Validation not tested."
}
elseif ($r.StatusCode -eq 400 -and $containsEmailError) {
    $s = "PASS"
    $notes = "Invalid email rejected."
}
elseif ($r.StatusCode -eq 400) {
    $s = "REVIEW"
    $notes = "HTTP 400 returned; inspect actual validation message."
}
else {
    $s = "FAIL"
    $notes = $r.Body
}

Add-Result "TC-03" "Registration rejects invalid email" $s "HTTP 400 with email validation error" "HTTP $($r.StatusCode)" $notes

# ------------------------------------------------------------
# TC-04: CSRF PROTECTION
# ------------------------------------------------------------

$r = Invoke-Api `
    -Method "POST" `
    -Path "/api/auth/login" `
    -Body @{ email = "qa-invalid-user@example.invalid"; password = "WrongPassword@123" }

if ($r.StatusCode -eq 429) {
    $s = "BLOCKED"
    $notes = "Login rate limit reached."
}
elseif ($r.StatusCode -eq 403) {
    $s = "PASS"
    $notes = "Missing CSRF token rejected."
}
else {
    $s = "FAIL"
    $notes = $r.Body
}

Add-Result "TC-04" "Mutation rejected without CSRF" $s "HTTP 403" "HTTP $($r.StatusCode)" $notes

# ------------------------------------------------------------
# TC-05: INVALID LOGIN
# ------------------------------------------------------------

$loginSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$tokenResponse = Invoke-Api -Method "GET" -Path "/api/auth/csrf-token" -Session $loginSession
$tokenJson = Convert-ResponseJson $tokenResponse.Body
$loginCsrf = [string]$tokenJson.csrfToken

$r = Invoke-Api `
    -Method "POST" `
    -Path "/api/auth/login" `
    -Body @{ email = "qa-invalid-user@example.invalid"; password = "WrongPassword@123" } `
    -Session $loginSession `
    -CsrfToken $loginCsrf

if ($r.StatusCode -eq 429) {
    $s = "BLOCKED"
}
elseif ($r.StatusCode -in @(400, 401, 403, 404)) {
    $s = "PASS"
}
else {
    $s = "FAIL"
}

Add-Result "TC-05" "Login rejects invalid credentials" $s "Invalid credentials rejected" "HTTP $($r.StatusCode)" $r.Body

# ------------------------------------------------------------
# AUTHENTICATE QA ACCOUNTS
# ------------------------------------------------------------

Write-Host ""
Write-Host "Authenticating QA accounts..." -ForegroundColor Cyan

$Script:UserASession = Connect-QAAccount $UserAEmail $UserAPassword
$Script:UserBSession = Connect-QAAccount $UserBEmail $UserBPassword
$Script:AdminSession = Connect-QAAccount $AdminEmail $AdminPassword

$UserAReady = $Script:UserASession.Success
$UserBReady = $Script:UserBSession.Success
$AdminReady = $Script:AdminSession.Success

Write-Host "QA User A authenticated: $UserAReady"
Write-Host "QA User A result: $($Script:UserASession.Message)"

Write-Host "QA User B authenticated: $UserBReady"
Write-Host "QA User B result: $($Script:UserBSession.Message)"

Write-Host "QA Admin authenticated: $AdminReady"
Write-Host "QA Admin result: $($Script:AdminSession.Message)"

# ------------------------------------------------------------
# TC-06: PROFILE RETRIEVAL AND UPDATE
# ------------------------------------------------------------

if (-not $UserAReady) {
    Add-Result "TC-06" "Profile update and retrieval" "BLOCKED" "Authenticated profile retrieval and update" "Not executed" $Script:UserASession.Message
}
else {
    $r = Invoke-Api -Method "GET" -Path "/api/users/me" -Session $Script:UserASession.Session

    if ($r.StatusCode -ne 200) {
        $s = if ($r.StatusCode -eq 429) { "BLOCKED" } else { "FAIL" }
        Add-Result "TC-06" "Profile update and retrieval" $s "GET profile HTTP 200" "HTTP $($r.StatusCode)" $r.Body
    }
    else {
        $profileJson = Convert-ResponseJson $r.Body
        $profile = Get-ResponseData $profileJson

        $originalBio = [string]$profile.bio
        $testBio = "WA9 QA profile test $Timestamp"

        $updateBody = @{
            bio = $testBio
        }

        $updateResponse = Invoke-Api `
            -Method "PUT" `
            -Path "/api/users/me" `
            -Body $updateBody `
            -Session $Script:UserASession.Session `
            -CsrfToken $Script:UserASession.Token

        if ($updateResponse.StatusCode -eq 200) {
            $verifyResponse = Invoke-Api -Method "GET" -Path "/api/users/me" -Session $Script:UserASession.Session
            $verifyJson = Convert-ResponseJson $verifyResponse.Body
            $verifyProfile = Get-ResponseData $verifyJson

            if ($verifyResponse.StatusCode -eq 200 -and $verifyProfile.bio -eq $testBio) {
                $s = "PASS"
                $notes = "Profile updated and retrieved successfully."
            }
            else {
                $s = "FAIL"
                $notes = "Update response succeeded, but updated value was not confirmed."
            }

            # Restore original bio only when the original value was present.
            if ($null -ne $profile.bio) {
                $restore = Invoke-Api `
                    -Method "PUT" `
                    -Path "/api/users/me" `
                    -Body @{ bio = $originalBio } `
                    -Session $Script:UserASession.Session `
                    -CsrfToken $Script:UserASession.Token

                if ($restore.StatusCode -ne 200) {
                    $notes += " WARNING: Original bio restoration failed; HTTP $($restore.StatusCode)."
                }
            }
        }
        else {
            $s = if ($updateResponse.StatusCode -eq 429) { "BLOCKED" } else { "FAIL" }
            $notes = $updateResponse.Body
        }

        Add-Result "TC-06" "Profile update and retrieval" $s "Profile update and retrieval succeeds" "HTTP $($updateResponse.StatusCode)" $notes
    }
}

# ------------------------------------------------------------
# TC-07: HACKATHON SEARCH AND FILTERS
# ------------------------------------------------------------

$searchTests = @(
    @{ Name = "Hackathon listing"; Path = "/api/hackathons" },
    @{ Name = "Hackathon search"; Path = "/api/hackathons?search=AI" },
    @{ Name = "Hackathon facets"; Path = "/api/hackathons/facets" }
)

$searchFailures = @()
$searchBlocked = $false

foreach ($test in $searchTests) {
    $r = Invoke-Api -Method "GET" -Path $test.Path

    if ($r.StatusCode -eq 429) {
        $searchBlocked = $true
    }
    elseif ($r.StatusCode -ne 200) {
        $searchFailures += "$($test.Name): HTTP $($r.StatusCode)"
    }
}

if ($searchBlocked) {
    $s = "BLOCKED"
    $notes = "One or more public listing requests were rate limited."
}
elseif ($searchFailures.Count -gt 0) {
    $s = "FAIL"
    $notes = $searchFailures -join "; "
}
else {
    $s = "PASS"
    $notes = "Listing, search and facets returned HTTP 200. Result correctness requires data-level verification."
}

Add-Result "TC-07" "Hackathon search and filters" $s "Listing, search and facets return valid results" "Executed $($searchTests.Count) requests" $notes

# ------------------------------------------------------------
# TC-08: SAVED HACKATHON LIFECYCLE
# ------------------------------------------------------------

if (-not $UserAReady -or -not $HackathonId) {
    Add-Result "TC-08" "Saved hackathon lifecycle" "BLOCKED" "Save, retrieve, update and remove" "Not executed" "Requires authenticated User A and valid hackathon ID."
}
else {
    $saveResponse = Invoke-Api `
        -Method "POST" `
        -Path "/api/saved" `
        -Body @{ hackathonId = $HackathonId } `
        -Session $Script:UserASession.Session `
        -CsrfToken $Script:UserASession.Token

    $saveJson = Convert-ResponseJson $saveResponse.Body
    $saveData = Get-ResponseData $saveJson
    $CreatedSavedId = Get-ObjectId $saveData

    if ($saveResponse.StatusCode -eq 201 -and $CreatedSavedId) {
        $listResponse = Invoke-Api -Method "GET" -Path "/api/saved" -Session $Script:UserASession.Session

        $updateResponse = Invoke-Api `
            -Method "PATCH" `
            -Path "/api/saved/$CreatedSavedId" `
            -Body @{ status = "registered"; notes = "WA9 QA $Timestamp" } `
            -Session $Script:UserASession.Session `
            -CsrfToken $Script:UserASession.Token

        $deleteResponse = Invoke-Api `
            -Method "DELETE" `
            -Path "/api/saved/$CreatedSavedId" `
            -Session $Script:UserASession.Session `
            -CsrfToken $Script:UserASession.Token

        if ($listResponse.StatusCode -eq 200 -and $updateResponse.StatusCode -eq 200 -and $deleteResponse.StatusCode -eq 204) {
            $s = "PASS"
            $notes = "Create, list, update and delete returned expected status codes."
            $CreatedSavedId = ""
        }
        else {
            $s = "REVIEW"
            $notes = "Save succeeded. List HTTP $($listResponse.StatusCode); update HTTP $($updateResponse.StatusCode); delete HTTP $($deleteResponse.StatusCode)."
        }
    }
    elseif ($saveResponse.StatusCode -eq 409) {
        $s = "REVIEW"
        $notes = "The hackathon may already be saved. Existing data was not modified."
    }
    elseif ($saveResponse.StatusCode -eq 429) {
        $s = "BLOCKED"
        $notes = "Rate limited."
    }
    else {
        $s = "FAIL"
        $notes = "Save returned HTTP $($saveResponse.StatusCode): $($saveResponse.Body)"
    }

    Add-Result "TC-08" "Saved hackathon lifecycle" $s "Create, list, update and remove saved item" "HTTP $($saveResponse.StatusCode)" $notes
}

# ------------------------------------------------------------
# TC-09: REMINDER CREATION AND DUPLICATE HANDLING
# ------------------------------------------------------------

if (-not $UserAReady -or -not $HackathonId) {
    Add-Result "TC-09" "Reminder creation and duplicate handling" "BLOCKED" "Create, reject duplicate and delete reminder" "Not executed" "Requires authenticated User A and hackathon with deadline."
}
else {
    $reminderBody = @{
        hackathonId = $HackathonId
        daysBefore = 1
        channels = @("in_app")
        eventType = "deadline"
    }

    $createReminder = Invoke-Api `
        -Method "POST" `
        -Path "/api/reminders" `
        -Body $reminderBody `
        -Session $Script:UserASession.Session `
        -CsrfToken $Script:UserASession.Token

    $reminderJson = Convert-ResponseJson $createReminder.Body
    $reminderData = Get-ResponseData $reminderJson
    $CreatedReminderId = Get-ObjectId $reminderData

    if ($createReminder.StatusCode -eq 201 -and $CreatedReminderId) {
        $duplicateReminder = Invoke-Api `
            -Method "POST" `
            -Path "/api/reminders" `
            -Body $reminderBody `
            -Session $Script:UserASession.Session `
            -CsrfToken $Script:UserASession.Token

        $listReminders = Invoke-Api -Method "GET" -Path "/api/reminders" -Session $Script:UserASession.Session

        $deleteReminder = Invoke-Api `
            -Method "DELETE" `
            -Path "/api/reminders/$CreatedReminderId" `
            -Session $Script:UserASession.Session `
            -CsrfToken $Script:UserASession.Token

        if ($duplicateReminder.StatusCode -eq 409 -and $listReminders.StatusCode -eq 200 -and $deleteReminder.StatusCode -eq 204) {
            $s = "PASS"
            $notes = "Created reminder, duplicate rejected, list retrieved, and created reminder deleted."
            $CreatedReminderId = ""
        }
        else {
            $s = "REVIEW"
            $notes = "Duplicate HTTP $($duplicateReminder.StatusCode); list HTTP $($listReminders.StatusCode); delete HTTP $($deleteReminder.StatusCode)."
        }
    }
    elseif ($createReminder.StatusCode -eq 400) {
        $s = "BLOCKED"
        $notes = "Reminder requires a hackathon with a valid registration deadline. $($createReminder.Body)"
    }
    elseif ($createReminder.StatusCode -eq 429) {
        $s = "BLOCKED"
        $notes = "Rate limited."
    }
    else {
        $s = "FAIL"
        $notes = $createReminder.Body
    }

    Add-Result "TC-09" "Reminder creation and duplicate handling" $s "Reminder created once and duplicate rejected" "HTTP $($createReminder.StatusCode)" $notes
}

# ------------------------------------------------------------
# TC-10: TEAM AND MEMBERSHIP LIFECYCLE
# ------------------------------------------------------------

if (-not $UserAReady -or -not $UserBReady -or -not $HackathonId) {
    Add-Result "TC-10" "Team and membership lifecycle" "BLOCKED" "Team creation and join request lifecycle" "Not executed" "Requires two authenticated QA accounts and a valid hackathon ID."
}
else {
    # Team creation schema may vary by application validation.
    # If the API rejects the supplied fields, inspect the response
    # before modifying this payload.

    $teamBody = @{
        name = "WA9 QA Team $Timestamp"
        hackathonId = $HackathonId
        description = "Temporary WA9 API test team"
        maxMembers = 4
    }

    $createTeam = Invoke-Api `
        -Method "POST" `
        -Path "/api/teams" `
        -Body $teamBody `
        -Session $Script:UserASession.Session `
        -CsrfToken $Script:UserASession.Token

    $teamJson = Convert-ResponseJson $createTeam.Body
    $teamData = Get-ResponseData $teamJson
    $CreatedTeamId = Get-ObjectId $teamData

    if ($createTeam.StatusCode -eq 201 -and $CreatedTeamId) {
        $joinRequest = Invoke-Api `
            -Method "POST" `
            -Path "/api/teams/$CreatedTeamId/requests" `
            -Body @{ message = "WA9 QA join request" } `
            -Session $Script:UserBSession.Session `
            -CsrfToken $Script:UserBSession.Token

        $requestJson = Convert-ResponseJson $joinRequest.Body
        $requestData = Get-ResponseData $requestJson
        $CreatedJoinRequestId = Get-ObjectId $requestData

        if ($joinRequest.StatusCode -in @(200, 201) -and $CreatedJoinRequestId) {
            $acceptRequest = Invoke-Api `
                -Method "PATCH" `
                -Path "/api/team-requests/$CreatedJoinRequestId" `
                -Body @{ action = "accept" } `
                -Session $Script:UserASession.Session `
                -CsrfToken $Script:UserASession.Token

            if ($acceptRequest.StatusCode -in @(200, 201)) {
                $s = "PASS"
                $notes = "Team created, second user requested membership, and leader accepted request."
            }
            else {
                $s = "REVIEW"
                $notes = "Team and request created. Accept returned HTTP $($acceptRequest.StatusCode)."
            }
        }
        else {
            $s = "REVIEW"
            $notes = "Team created. Join request returned HTTP $($joinRequest.StatusCode): $($joinRequest.Body)"
        }

        # Cleanup only the team created by this script.
        # Team deletion may fail if membership rules require
        # the leader to remove members first.
        $deleteTeam = Invoke-Api `
            -Method "DELETE" `
            -Path "/api/teams/$CreatedTeamId" `
            -Session $Script:UserASession.Session `
            -CsrfToken $Script:UserASession.Token

        if ($deleteTeam.StatusCode -in @(200, 204)) {
            $CreatedTeamId = ""
        }
        else {
            $notes += " WARNING: Test team cleanup returned HTTP $($deleteTeam.StatusCode). Team ID: $CreatedTeamId"
        }
    }
    elseif ($createTeam.StatusCode -eq 429) {
        $s = "BLOCKED"
        $notes = "Team write rate limit reached."
    }
    else {
        $s = "FAIL"
        $notes = "Team creation returned HTTP $($createTeam.StatusCode): $($createTeam.Body)"
    }

    Add-Result "TC-10" "Team and membership lifecycle" $s "Create team, request membership and accept request" "HTTP $($createTeam.StatusCode)" $notes
}

# ------------------------------------------------------------
# TC-11: NOTIFICATION READ OPERATIONS
# ------------------------------------------------------------

if (-not $UserAReady) {
    Add-Result "TC-11" "Notification read operations" "BLOCKED" "List and mark notifications read" "Not executed" "Requires authenticated QA User A."
}
else {
    $notificationList = Invoke-Api `
        -Method "GET" `
        -Path "/api/notifications" `
        -Session $Script:UserASession.Session

    if ($notificationList.StatusCode -eq 200) {
        $notificationJson = Convert-ResponseJson $notificationList.Body
        $notificationData = Get-ResponseData $notificationJson
        $firstNotification = Get-FirstArrayItem $notificationData
        $notificationId = Get-ObjectId $firstNotification

        if ($notificationId) {
            $markOne = Invoke-Api `
                -Method "PATCH" `
                -Path "/api/notifications/$notificationId/read" `
                -Session $Script:UserASession.Session

            $markAll = Invoke-Api `
                -Method "PATCH" `
                -Path "/api/notifications/read-all" `
                -Session $Script:UserASession.Session

            if ($markOne.StatusCode -eq 200 -and $markAll.StatusCode -eq 200) {
                $s = "PASS"
                $notes = "Notification list, mark-one-read and mark-all-read requests returned HTTP 200."
            }
            else {
                $s = "REVIEW"
                $notes = "Mark one HTTP $($markOne.StatusCode); mark all HTTP $($markAll.StatusCode)."
            }
        }
        else {
            $s = "REVIEW"
            $notes = "Notification listing succeeded, but no notification ID was available to test read operations."
        }
    }
    elseif ($notificationList.StatusCode -eq 429) {
        $s = "BLOCKED"
        $notes = "Rate limited."
    }
    else {
        $s = "FAIL"
        $notes = "Notification listing returned HTTP $($notificationList.StatusCode): $($notificationList.Body)"
    }

    Add-Result "TC-11" "Notification read operations" $s "List notifications and mark read" "HTTP $($notificationList.StatusCode)" $notes
}

# ------------------------------------------------------------
# TC-12: ADMIN AUTHORIZATION
# ------------------------------------------------------------

if (-not $AdminReady -or -not $UserAReady) {
    Add-Result "TC-12" "Admin authorization" "BLOCKED" "Admin access allowed; regular user denied" "Not executed" "Requires dedicated admin and non-admin QA accounts."
}
else {
    $adminReport = Invoke-Api `
        -Method "GET" `
        -Path "/api/admin/reports" `
        -Session $Script:AdminSession.Session

    $userReport = Invoke-Api `
        -Method "GET" `
        -Path "/api/admin/reports" `
        -Session $Script:UserASession.Session

    $unauthenticatedReport = Invoke-Api `
        -Method "GET" `
        -Path "/api/admin/reports"

    if ($adminReport.StatusCode -eq 200 -and $userReport.StatusCode -eq 403 -and $unauthenticatedReport.StatusCode -in @(401, 403)) {
        $s = "PASS"
        $notes = "Admin allowed; regular and unauthenticated users denied."
    }
    elseif ($adminReport.StatusCode -eq 429 -or $userReport.StatusCode -eq 429 -or $unauthenticatedReport.StatusCode -eq 429) {
        $s = "BLOCKED"
        $notes = "One or more authorization requests were rate limited."
    }
    else {
        $s = "FAIL"
        $notes = "Admin HTTP $($adminReport.StatusCode); normal user HTTP $($userReport.StatusCode); unauthenticated HTTP $($unauthenticatedReport.StatusCode)."
    }

    Add-Result "TC-12" "Admin authorization" $s "Admin HTTP 200; normal user HTTP 403; unauthenticated HTTP 401/403" "Admin $($adminReport.StatusCode); User $($userReport.StatusCode); Anonymous $($unauthenticatedReport.StatusCode)" $notes
}

# ------------------------------------------------------------
# CLEANUP: ONLY REMAINING RECORDS CREATED BY THIS RUN
# ------------------------------------------------------------

Write-Host ""
Write-Host "Checking test data cleanup..." -ForegroundColor Cyan

if ($CreatedSavedId -and $UserAReady) {
    $cleanup = Invoke-Api -Method "DELETE" -Path "/api/saved/$CreatedSavedId" -Session $Script:UserASession.Session -CsrfToken $Script:UserASession.Token
    Write-Host "Saved record cleanup: HTTP $($cleanup.StatusCode)"
}

if ($CreatedReminderId -and $UserAReady) {
    $cleanup = Invoke-Api -Method "DELETE" -Path "/api/reminders/$CreatedReminderId" -Session $Script:UserASession.Session -CsrfToken $Script:UserASession.Token
    Write-Host "Reminder cleanup: HTTP $($cleanup.StatusCode)"
}

if ($CreatedTeamId -and $UserAReady) {
    Write-Host "WARNING: Team may require manual cleanup. Team ID: $CreatedTeamId" -ForegroundColor Yellow
}

# ------------------------------------------------------------
# SUMMARY AND CSV EVIDENCE
# ------------------------------------------------------------

$pass = @($Results | Where-Object Status -eq "PASS").Count
$fail = @($Results | Where-Object Status -eq "FAIL").Count
$review = @($Results | Where-Object Status -eq "REVIEW").Count
$blocked = @($Results | Where-Object Status -eq "BLOCKED").Count
$notRun = @($Results | Where-Object Status -eq "NOT RUN").Count

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " WA9 TEST EXECUTION SUMMARY" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

Write-Host "PASS     : $pass" -ForegroundColor Green
Write-Host "FAIL     : $fail" -ForegroundColor Red
Write-Host "REVIEW   : $review" -ForegroundColor Yellow
Write-Host "BLOCKED  : $blocked" -ForegroundColor DarkYellow
Write-Host "NOT RUN  : $notRun" -ForegroundColor Gray
Write-Host "TOTAL    : $($Results.Count)"

$Results | Export-Csv -Path $CsvFile -NoTypeInformation -Encoding UTF8

Write-Host ""
Write-Host "CSV evidence: $CsvFile" -ForegroundColor Green
Write-Host "Finished: $(Get-Date)"
Write-Host "============================================" -ForegroundColor Cyan

# Clear password variables from this script's scope.
$UserAPassword = $null
$UserBPassword = $null
$AdminPassword = $null
$UserAPasswordSecure = $null
$UserBPasswordSecure = $null
$AdminPasswordSecure = $null
