import json,sys
rows=[json.loads(l) for f in sys.argv[1:] for l in open(f)]
base=[r for r in rows if r['scenario']=='static']
b=sum(sum(v for k,v in r['rails_mw'].items() if k.startswith('cpu'))+r['rails_mw'].get('gpu',0) for r in base)/len(base)
print(f"{'scenario':26s} {'cpu+gpu mW':>10s} {'Δ vs static':>11s} {'main%':>6s} {'js%':>5s} {'rend%':>6s} {'SF%':>5s} {'fps':>5s} {'ddr+mem mW':>10s}")
for r in rows:
    w=r['wall_s']; t=r['threads_ms']
    main=sum(v for k,v in t.items() if k.startswith('m.fabric'))/w/10
    js=t.get('mqt_v_js',0)/w/10; rt=t.get('RenderThread',0)/w/10
    sf=r['procs_ms'].get('surfaceflinger',0)/w/10
    p=sum(v for k,v in r['rails_mw'].items() if k.startswith('cpu'))+r['rails_mw'].get('gpu',0)
    mem=sum(r['rails_mw'].get(k,0) for k in ('ddr.a','ddr.b','ddr.c','memory.interface'))
    print(f"{r['scenario']:26s} {p:10.0f} {p-b:11.0f} {main:6.1f} {js:5.1f} {rt:6.1f} {sf:5.1f} {r['fps']:5.1f} {mem:10.0f}")
