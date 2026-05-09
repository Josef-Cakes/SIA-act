#!/usr/bin/env bash
set -euo pipefail

export JAVA_HOME="/c/Users/L24Y08W10/.jdk/jdk-21.0.8"
export PATH="$JAVA_HOME/bin:$PATH"

echo "Using JAVA_HOME=$JAVA_HOME"
java -version
mvn -version
mvn spring-boot:run
