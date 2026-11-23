import sys, numpy as np
from PIL import Image, ImageFilter
from collections import deque
src=sys.argv[1]; th=float(sys.argv[2]) if len(sys.argv)>2 else 40
a=np.asarray(Image.open(src).convert('RGB')).astype(np.float32); H,W=a.shape[:2]
bg=np.median(np.concatenate([a[:6].reshape(-1,3),a[-6:].reshape(-1,3),a[:,:6].reshape(-1,3),a[:,-6:].reshape(-1,3)]),axis=0)
d=np.abs(a-bg).max(axis=2)
solid=d>th
out=np.zeros((H,W),bool); q=deque()
for x in range(W):
  for y in (0,H-1):
    if not solid[y,x]: out[y,x]=True; q.append((y,x))
for y in range(H):
  for x in (0,W-1):
    if not solid[y,x] and not out[y,x]: out[y,x]=True; q.append((y,x))
while q:
  y,x=q.popleft()
  for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
    ny,nx=y+dy,x+dx
    if 0<=ny<H and 0<=nx<W and not solid[ny,nx] and not out[ny,nx]: out[ny,nx]=True; q.append((ny,nx))
filled=~out   # solid + enclosed holes
soft=np.clip((d-10)*255/60,0,255)
alpha=np.where(filled,np.maximum(soft,255*(d>th)),soft)
holes=filled&~solid; alpha[holes]=255
af=(alpha/255)[...,None]; rgb=np.clip((a-bg*(1-af))/np.maximum(af,1e-3),0,255)
Image.fromarray(np.dstack([rgb,alpha]).astype(np.uint8),'RGBA').save(src.replace('.png','_cut.png'))
print('holes',holes.sum())
