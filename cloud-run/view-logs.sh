#!/bin/bash

# Cloud Run Log Viewer Script
# This script provides various ways to view logs from the Claude Code Cloud Run service

set -e

# Configuration
SERVICE_NAME="claude-code-runner"
REGION="us-central1"
PROJECT_ID="vibe-torch"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    color=$1
    message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check if gcloud is installed
check_gcloud() {
    if ! command -v gcloud &> /dev/null; then
        print_color "$RED" "Error: gcloud CLI is not installed or not in PATH"
        print_color "$YELLOW" "Install it from: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
}

# Function to view recent logs
view_recent_logs() {
    local limit=${1:-50}
    print_color "$BLUE" "Fetching last $limit log entries..."
    
    gcloud run services logs read $SERVICE_NAME \
        --region=$REGION \
        --project=$PROJECT_ID \
        --limit=$limit \
        --format="table(timestamp.date('%Y-%m-%d %H:%M:%S'):label=TIME, severity:label=LEVEL, textPayload:label=MESSAGE:wrap)"
}

# Function to view logs with filter
view_filtered_logs() {
    local filter=$1
    local limit=${2:-50}
    print_color "$BLUE" "Fetching logs with filter: $filter"
    
    gcloud logging read "$filter" \
        --project=$PROJECT_ID \
        --limit=$limit \
        --format="table(timestamp.date('%Y-%m-%d %H:%M:%S'):label=TIME, severity:label=LEVEL, textPayload:label=MESSAGE:wrap)"
}

# Function to tail logs (follow mode)
tail_logs() {
    print_color "$GREEN" "Tailing logs (press Ctrl+C to stop)..."
    
    gcloud run services logs tail $SERVICE_NAME \
        --region=$REGION \
        --project=$PROJECT_ID
}

# Function to view logs from last N minutes
view_recent_time_logs() {
    local minutes=${1:-10}
    local timestamp=$(date -u -v-${minutes}M '+%Y-%m-%dT%H:%M:%S.000Z' 2>/dev/null || date -u -d "${minutes} minutes ago" '+%Y-%m-%dT%H:%M:%S.000Z')
    
    print_color "$BLUE" "Fetching logs from last $minutes minutes..."
    
    local filter="resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"$SERVICE_NAME\" AND timestamp>=\"$timestamp\""
    
    gcloud logging read "$filter" \
        --project=$PROJECT_ID \
        --format="table(timestamp.date('%Y-%m-%d %H:%M:%S'):label=TIME, severity:label=LEVEL, textPayload:label=MESSAGE:wrap)"
}

# Function to view error logs only
view_error_logs() {
    local limit=${1:-50}
    print_color "$RED" "Fetching error logs..."
    
    local filter="resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"$SERVICE_NAME\" AND severity>=ERROR"
    
    gcloud logging read "$filter" \
        --project=$PROJECT_ID \
        --limit=$limit \
        --format="table(timestamp.date('%Y-%m-%d %H:%M:%S'):label=TIME, severity:label=LEVEL, textPayload:label=MESSAGE:wrap)"
}

# Function to view logs for specific request
view_request_logs() {
    local trace_id=$1
    if [ -z "$trace_id" ]; then
        print_color "$RED" "Please provide a trace ID"
        exit 1
    fi
    
    print_color "$BLUE" "Fetching logs for trace: $trace_id"
    
    local filter="resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"$SERVICE_NAME\" AND trace=\"projects/$PROJECT_ID/traces/$trace_id\""
    
    gcloud logging read "$filter" \
        --project=$PROJECT_ID \
        --format="table(timestamp.date('%Y-%m-%d %H:%M:%S'):label=TIME, severity:label=LEVEL, textPayload:label=MESSAGE:wrap)"
}

# Function to export logs to file
export_logs() {
    local filename=${1:-"cloud-run-logs-$(date +%Y%m%d-%H%M%S).log"}
    local limit=${2:-100}
    
    print_color "$BLUE" "Exporting $limit log entries to $filename..."
    
    gcloud run services logs read $SERVICE_NAME \
        --region=$REGION \
        --project=$PROJECT_ID \
        --limit=$limit \
        --format=json > "$filename"
    
    print_color "$GREEN" "Logs exported to: $filename"
}

# Function to show web console URL
show_console_url() {
    local url="https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME/logs?project=$PROJECT_ID"
    print_color "$BLUE" "View logs in Google Cloud Console:"
    print_color "$GREEN" "$url"
    
    # Try to open in browser if available
    if command -v open &> /dev/null; then
        read -p "Open in browser? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            open "$url"
        fi
    fi
}

# Main menu
show_menu() {
    echo
    print_color "$GREEN" "====================================="
    print_color "$GREEN" "   Cloud Run Log Viewer"
    print_color "$GREEN" "   Service: $SERVICE_NAME"
    print_color "$GREEN" "   Region: $REGION"
    print_color "$GREEN" "====================================="
    echo
    echo "1) View recent logs (last 50 entries)"
    echo "2) View recent logs (custom limit)"
    echo "3) Tail logs (follow mode)"
    echo "4) View logs from last N minutes"
    echo "5) View error logs only"
    echo "6) View logs by trace ID"
    echo "7) Export logs to file"
    echo "8) Open in Google Cloud Console"
    echo "9) Exit"
    echo
}

# Check if gcloud is available
check_gcloud

# Parse command line arguments
if [ $# -gt 0 ]; then
    case "$1" in
        recent)
            view_recent_logs ${2:-50}
            ;;
        tail)
            tail_logs
            ;;
        time)
            view_recent_time_logs ${2:-10}
            ;;
        errors)
            view_error_logs ${2:-50}
            ;;
        trace)
            view_request_logs "$2"
            ;;
        export)
            export_logs "$2" ${3:-100}
            ;;
        console)
            show_console_url
            ;;
        *)
            print_color "$YELLOW" "Usage: $0 [recent|tail|time|errors|trace|export|console] [args...]"
            print_color "$YELLOW" ""
            print_color "$YELLOW" "Examples:"
            print_color "$YELLOW" "  $0 recent 100        # View last 100 log entries"
            print_color "$YELLOW" "  $0 tail              # Tail logs in real-time"
            print_color "$YELLOW" "  $0 time 30           # View logs from last 30 minutes"
            print_color "$YELLOW" "  $0 errors            # View error logs only"
            print_color "$YELLOW" "  $0 trace TRACE_ID    # View logs for specific trace"
            print_color "$YELLOW" "  $0 export output.log # Export logs to file"
            print_color "$YELLOW" "  $0 console           # Open in browser"
            exit 1
            ;;
    esac
else
    # Interactive menu
    while true; do
        show_menu
        read -p "Select an option: " choice
        
        case $choice in
            1)
                view_recent_logs 50
                ;;
            2)
                read -p "Enter number of log entries to fetch: " limit
                view_recent_logs $limit
                ;;
            3)
                tail_logs
                ;;
            4)
                read -p "Enter number of minutes to look back: " minutes
                view_recent_time_logs $minutes
                ;;
            5)
                view_error_logs 50
                ;;
            6)
                read -p "Enter trace ID: " trace_id
                view_request_logs "$trace_id"
                ;;
            7)
                read -p "Enter filename (or press Enter for default): " filename
                read -p "Enter number of entries to export (default 100): " limit
                export_logs "$filename" ${limit:-100}
                ;;
            8)
                show_console_url
                ;;
            9)
                print_color "$GREEN" "Goodbye!"
                exit 0
                ;;
            *)
                print_color "$RED" "Invalid option. Please try again."
                ;;
        esac
        
        echo
        read -p "Press Enter to continue..."
    done
fi