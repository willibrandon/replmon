#!/usr/bin/env bash
#
# generate-lag.sh - Generate replication lag for testing
#
# Usage:
#   ./scripts/generate-lag.sh [OPTIONS]
#
# Options:
#   -p, --port PORT       PostgreSQL port (default: 28818)
#   -t, --table TABLE     Table to write to (required, or use --list-tables)
#   -r, --rows ROWS       Number of rows to insert per batch (default: 1000)
#   -b, --batches NUM     Number of batches (default: 10)
#   -d, --delay SECONDS   Delay between batches in seconds (default: 0.5)
#   -h, --host HOST       PostgreSQL host (default: localhost)
#   -D, --database DB     Database name (default: postgres)
#   -l, --list-tables     List tables in pglogical replication sets
#   -s, --sustained       Run continuously until interrupted
#   --help                Show this help message
#
# Examples:
#   # List available tables
#   ./scripts/generate-lag.sh --list-tables
#
#   # Generate lag on port 28818 with 10 batches of 1000 rows
#   ./scripts/generate-lag.sh -p 28818 -t my_table -r 1000 -b 10
#
#   # Sustained lag generation on port 5432
#   ./scripts/generate-lag.sh -p 5432 -t my_table --sustained
#

set -euo pipefail

# Defaults
HOST="localhost"
PORT="28818"
DATABASE="postgres"
TABLE=""
ROWS=1000
BATCHES=10
DELAY=0.5
LIST_TABLES=false
SUSTAINED=false

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

usage() {
    sed -n '3,/^$/p' "$0" | sed 's/^# //' | sed 's/^#//'
    exit 0
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--port)
            PORT="$2"
            shift 2
            ;;
        -t|--table)
            TABLE="$2"
            shift 2
            ;;
        -r|--rows)
            ROWS="$2"
            shift 2
            ;;
        -b|--batches)
            BATCHES="$2"
            shift 2
            ;;
        -d|--delay)
            DELAY="$2"
            shift 2
            ;;
        -h|--host)
            HOST="$2"
            shift 2
            ;;
        -D|--database)
            DATABASE="$2"
            shift 2
            ;;
        -l|--list-tables)
            LIST_TABLES=true
            shift
            ;;
        -s|--sustained)
            SUSTAINED=true
            shift
            ;;
        --help)
            usage
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            ;;
    esac
done

PSQL_OPTS="-h $HOST -p $PORT -d $DATABASE -t -A"

# Test connection
if ! psql $PSQL_OPTS -c "SELECT 1" > /dev/null 2>&1; then
    log_error "Cannot connect to PostgreSQL at $HOST:$PORT/$DATABASE"
    exit 1
fi

# List tables in pglogical replication sets
list_replicated_tables() {
    log_info "Tables in pglogical replication sets on $HOST:$PORT:"
    echo ""

    # Check if pglogical is installed
    HAS_PGLOGICAL=$(psql $PSQL_OPTS -c "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pglogical')")

    if [[ "$HAS_PGLOGICAL" == "t" ]]; then
        # Get tables from pglogical replication sets
        psql $PSQL_OPTS -c "
            SELECT DISTINCT
                rs.set_name AS replication_set,
                n.nspname || '.' || c.relname AS table_name
            FROM pglogical.replication_set rs
            JOIN pglogical.replication_set_table rst ON rs.set_id = rst.set_id
            JOIN pg_class c ON rst.set_reloid = c.oid
            JOIN pg_namespace n ON c.relnamespace = n.oid
            ORDER BY rs.set_name, table_name
        " | while IFS='|' read -r set_name table_name; do
            if [[ -n "$table_name" ]]; then
                echo "  [$set_name] $table_name"
            fi
        done
    else
        log_warn "pglogical not installed, listing all user tables:"
        psql $PSQL_OPTS -c "
            SELECT n.nspname || '.' || c.relname
            FROM pg_class c
            JOIN pg_namespace n ON c.relnamespace = n.oid
            WHERE c.relkind = 'r'
              AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pglogical')
            ORDER BY 1
        " | while read -r table_name; do
            if [[ -n "$table_name" ]]; then
                echo "  $table_name"
            fi
        done
    fi
    echo ""
}

# Get table columns for dynamic insert
get_table_columns() {
    local tbl="$1"
    local schema_name table_name

    if [[ "$tbl" == *.* ]]; then
        schema_name="${tbl%%.*}"
        table_name="${tbl#*.}"
    else
        schema_name="public"
        table_name="$tbl"
    fi

    psql $PSQL_OPTS -c "
        SELECT column_name, data_type, is_nullable,
               COALESCE(column_default, '') as column_default
        FROM information_schema.columns
        WHERE table_schema = '$schema_name'
          AND table_name = '$table_name'
        ORDER BY ordinal_position
    "
}

# Generate insert statement based on table structure
generate_insert_sql() {
    local tbl="$1"
    local num_rows="$2"
    local schema_name table_name

    if [[ "$tbl" == *.* ]]; then
        schema_name="${tbl%%.*}"
        table_name="${tbl#*.}"
    else
        schema_name="public"
        table_name="$tbl"
    fi

    # Get columns that can be inserted (exclude generated/serial with no override needed)
    local columns_info
    columns_info=$(psql $PSQL_OPTS -c "
        SELECT
            c.column_name,
            c.data_type,
            c.is_nullable,
            COALESCE(c.column_default, '') as col_default,
            CASE
                WHEN c.column_default LIKE 'nextval%' THEN true
                ELSE false
            END as is_serial
        FROM information_schema.columns c
        WHERE c.table_schema = '$schema_name'
          AND c.table_name = '$table_name'
          AND c.is_generated = 'NEVER'
        ORDER BY c.ordinal_position
    ")

    if [[ -z "$columns_info" ]]; then
        log_error "Table $tbl not found or has no insertable columns"
        exit 1
    fi

    # Build column list and value generators
    local insert_cols=""
    local value_exprs=""
    local first=true

    while IFS='|' read -r col_name data_type is_nullable col_default is_serial; do
        [[ -z "$col_name" ]] && continue

        # Skip serial/identity columns - they auto-generate
        if [[ "$is_serial" == "t" ]]; then
            continue
        fi

        if [[ "$first" == "true" ]]; then
            first=false
        else
            insert_cols="$insert_cols, "
            value_exprs="$value_exprs, "
        fi

        insert_cols="$insert_cols$col_name"

        # Generate appropriate value based on type
        case "$data_type" in
            integer|bigint|smallint)
                value_exprs="${value_exprs}(random() * 1000000)::${data_type}"
                ;;
            numeric|decimal|real|"double precision")
                value_exprs="${value_exprs}(random() * 1000000)::${data_type}"
                ;;
            text|"character varying"|varchar|char|character)
                value_exprs="${value_exprs}'lag_test_' || md5(random()::text) || '_' || now()::text"
                ;;
            boolean)
                value_exprs="${value_exprs}(random() > 0.5)"
                ;;
            timestamp*|date)
                value_exprs="${value_exprs}now() - (random() * interval '30 days')"
                ;;
            time*)
                value_exprs="${value_exprs}now()::time"
                ;;
            uuid)
                value_exprs="${value_exprs}gen_random_uuid()"
                ;;
            json|jsonb)
                value_exprs="${value_exprs}jsonb_build_object('test', random(), 'ts', now())"
                ;;
            bytea)
                value_exprs="${value_exprs}decode(md5(random()::text), 'hex')"
                ;;
            inet)
                value_exprs="${value_exprs}('192.168.' || (random()*255)::int || '.' || (random()*255)::int)::inet"
                ;;
            *)
                # Default: try text
                value_exprs="${value_exprs}'lag_test_' || md5(random()::text)"
                ;;
        esac
    done <<< "$columns_info"

    if [[ -z "$insert_cols" ]]; then
        log_error "No insertable columns found in $tbl"
        exit 1
    fi

    # Generate the INSERT statement
    echo "INSERT INTO ${schema_name}.${table_name} ($insert_cols) SELECT $value_exprs FROM generate_series(1, $num_rows)"
}

# Main: List tables mode
if [[ "$LIST_TABLES" == "true" ]]; then
    list_replicated_tables
    exit 0
fi

# Require table parameter
if [[ -z "$TABLE" ]]; then
    log_error "Table parameter required. Use -t/--table or --list-tables to see available tables."
    exit 1
fi

# Verify table exists
TABLE_EXISTS=$(psql $PSQL_OPTS -c "
    SELECT EXISTS(
        SELECT 1 FROM information_schema.tables
        WHERE table_schema || '.' || table_name = '$TABLE'
           OR (table_schema = 'public' AND table_name = '$TABLE')
    )
")

if [[ "$TABLE_EXISTS" != "t" ]]; then
    log_error "Table '$TABLE' does not exist"
    exit 1
fi

# Generate the insert SQL
INSERT_SQL=$(generate_insert_sql "$TABLE" "$ROWS")

log_info "Configuration:"
echo "  Host:     $HOST"
echo "  Port:     $PORT"
echo "  Database: $DATABASE"
echo "  Table:    $TABLE"
echo "  Rows/batch: $ROWS"
echo "  Batches:  $BATCHES"
echo "  Delay:    ${DELAY}s"
echo "  Mode:     $(if [[ "$SUSTAINED" == "true" ]]; then echo "sustained (Ctrl+C to stop)"; else echo "fixed batches"; fi)"
echo ""

log_info "Insert SQL: $INSERT_SQL"
echo ""

# Trap for clean exit
cleanup() {
    echo ""
    log_info "Stopping lag generation..."
    exit 0
}
trap cleanup SIGINT SIGTERM

# Run batches
batch_num=0
total_rows=0

run_batch() {
    local start_time end_time duration rows_affected
    start_time=$(date +%s.%N)

    result=$(psql $PSQL_OPTS -c "$INSERT_SQL" 2>&1)
    rows_affected=$(echo "$result" | sed -n 's/INSERT 0 \([0-9]*\)/\1/p' || echo "$ROWS")
    [[ -z "$rows_affected" ]] && rows_affected="$ROWS"

    end_time=$(date +%s.%N)
    duration=$(echo "$end_time - $start_time" | bc)

    ((batch_num++)) || true
    ((total_rows += rows_affected)) || true

    log_success "Batch $batch_num: inserted $rows_affected rows in ${duration}s (total: $total_rows rows)"
}

if [[ "$SUSTAINED" == "true" ]]; then
    log_info "Starting sustained lag generation (Ctrl+C to stop)..."
    while true; do
        run_batch
        sleep "$DELAY"
    done
else
    log_info "Starting lag generation ($BATCHES batches)..."
    for ((i=1; i<=BATCHES; i++)); do
        run_batch
        if [[ $i -lt $BATCHES ]]; then
            sleep "$DELAY"
        fi
    done
fi

echo ""
log_success "Lag generation complete. Total rows inserted: $total_rows"
