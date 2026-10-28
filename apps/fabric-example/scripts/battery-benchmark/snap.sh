# device-side snapshot: prints sections for the host to parse
P=$(pidof com.fabricexample)
echo "### uptime"; cat /proc/uptime
echo "### stat"; head -1 /proc/stat
echo "### app $P"
for t in /proc/$P/task/*; do cat $t/stat 2>/dev/null; echo; done
for name in surfaceflinger system_server; do
  for p in $(pidof $name); do echo "### proc $name"; cat /proc/$p/stat; echo; done
done
for p in $(ps -A -o PID,NAME | grep -i composer | awk '{print $1}'); do echo "### proc composer"; cat /proc/$p/stat; echo; done
echo "### end"
