#!/bin/bash
# ── Install Bugout Monitor into Project NOMAD ──
#
# This script registers Bugout Monitor as a service in NOMAD's Command Center.
# Run this on the machine where NOMAD is installed.
#
# Prerequisites:
#   - Project NOMAD is installed and running
#   - Docker is available
#   - MySQL client available (or use docker exec)
#
# Usage:
#   chmod +x install-to-nomad.sh
#   ./install-to-nomad.sh

set -e

echo ""
echo "  ========================================"
echo "   Bugout Monitor -- NOMAD Integration"
echo "  ========================================"
echo ""

# Check if NOMAD is running
if ! docker ps --format '{{.Names}}' | grep -q 'nomad_admin'; then
    echo "  [ERROR] NOMAD Command Center (nomad_admin) is not running."
    echo "  Make sure Project NOMAD is installed and started."
    echo ""
    exit 1
fi

echo "  [OK] NOMAD Command Center detected"

# Create storage directories
echo "  Creating storage directories..."
sudo mkdir -p /opt/project-nomad/storage/bugout-monitor/data
sudo mkdir -p /opt/project-nomad/storage/bugout-monitor/logs
echo "  [OK] Storage directories created"

# Pull the image (or build locally)
NOMAD_IMAGE="ghcr.io/turfptax/bugout-monitor:latest"

echo ""
echo "  Do you want to:"
echo "    1) Pull the pre-built image from GitHub Container Registry"
echo "    2) Build the image locally from source"
echo ""
read -p "  Choose (1 or 2): " BUILD_CHOICE

if [ "$BUILD_CHOICE" = "2" ]; then
    SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
    echo "  Building from $SCRIPT_DIR ..."
    docker build -t "$NOMAD_IMAGE" "$SCRIPT_DIR"
else
    echo "  Pulling $NOMAD_IMAGE ..."
    docker pull "$NOMAD_IMAGE" || {
        echo "  [WARNING] Could not pull image. Building locally instead..."
        SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
        docker build -t "$NOMAD_IMAGE" "$SCRIPT_DIR"
    }
fi

echo "  [OK] Image ready"

# Insert service record into NOMAD's MySQL database
echo ""
echo "  Registering service in NOMAD Command Center..."

# Get MySQL credentials from NOMAD's environment
MYSQL_PASS=$(docker exec nomad_mysql printenv MYSQL_ROOT_PASSWORD 2>/dev/null || echo "nomad")

docker exec -i nomad_mysql mysql -uroot -p"$MYSQL_PASS" nomad <<'SQL'
INSERT INTO services (
    service_name, friendly_name, container_image, container_command,
    container_config, description, powered_by, icon,
    installed, installation_status, is_dependency_service,
    display_order, ui_location, metadata, source_repo,
    created_at, updated_at
) VALUES (
    'nomad_bugout_monitor',
    'Bugout Monitor',
    'ghcr.io/turfptax/bugout-monitor:latest',
    NULL,
    '{"Env":["NODE_ENV=production","PORT=8080"],"HostConfig":{"PortBindings":{"8080/tcp":[{"HostPort":"8400"}]},"Binds":["/opt/project-nomad/storage/bugout-monitor/data:/app/data","/opt/project-nomad/storage/bugout-monitor/logs:/app/monitor/logs"],"RestartPolicy":{"Name":"unless-stopped"}}}',
    'AI-powered disaster preparedness dashboard with OSINT threat monitoring, equipment tracking, and LLM integration.',
    'Bugout Monitor (Open Source)',
    'IconShieldCheck',
    0, 'idle', 0,
    50, '8400',
    '{"version":"1.0.0","github":"https://github.com/turfptax/bugout-monitor"}',
    'https://github.com/turfptax/bugout-monitor',
    NOW(), NOW()
) ON DUPLICATE KEY UPDATE
    container_image = VALUES(container_image),
    container_config = VALUES(container_config),
    description = VALUES(description),
    metadata = VALUES(metadata),
    updated_at = NOW();
SQL

if [ $? -eq 0 ]; then
    echo "  [OK] Service registered in NOMAD"
else
    echo "  [WARNING] Could not auto-register. You may need to add the service manually."
    echo "  See nomad-service.json for the service definition."
fi

echo ""
echo "  ========================================"
echo "   Installation Complete!"
echo "  ========================================"
echo ""
echo "  Next steps:"
echo "    1. Open NOMAD Command Center (http://your-ip:8080)"
echo "    2. Find 'Bugout Monitor' in the services list"
echo "    3. Click 'Install' to start the container"
echo "    4. Access Bugout Monitor at http://your-ip:8400"
echo ""
echo "  To run a threat scan:"
echo "    docker exec nomad_bugout_monitor node monitor/index.js"
echo ""
echo "  To set up API keys (optional, for AI features):"
echo "    Create /opt/project-nomad/storage/bugout-monitor/.env with:"
echo "      OPENROUTER_API_KEY=your-key"
echo "      NASA_API_KEY=your-key"
echo ""
