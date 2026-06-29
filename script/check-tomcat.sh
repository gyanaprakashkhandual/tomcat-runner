#!/usr/bin/env bash
#
# check-tomcat.sh
# Validates that a given folder looks like a real Apache Tomcat installation,
# mirroring the checks performed by src/utils/validator.ts.
#
# Usage: ./check-tomcat.sh /path/to/apache-tomcat

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <CATALINA_HOME>"
  exit 1
fi

CATALINA_HOME="$1"

fail() {
  echo "Invalid Tomcat installation: $1"
  exit 1
}

[ -d "$CATALINA_HOME" ]                      || fail "folder does not exist: $CATALINA_HOME"
[ -d "$CATALINA_HOME/bin" ]                  || fail "missing bin/ folder"
[ -f "$CATALINA_HOME/conf/server.xml" ]      || fail "missing conf/server.xml"
[ -d "$CATALINA_HOME/webapps" ]              || fail "missing webapps/ folder"

if [ -f "$CATALINA_HOME/bin/startup.sh" ] || [ -f "$CATALINA_HOME/bin/startup.bat" ]; then
  echo "Valid Tomcat installation: $CATALINA_HOME"
else
  fail "missing bin/startup.sh or bin/startup.bat"
fi