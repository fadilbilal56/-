import re,subprocess,json,glob,os
U='/root/.claude/uploads/96244545-ba54-5866-a07e-db2a82bb4384'
M={'ec3e9ec6-1':1,'7eafc758-2':2,'6cc1bd08-3':3,'283c97d5-4':4,'4a570741-5':5,'70856bf5-66':6,'d205cf36-71':7,'35a6ebae-81':8,'2b45da49-91':9,'223aeea6-101':10,'e5ecd5ab-111':11,'1f575862-12':12,'b41a7f2f-135':13,'a80053dc-14':14,'c37fa6c0-152':15,'de928d2d-16':16,'f56d4df6-17':17,'47667f0a-18':18,'30414a1f-19':19,'27024dec-20':20}
def words(f):
    out=subprocess.run(['pdftotext','-bbox',f,'-'],capture_output=True,text=True).stdout
    pages=out.split('<page ')[1:]
    res=[]
    for p in pages:
        ws=[(float(a),float(b),float(c),float(d),t) for a,b,c,d,t in re.findall(r'xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</word>',p)]
        res.append(ws)
    return res
if __name__=='__main__':
    for k,g in sorted(M.items(),key=lambda x:x[1]):
        pg=words(f'{U}/{k}.pdf')
        # header column x of page1: words in header row
        hdr=[w for w in pg[0] if 100<w[1]<104]
        print(g,[round(w[0]) for w in sorted(hdr)])
