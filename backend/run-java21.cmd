@echo off
setlocal
set "JAVA_HOME=C:\Users\L24Y08W10\.jdk\jdk-21.0.8"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo Using JAVA_HOME=%JAVA_HOME%
java -version
mvn -version
mvn spring-boot:run
