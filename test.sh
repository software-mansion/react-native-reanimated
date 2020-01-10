#!/bin/bash
echo "pid from script - $$"
echo "parent pid - $PPID"
ps -eo 'pid ppid command'