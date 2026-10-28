"""Prints a Markdown table of ab.py results: mean ± sd per scenario and
variant, and the change relative to the first variant.

usage: python summarize.py RESULTS_JSONL [RESULTS_JSONL...]
"""
import json
import statistics as st
import sys
from collections import defaultdict


def metrics(r):
    w = r['wall_s']
    ui = sum(v for k, v in r['threads_ms'].items() if k.startswith('m.fabric')) / w / 10
    js = r['threads_ms'].get('mqt_v_js', 0) / w / 10
    app = r['app_cpu_ms'] / w / 10
    p = sum(v for k, v in r['rails_mw'].items() if k.startswith('cpu')) + r['rails_mw'].get('gpu', 0)
    return {'ui%': ui, 'js%': js, 'app%': app, 'cpu+gpu mW': p, 'fps': r['fps']}


def fmt(xs):
    m = st.mean(xs)
    sd = st.stdev(xs) if len(xs) > 1 else 0
    return m, sd


rows = [json.loads(l) for f in sys.argv[1:] for l in open(f)]
groups = defaultdict(lambda: defaultdict(list))
variants = []
for r in rows:
    if r['variant'] not in variants:
        variants.append(r['variant'])
    for k, v in metrics(r).items():
        groups[(r['scenario'], r['variant'])][k].append(v)

scenarios = []
for r in rows:
    if r['scenario'] not in scenarios:
        scenarios.append(r['scenario'])

keys = ['ui%', 'app%', 'cpu+gpu mW', 'fps']
print('| scenario | variant | n | ' + ' | '.join(keys) + ' |')
print('|---|---|--:|' + '--:|' * len(keys))
for s in scenarios:
    base = groups[(s, variants[0])]
    for v in variants:
        g = groups[(s, v)]
        if not g:
            continue
        cells = []
        for k in keys:
            m, sd = fmt(g[k])
            cell = f'{m:.1f} ± {sd:.1f}' if k != 'cpu+gpu mW' else f'{m:.0f} ± {sd:.0f}'
            if v != variants[0] and k in ('ui%', 'app%', 'cpu+gpu mW'):
                bm = st.mean(base[k])
                cell += f' ({(m - bm) / bm * 100:+.1f}%)'
            cells.append(cell)
        print(f'| {s} | {v} | {len(g["ui%"])} | ' + ' | '.join(cells) + ' |')
