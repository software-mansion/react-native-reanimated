"""Runs BatteryBenchmarkExample scenarios on an Android phone and records
energy per power rail (Perfetto android.power, needs ODPM, e.g. Pixel 6+),
per-thread CPU time, rendered frames and temperatures.

Requires a release build of fabric-example installed on the phone and the
`perfetto` Python package (`pip install perfetto`).

usage: ANDROID_SERIAL=<serial> python bench.py OUT_JSONL COUNT SCENARIO [SCENARIO...]
"""
import json
import os
import re
import subprocess
import sys
import tempfile
import time

from perfetto.trace_processor import TraceProcessor

HERE = os.path.dirname(os.path.abspath(__file__))
TMP = tempfile.mkdtemp(prefix='battery-benchmark-')
ADB = ['adb'] + (['-s', os.environ['ANDROID_SERIAL']] if 'ANDROID_SERIAL' in os.environ else [])
PKG = 'com.fabricexample'
SETTLE_S = 8
MEASURE_S = 20
URL = 'fabricexample://Reanimated/BatteryBenchmarkExample?scenario={}&count={}'


def sh(cmd, check=True):
    return subprocess.run(ADB + ['shell', cmd], capture_output=True, text=True,
                          check=check).stdout


def parse_stat(line):
    # pid (comm) state ... ; comm can contain spaces/parens
    m = re.match(r'(\d+) \((.*)\) (.*)', line.strip())
    if not m:
        return None
    rest = m.group(3).split()
    utime, stime = int(rest[11]), int(rest[12])
    return int(m.group(1)), m.group(2), utime + stime


def snapshot():
    out = sh('sh /data/local/tmp/snap.sh')
    snap = {'threads': {}, 'procs': {}, 'app_total': None}
    section = None
    for line in out.splitlines():
        if line.startswith('### '):
            section = line[4:].split()[0]
            name = line[4:].split()[1] if len(line[4:].split()) > 1 else None
            continue
        if not line.strip():
            continue
        if section == 'uptime':
            snap['uptime'] = float(line.split()[0])
        elif section == 'stat':
            f = [int(x) for x in line.split()[1:]]
            snap['cpu_busy'] = sum(f) - f[3] - f[4]
        elif section == 'apptotal':
            r = parse_stat(line)
            if r:
                snap['app_total'] = r[2]
        elif section == 'app':
            r = parse_stat(line)
            if r:
                snap['threads'][r[0]] = (r[1], r[2])
        elif section == 'proc':
            r = parse_stat(line)
            if r:
                snap['procs'][name] = snap['procs'].get(name, 0) + r[2]
    if snap['app_total'] is None or not snap['threads']:
        raise RuntimeError(f'{PKG} is not running')
    return snap


def thread_group(comm):
    comm = re.sub(r'[-_ ]?\d+$', '', comm)
    return comm


def diff(a, b):
    groups = {}
    for tid, (comm, ticks) in b['threads'].items():
        before = a['threads'].get(tid, (comm, 0))[1]
        g = thread_group(comm)
        groups[g] = groups.get(g, 0) + (ticks - before) * 10  # ms
    procs = {k: (b['procs'].get(k, 0) - a['procs'].get(k, 0)) * 10
             for k in b['procs']}
    return {
        'wall_s': b['uptime'] - a['uptime'],
        # The process total also counts threads that exited during the window.
        'app_cpu_ms': (b['app_total'] - a['app_total']) * 10,
        'threads_ms': dict(sorted(groups.items(), key=lambda kv: -kv[1])),
        'procs_ms': procs,
        'system_cpu_ms': (b['cpu_busy'] - a['cpu_busy']) * 10,
    }


def gfx_frames():
    out = sh(f'dumpsys gfxinfo {PKG}')
    m = re.search(r'Total frames rendered: (\d+)', out)
    j = re.search(r'Janky frames: (\d+)', out)
    return int(m.group(1)) if m else -1, int(j.group(1)) if j else -1


def temps():
    full = sh('dumpsys thermalservice')
    out = full.split('Current temperatures from HAL:')[-1].split('Current cooling')[0]
    res = {}
    for name in ['soc_therm', 'BIG', 'MID', 'LITTLE', 'G3D', 'VIRTUAL-SKIN',
                 'battery']:
        m = re.search(r'mValue=([\d.]+), mType=-?\d+, mName=' + re.escape(name)
                      + r',', out)
        if m:
            res[name] = round(float(m.group(1)), 1)
    s = re.search(r'Thermal Status: (\d+)', full)
    res['status'] = int(s.group(1)) if s else -1
    return res


def rails(path):
    tp = TraceProcessor(trace=path)
    q = """
    select t.name name, min(c.ts) t0, max(c.ts) t1,
      max(c.value) - min(c.value) e
    from counter c join counter_track t on c.track_id = t.id
    where t.name like 'power.%' group by t.name
    """
    res = {}
    for r in tp.query(q):
        dur = (r.t1 - r.t0) / 1e9
        if dur > 0:
            res[r.name.replace('power.rails.', '')] = round(r.e / dur / 1000, 2)  # mW
    tp.close()
    if not res:
        raise RuntimeError(f'{path}: no power rail data, does the phone have ODPM?')
    return res


def scenario_names():
    # Keys of `SCENARIOS` in scenarios.tsx. The app silently shows the empty
    # scenario for an unknown name, so a typo would measure the baseline.
    path = os.path.join(HERE, '../../../common-app/src/apps/reanimated/'
                        'examples/BatteryBenchmark/scenarios.tsx')
    body = open(path).read().split('export const SCENARIOS')[1].split('\n};')[0]
    return set(re.findall(r"^  '?([\w-]+)'?: \{", body, re.M))


def check_scenarios(scenarios):
    unknown = sorted(set(scenarios) - scenario_names())
    if unknown:
        sys.exit(f'unknown scenarios: {", ".join(unknown)}')


def run(scenario, count):
    sh(f'am force-stop {PKG}')
    time.sleep(1)
    sh(f"am start -W -a android.intent.action.VIEW -d '{URL.format(scenario, count)}' {PKG}")
    time.sleep(SETTLE_S)
    sh(f'dumpsys gfxinfo {PKG} reset')
    t_before = temps()
    a = snapshot()
    cfg = open(os.path.join(HERE, 'trace.pbtxt')).read().replace(
        'DURATION', str(MEASURE_S * 1000))
    with open(os.path.join(TMP, 'trace_run.pbtxt'), 'w') as f:
        f.write(cfg)
    subprocess.run(ADB + ['push', os.path.join(TMP, 'trace_run.pbtxt'),
                          '/data/local/tmp/trace_run.pbtxt'],
                   capture_output=True, check=True)
    sh('cat /data/local/tmp/trace_run.pbtxt | perfetto --txt -c - -o '
       '/data/misc/perfetto-traces/bench.pftrace')
    b = snapshot()
    frames, janky = gfx_frames()
    t_after = temps()
    local = os.path.join(TMP, f'{scenario}-{count}.pftrace')
    subprocess.run(ADB + ['pull', '/data/misc/perfetto-traces/bench.pftrace',
                          local], capture_output=True, check=True)
    d = diff(a, b)
    d.update(scenario=scenario, count=count, frames=frames, janky=janky,
             fps=round(frames / d['wall_s'], 1), temps_before=t_before,
             temps_after=t_after, rails_mw=rails(local), ts=time.time())
    return d


def main():
    out, count, scenarios = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
    check_scenarios(scenarios)
    subprocess.run(ADB + ['push', os.path.join(HERE, 'snap.sh'),
                          '/data/local/tmp/snap.sh'],
                   capture_output=True, check=True)
    results = []
    for s in scenarios:
        r = run(s, count)
        results.append(r)
        cpu_rails = sum(v for k, v in r['rails_mw'].items() if k.startswith('cpu'))
        print(f"{s:28s} app_cpu={r['app_cpu_ms']/r['wall_s']/10:6.1f}% "
              f"cpu_rails={cpu_rails:7.1f}mW gpu={r['rails_mw'].get('gpu', 0):6.1f} "
              f"disp={r['rails_mw'].get('display', 0):6.1f} fps={r['fps']:5.1f} "
              f"soc={r['temps_after'].get('soc_therm')}", flush=True)
        with open(out, 'a') as f:
            f.write(json.dumps(r) + '\n')
    sh(f'am force-stop {PKG}')


if __name__ == '__main__':
    main()
