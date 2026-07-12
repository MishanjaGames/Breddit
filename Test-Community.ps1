<#
.SYNOPSIS
    Тест API Breddit: регистрация -> логин -> создание комьюнити -> проверки -> подписка.

.DESCRIPTION
    Аналог Postman-коллекции "Breddit — Тест создания комьюнити", но через PowerShell
    (Invoke-RestMethod), без Postman. Сервер должен быть запущен: npm run dev (порт 4000).

.EXAMPLE
    .\Test-Community.ps1

.EXAMPLE
    .\Test-Community.ps1 -BaseUrl "http://localhost:4000" -Email "me@example.com" -Password "Password123" -Nickname "my_nick"
#>

param(
    [string]$BaseUrl  = "http://localhost:4000",
    [string]$Email    = "tester1@example.com",
    [string]$Password = "Password123",
    [string]$Nickname = "tester_one"
)

$ErrorActionPreference = "Stop"

# ---------- Хелперы для вывода ----------
function Write-Step($n, $title) {
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor DarkGray
    Write-Host "[$n] $title" -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor DarkGray
}

function Write-Ok($msg) {
    Write-Host "  OK  $msg" -ForegroundColor Green
}

function Write-Fail($msg) {
    Write-Host "  FAIL  $msg" -ForegroundColor Red
}

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Path,
        $Body = $null,
        [string]$Token = $null,
        [switch]$AllowError
    )
    $uri = "$BaseUrl$Path"
    $headers = @{}
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }

    $params = @{
        Method  = $Method
        Uri     = $uri
        Headers = $headers
    }
    if ($Body -ne $null) {
        $params["Body"]        = ($Body | ConvertTo-Json -Depth 10)
        $params["ContentType"] = "application/json"
    }

    try {
        # Успешный ответ (2xx)
        $resp = Invoke-WebRequest @params -UseBasicParsing
        return [PSCustomObject]@{ StatusCode = [int]$resp.StatusCode; Content = $resp.Content }
    } catch {
        # Non-2xx ответ: и Windows PowerShell 5.1, и PowerShell 7+ бросают исключение,
        # но тело ответа всё равно можно достать из $_.Exception.Response
        $response = $_.Exception.Response
        if ($response) {
            $code = [int]$response.StatusCode

            if ($response.PSObject.Methods.Name -contains 'GetResponseStream') {
                # Windows PowerShell 5.1 (.NET Framework)
                $stream = $response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($stream)
                $text   = $reader.ReadToEnd()
                $reader.Close()
            } else {
                # PowerShell 7+ (.NET Core) — у HttpResponseMessage нет синхронного GetResponseStream
                $text = $_.ErrorDetails.Message
                if (-not $text) {
                    $task = $response.Content.ReadAsStringAsync()
                    $task.Wait()
                    $text = $task.Result
                }
            }
            return [PSCustomObject]@{ StatusCode = $code; Content = $text }
        }
        # Сетевая ошибка (сервер не запущен и т.п.) — пробрасываем дальше
        throw
    }
}

$token      = $null
$categoryId = $null
$failed     = 0

# ---------- 1. Register ----------
Write-Step 1 "Register ($Email)"
$body = @{ email = $Email; password = $Password; nickname = $Nickname }
$r = Invoke-Api -Method POST -Path "/api/auth/register" -Body $body

if ($r.StatusCode -eq 201) {
    $data  = $r.Content | ConvertFrom-Json
    $token = $data.token -replace '^Bearer\s+', ''
    Write-Ok "Пользователь создан, токен получен"
} elseif ($r.StatusCode -eq 409) {
    Write-Ok "Пользователь уже существует (это нормально при повторном запуске) -> идём в Login"
} else {
    Write-Fail "Неожиданный статус $($r.StatusCode): $($r.Content)"
    $failed++
}

# ---------- 2. Login ----------
Write-Step 2 "Login"
$body = @{ email = $Email; password = $Password }
$r = Invoke-Api -Method POST -Path "/api/auth/login" -Body $body

if ($r.StatusCode -eq 200) {
    $data  = $r.Content | ConvertFrom-Json
    $token = $data.token -replace '^Bearer\s+', ''
    Write-Ok "Токен получен: $($token.Substring(0, [Math]::Min(20,$token.Length)))..."
} else {
    Write-Fail "Login не удался, статус $($r.StatusCode): $($r.Content)"
    $failed++
    Write-Host "`nОстанавливаюсь — без токена дальше нет смысла." -ForegroundColor Yellow
    exit 1
}

# ---------- 3. Create Community ----------
Write-Step 3 "Create Community"
$communityName = "test_community_" + (Get-Random -Maximum 99999)
$body = @{
    name        = $communityName
    description = "Тестовая спильнота, созданная PowerShell-скриптом"
    icon        = $null
    banner      = $null
    status      = "public"
    tags        = @("test", "powershell")
    rules       = @(@{ title = "Будь вежливым"; body = "Никакого спама и оскорблений" })
}
$r = Invoke-Api -Method POST -Path "/api/categories" -Body $body -Token $token

if ($r.StatusCode -eq 201) {
    $data       = $r.Content | ConvertFrom-Json
    $categoryId = $data._id
    Write-Ok "Комьюнити создано: $($data.name) (id: $categoryId)"
    if ($data.subscriberCount -eq 1) { Write-Ok "subscriberCount = 1 (создатель автоматически подписан)" }
    else { Write-Fail "subscriberCount ожидался 1, получено $($data.subscriberCount)"; $failed++ }
} else {
    Write-Fail "Создание не удалось, статус $($r.StatusCode): $($r.Content)"
    $failed++
    exit 1
}

# ---------- 4. Get All Communities ----------
Write-Step 4 "Get All Communities"
$r = Invoke-Api -Method GET -Path "/api/categories" -Token $token

if ($r.StatusCode -eq 200) {
    $data    = $r.Content | ConvertFrom-Json
    $created = $data | Where-Object { $_._id -eq $categoryId }
    if ($created) {
        Write-Ok "Наше комьюнити найдено в общем списке"
        if ($created.isSubscribed -eq $true) { Write-Ok "isSubscribed = true" }
        else { Write-Fail "isSubscribed ожидался true"; $failed++ }
    } else {
        Write-Fail "Комьюнити НЕ найдено в списке"
        $failed++
    }
} else {
    Write-Fail "Статус $($r.StatusCode): $($r.Content)"
    $failed++
}

# ---------- 5. Get Community by ID ----------
Write-Step 5 "Get Community by ID"
$r = Invoke-Api -Method GET -Path "/api/categories/$categoryId" -Token $token

if ($r.StatusCode -eq 200) {
    $data = $r.Content | ConvertFrom-Json
    if ($data._id -eq $categoryId) { Write-Ok "_id совпадает" }
    else { Write-Fail "_id не совпадает"; $failed++ }
} else {
    Write-Fail "Статус $($r.StatusCode): $($r.Content)"
    $failed++
}

# ---------- 6. Subscribe again (idempotent) ----------
Write-Step 6 "Subscribe повторно (ожидаем 'уже подписан')"
$r = Invoke-Api -Method POST -Path "/api/categories/$categoryId/subscribe" -Token $token

if ($r.StatusCode -eq 200) {
    $data = $r.Content | ConvertFrom-Json
    if ($data.success -eq $true) { Write-Ok "success = true ($($data.message))" }
    else { Write-Fail "success != true"; $failed++ }
} else {
    Write-Fail "Статус $($r.StatusCode): $($r.Content)"
    $failed++
}

# ---------- Итог ----------
Write-Host ""
Write-Host "==================================================" -ForegroundColor DarkGray
if ($failed -eq 0) {
    Write-Host "ВСЕ ШАГИ ПРОШЛИ УСПЕШНО" -ForegroundColor Green
} else {
    Write-Host "ЕСТЬ ОШИБКИ: $failed" -ForegroundColor Red
}
Write-Host "==================================================" -ForegroundColor DarkGray
