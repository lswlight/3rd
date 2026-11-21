import sys
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import importlib.util
spec=importlib.util.spec_from_file_location('df',__import__('os').path.join(__import__('os').path.dirname(__file__),'defringe.py')); df=importlib.util.module_from_spec(spec); spec.loader.exec_module(df)
src,out_hi,out_s=sys.argv[1:4]
im=Image.open(src).convert('RGB'); W,H=im.size
bgc=im.getpixel((5,5)); print('bg',bgc)
ref=Image.new('RGB',im.size,bgc)
diff=ImageChops.difference(im,ref).convert('L')
diff=Image.merge('RGB',ImageChops.difference(im,ref).split())
dr,dg,db=diff.split(); dmax=ImageChops.lighter(ImageChops.lighter(dr,dg),db)
cand=dmax.point(lambda v:255 if v<=22 else 0)
m=cand.copy()
for x in range(0,W,4):
    for y in (0,H-1):
        if m.getpixel((x,y))==255: ImageDraw.floodfill(m,(x,y),128)
for y in range(0,H,4):
    for x in (0,W-1):
        if m.getpixel((x,y))==255: ImageDraw.floodfill(m,(x,y),128)
bg=m.point(lambda v:255 if v==128 else 0)
# trapped bg: large flat navy blobs
seed=cand.filter(ImageFilter.MinFilter(7)); rec=seed
for _ in range(10): rec=ImageChops.darker(rec.filter(ImageFilter.MaxFilter(3)),cand)
bg=ImageChops.lighter(bg,rec)
fg=ImageChops.invert(bg)
# drop small isolated pieces (petals)
lab=fg.copy(); comps=[]
for y in range(0,H,2):
    for x in range(0,W,2):
        if lab.getpixel((x,y))==255:
            b=lab.histogram()[254]; ImageDraw.floodfill(lab,(x,y),254); comps.append((lab.histogram()[254]-b,(x,y))); ImageDraw.floodfill(lab,(x,y),253)
comps.sort(reverse=True); print([c[0] for c in comps[:8]])
keep=Image.new('L',(W,H),0)
for area,(x,y) in comps:
    if area>int(sys.argv[4]) if len(sys.argv)>4 else 5000:
        t=fg.copy(); ImageDraw.floodfill(t,(x,y),128); keep=ImageChops.lighter(keep,t.point(lambda v:255 if v==128 else 0))
alpha=keep.filter(ImageFilter.GaussianBlur(0.7))
o=im.convert('RGBA'); o.putalpha(alpha); o=df.defringe(o,1)
bb=o.getchannel('A').point(lambda v:255 if v>20 else 0).getbbox()
o=o.crop((max(0,bb[0]-6),max(0,bb[1]-6),min(W,bb[2]+6),min(H,bb[3]+6))); o.save(out_hi)
s=o.copy(); s.thumbnail((280,280),Image.LANCZOS); s.save(out_s); print(o.size,s.size)
