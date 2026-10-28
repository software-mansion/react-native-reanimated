"""Interleaved A/B runs: in every round, installs each APK and runs the
scenarios with bench.py. The order of APKs alternates between rounds to
cancel out thermal drift. Already recorded runs are skipped, so an
interrupted session can be resumed.

usage: ANDROID_SERIAL=<serial> python ab.py OUT_JSONL ROUNDS COUNT \\
         "label=path/to.apk,label=path/to.apk" SCENARIO [SCENARIO...]
"""
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bench  # noqa: E402


def main():
    out, rounds, count = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
    variants = [v.split('=') for v in sys.argv[4].split(',')]
    scenarios = sys.argv[5:]
    subprocess.run(bench.ADB + ['push', os.path.join(bench.HERE, 'snap.sh'),
                                '/data/local/tmp/snap.sh'],
                   capture_output=True, check=True)
    done = set()
    if os.path.exists(out):
        for line in open(out):
            d = json.loads(line)
            done.add((d['round'], d['variant'], d['scenario']))
    for rnd in range(rounds):
        order = variants if rnd % 2 == 0 else list(reversed(variants))
        for label, apk in order:
            todo = [s for s in scenarios if (rnd, label, s) not in done]
            if not todo:
                continue
            subprocess.run(bench.ADB + ['install', '-r', apk],
                           capture_output=True, check=True)
            for s in todo:
                try:
                    r = bench.run(s, count)
                except subprocess.CalledProcessError:
                    print(f'r{rnd} {label} {s}: run failed, reinstalling',
                          flush=True)
                    subprocess.run(bench.ADB + ['install', '-r', apk],
                                   capture_output=True, check=True)
                    r = bench.run(s, count)
                r['variant'] = label
                r['round'] = rnd
                w = r['wall_s']
                ui = sum(v for k, v in r['threads_ms'].items()
                         if k.startswith('m.fabric')) / w / 10
                p = sum(v for k, v in r['rails_mw'].items()
                        if k.startswith('cpu')) + r['rails_mw'].get('gpu', 0)
                print(f'r{rnd} {label:6s} {s:24s} ui={ui:5.1f}% '
                      f'app={r["app_cpu_ms"]/w/10:5.1f}% cpu+gpu={p:6.0f}mW '
                      f'fps={r["fps"]:5.1f}', flush=True)
                with open(out, 'a') as f:
                    f.write(json.dumps(r) + '\n')
    subprocess.run(bench.ADB + ['shell', 'am force-stop com.fabricexample'])


if __name__ == '__main__':
    main()
