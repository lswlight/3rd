import sys, numpy as np
from PIL import Image, ImageFilter, ImageChops, ImageDraw
from collections import deque
src_p,hf_p,out_p=sys.argv[1:4]
src=np.asarray(Image.open(src_p).convert('RGB')).astype(int); hf=np.asarray(Image.open(hf_p).convert('RGBA'))[...,3].astype(int)
H,W=hf.shape; mn=src.min(2); mx=src.max(2); R,G,B=src[...,0],src[...,1],src[...,2]
a=hf.copy()
s=np.asarray(Image.fromarray(((a>150)*255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)))>0; a[s]=255
sat=(mx-mn)/np.maximum(mx,1)
obj=(a<128)&(((sat>0.45)&(mx>60))|(mx<120))
obj=np.asarray(Image.fromarray((obj*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3)))>0
lab=np.zeros((H,W),bool); keep=np.zeros((H,W),bool)
for y,x in zip(*np.nonzero(obj)):
    if lab[y,x]: continue
    q=deque([(y,x)]); lab[y,x]=True; pts=[]
    while q:
        cy,cx=q.popleft(); pts.append((cy,cx))
        for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny,nx=cy+dy,cx+dx
            if 0<=ny<H and 0<=nx<W and obj[ny,nx] and not lab[ny,nx]: lab[ny,nx]=True; q.append((ny,nx))
    if len(pts)>1500:
        p=np.array(pts); keep[p[:,0],p[:,1]]=True
k=np.asarray(Image.fromarray((keep*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))).astype(int)
a=np.maximum(a,k)
m=Image.fromarray(((a>128)*255).astype(np.uint8)); mm=m.copy()
for x in range(0,W,3):
    for y in (0,H-1):
        if mm.getpixel((x,y))==0: ImageDraw.floodfill(mm,(x,y),100)
for y in range(0,H,3):
    for x in (0,W-1):
        if mm.getpixel((x,y))==0: ImageDraw.floodfill(mm,(x,y),100)
holes=(np.asarray(mm)==0)&~((mn>=240)&(abs(R-B)<=6))
a[holes]=255
white=(mn>=240)&(abs(R-B)<=6)&(abs(R-G)<=6)&(a>0)
C=Image.fromarray((white*255).astype(np.uint8)); seed=Image.fromarray(((a<30)*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))
rec=ImageChops.darker(seed,C)
for _ in range(40): rec=ImageChops.darker(rec.filter(ImageFilter.MaxFilter(3)),C)
a[np.asarray(rec)>0]=0
a=np.asarray(Image.fromarray(a.clip(0,255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.5)))
Image.fromarray(np.dstack([src,a]).astype(np.uint8),'RGBA').save(out_p)
im=Image.open(out_p); v=[]
for col in ((28,30,62,255),(200,40,40,255)):
  b=Image.new('RGBA',im.size,col); b.alpha_composite(im); v.append(b.convert('RGB').resize((600,600)))
c=Image.new('RGB',(1210,600)); c.paste(v[0],(0,0)); c.paste(v[1],(610,0)); c.save(out_p.replace('.png','_v.png'))
