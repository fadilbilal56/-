from parse import *
import statistics
def num(t):
    if t=='-': return 0.0
    return float(t.replace(',',''))
data={}
for k,g in sorted(M.items(),key=lambda x:x[1]):
    pgs=words(f'{U}/{k}.pdf')
    rows=[]  # (page,y,tokens)
    for pi,ws in enumerate(pgs):
        toks=[w for w in ws if re.fullmatch(r'[\d.,\-#]+',w[4]) and not re.search(r'[٠-٩]',w[4])]
        toks.sort(key=lambda w:w[1])
        cur=[]
        for w in toks:
            if cur and abs(w[1]-cur[0][1])>6:
                rows.append((pi,cur)); cur=[]
            cur.append(w)
        if cur: rows.append((pi,cur))
    # drop rows that are only the index column (index tokens are small ints at far right)
    clean=[]
    for pi,r in rows:
        r=[w for w in r if not (w[0]>690)]  # index col
        if r: clean.append((pi,r))
    # centers from full rows
    full=[[ (w[0]+w[2])/2 for w in sorted(r,key=lambda w:-w[0]) if (w[0]+w[2])/2>200] for pi,r in clean]
    full=[f for f in full if len(f)==6]
    cen=[statistics.median(f[i] for f in full) for i in range(6)]
    out=[]
    for pi,r in clean:
        cells=[None]*6; vch=None
        for w in r:
            c=(w[0]+w[2])/2
            if c<200:
                vch=w[4]; continue
            i=min(range(6),key=lambda j:abs(cen[j]-c))
            cells[i]=w[4]
        out.append((pi,cells,vch))
    data[g]=out
    print(g,len(out),cen and [round(c) for c in cen], 'rows')
import pickle;pickle.dump(data,open('raw.pkl','wb'))
