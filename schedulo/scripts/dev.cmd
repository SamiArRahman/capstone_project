@echo off
set ROOT=%~dp0..

start "Schedulo Server" cmd /k "cd /d \"%ROOT%\" && npm --workspace server run dev"
start "Schedulo Client" cmd /k "cd /d \"%ROOT%\" && npm --workspace client start"

echo Started Schedulo server and client in separate windows.
