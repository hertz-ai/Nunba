@echo off
echo ========================================================
echo   Fixing Windows Sockets (Winsock 10107 Error)
echo ========================================================
echo.
echo Resetting Winsock catalog...
netsh winsock reset
echo.
echo Resetting TCP/IPv4 and IPv6 stack...
netsh int ip reset
echo.
echo Starting Network Location Awareness service...
net start nlasvc
echo.
echo ========================================================
echo   Winsock catalog and IP stack reset completed!
echo   Please RESTART your computer to finalize the fix.
echo ========================================================
pause
