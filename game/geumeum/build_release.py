import re,os,shutil
s=open('dokkaebi-shooter.html',encoding='utf-8').read()
assert s.count('const REVIEW = true;')==1
s=s.replace('const REVIEW = true;','const REVIEW = false;') # 출시판: 검토판 고르기 없음, 늘 잠김
s=s.replace('<meta name="claude:viewport-fit-sides" content="cover">\n','')
# 안드로이드 앱에서는 mp4만 쓴다(용량 절약)
a="for (const [ext, type] of [['mp4', 'video/mp4'], ['webm', 'video/webm']])"
assert s.count(a)==1; s=s.replace(a,"for (const [ext, type] of [['mp4', 'video/mp4']])")
app_css=open('app_css.txt',encoding='utf-8').read()
head='<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">\n<meta name="theme-color" content="#05060c">\n'
b=s.index('<main class="wrap">')
out=head+s[:b]+app_css+'</head>\n<body>\n'+s[b:]+'\n</body>\n</html>\n'
shutil.rmtree('release/www',ignore_errors=True); os.makedirs('release/www/assets')
open('release/www/index.html','w',encoding='utf-8').write(out)
names=set(re.findall(r"['\"/]([A-Za-z0-9_]+)['\"]",s))|set(re.findall(r"assets/([A-Za-z0-9_]+)\.",s))
n=0
for f in sorted(os.listdir('assets')):
    if os.path.isdir('assets/'+f) or '.' not in f: continue
    base,ext=f.rsplit('.',1)
    if ext=='webm': continue
    if base in names or base.startswith('cutv') and base in s or base.endswith('_s1') and base[:-3] in names: # _s1 = 동료 스킨(이름을 코드에서 만들어 씀)
        shutil.copy('assets/'+f,'release/www/assets/'+f); n+=1
shutil.copytree('assets/fonts','release/www/assets/fonts'); shutil.copytree('assets/eq','release/www/assets/eq'); shutil.copytree('assets/fx','release/www/assets/fx')  # 기획 29·30 공격 이펙트 그림
print('copied',n)
# 안 쓰는 예전 컷인 영상은 빼기(새 이름 cutv*x 로 바뀜)
import re as _re
_idx=open('release/www/index.html',encoding='utf-8').read()
for _f in os.listdir('release/www/assets'):
    if _re.fullmatch(r'cutvh?\d+[a-z]?\.mp4',_f) and ("'"+_f[:-4]+"'") not in _idx: os.remove('release/www/assets/'+_f)
