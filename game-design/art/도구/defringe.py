import sys
from PIL import Image, ImageFilter, ImageChops
def defringe(im, erode=2):
    im=im.convert('RGBA'); a=im.getchannel('A')
    solid=a.point(lambda v:255 if v>40 else 0)
    inner=solid
    for _ in range(erode): inner=inner.filter(ImageFilter.MinFilter(3))
    ring=ImageChops.subtract(solid, inner.filter(ImageFilter.MinFilter(3)))  # edge band
    # RGB with transparent areas painted white so MinFilter only pulls darker interior colors
    rgb=Image.new('RGB',im.size,(255,255,255)); rgb.paste(im.convert('RGB'),(0,0),solid)
    dark=Image.merge('RGB',[c.filter(ImageFilter.MinFilter(5)) for c in rgb.split()])
    # only replace edge pixels that are much brighter than nearby interior
    L=rgb.convert('L'); Ld=dark.convert('L')
    bright=ImageChops.subtract(L,Ld).point(lambda v:255 if v>45 else 0)
    m=ImageChops.multiply(ring,bright)
    out_rgb=Image.composite(dark,im.convert('RGB'),m)
    # shrink alpha by erode px and soften
    na=a
    for _ in range(erode): na=na.filter(ImageFilter.MinFilter(3))
    na=na.filter(ImageFilter.GaussianBlur(0.6))
    na=ImageChops.darker(na,a)
    out=out_rgb.convert('RGBA'); out.putalpha(na); return out
if __name__=='__main__':
    defringe(Image.open(sys.argv[1]),int(sys.argv[3]) if len(sys.argv)>3 else 2).save(sys.argv[2])
