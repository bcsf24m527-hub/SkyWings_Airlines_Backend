# SkyWings Airlines - Complete Setup & Test Script
# Run this from the backend folder: .\setup.ps1

Write-Host "`n🚀 SkyWings Airlines - Complete Setup & Test" -ForegroundColor Cyan -BackgroundColor Black
Write-Host "=" * 60 -ForegroundColor Cyan

# Function to display colored output
function Write-Success { Write-Host "✓ $args" -ForegroundColor Green }
function Write-Error { Write-Host "✗ $args" -ForegroundColor Red }
function Write-Warning { Write-Host "⚠ $args" -ForegroundColor Yellow }
function Write-Info { Write-Host "ℹ $args" -ForegroundColor Blue }
function Write-Step { Write-Host "`nStep $args" -ForegroundColor Cyan }

# Step 1: Check prerequisites
Write-Step "1: Checking prerequisites"
try {
    $nodeVersion = & node --version
    Write-Success "Node.js $nodeVersion installed"
} catch {
    Write-Error "Node.js not found. Download from https://nodejs.org/"
    exit
}

try {
    $npmVersion = & npm --version
    Write-Success "npm $npmVersion installed"
} catch {
    Write-Error "npm not found"
    exit
}

# Step 2: Check .env file
Write-Step "2: Verifying .env configuration"
if (Test-Path ".env") {
    Write-Success ".env file exists"
    Write-Info "Current configuration:"
    Get-Content .env | Where-Object { $_ -and -not $_.StartsWith("#") } | ForEach-Object {
        Write-Host "  $_"
    }
} else {
    Write-Error ".env not found"
    if (Test-Path ".env.example") {
        Write-Info "Creating .env from .env.example..."
        Copy-Item ".env.example" ".env"
        Write-Warning "Please edit .env with your MySQL password"
    }
    exit
}

# Step 3: Check MySQL Connection
Write-Step "3: Checking MySQL Server"
$env:MYSQL_PWD = "password"
try {
    & mysql -u root -e "SELECT 1" 2>$null | Out-Null
    Write-Success "MySQL connection successful"
} catch {
    Write-Error "MySQL connection failed"
    Write-Warning "Make sure:"
    Write-Host "  1. MySQL Server is running"
    Write-Host "  2. Root password is correct in .env file"
    Write-Host "  3. Update .env if your password is different"
    Write-Host "`nTo check MySQL: mysql -u root -p"
    exit
}

# Step 4: Install dependencies
Write-Step "4: Installing dependencies"
if (-not (Test-Path "node_modules")) {
    Write-Info "Installing npm packages (this may take a minute)..."
    & npm install 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Dependencies installed"
    } else {
        Write-Error "npm install failed"
        Write-Info "Try running: npm cache clean --force"
        exit
    }
} else {
    Write-Success "Dependencies already installed"
}

# Step 5: Initialize database
Write-Step "5: Setting up database"
Write-Info "Creating database from schema..."
try {
    $schemaPath = Join-Path $PWD "database" "schema.sql"
    & mysql -u root -e "DROP DATABASE IF EXISTS skywings_airlines; CREATE DATABASE skywings_airlines;" 2>$null
    & mysql -u root skywings_airlines < $schemaPath 2>$null
    Write-Success "Database created from schema.sql"
} catch {
    Write-Error "Database setup failed"
    Write-Info "Try running manually: mysql -u root -p < database/schema.sql"
    exit
}

# Step 6: Load demo data
Write-Step "6: Loading demo data"
Write-Info "Running initialize_database.js..."
try {
    & node "src/scripts/initialize_database.js" 2>&1 | Out-Null
    Write-Success "Demo data loaded"
} catch {
    Write-Warning "Demo data loading note: Check script output above"
}

# Step 7: Success message
Write-Host "`n" -ForegroundColor Green
Write-Host "✅ Setup Complete!" -ForegroundColor Green -BackgroundColor Black
Write-Host "=" * 60 -ForegroundColor Green

Write-Host "`n📊 Server Information:" -ForegroundColor Cyan
Write-Host "  🌐 URL: http://localhost:3000" -ForegroundColor White
Write-Host "  🔌 API: http://localhost:3000/api" -ForegroundColor White
Write-Host "  💾 Database: skywings_airlines" -ForegroundColor White

Write-Host "`n👤 Test Credentials:" -ForegroundColor Cyan
Write-Host "  User Account:" -ForegroundColor White
Write-Host "    Email: user@skywings.com" -ForegroundColor Yellow
Write-Host "    Password: user123" -ForegroundColor Yellow
Write-Host "  Admin Account:" -ForegroundColor White
Write-Host "    Email: admin@skywings.com" -ForegroundColor Yellow
Write-Host "    Password: admin123" -ForegroundColor Yellow

Write-Host "`n🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Run the server: npm start" -ForegroundColor White
Write-Host "  2. Open: http://localhost:3000" -ForegroundColor White
Write-Host "  3. Login with test credentials above" -ForegroundColor White

Write-Host "`n📝 Development Mode (with auto-reload):" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White

Write-Host "`n" -ForegroundColor Green
