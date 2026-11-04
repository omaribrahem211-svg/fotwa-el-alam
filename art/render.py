import subprocess, sys, time, base64, io, os
from playwright.sync_api import sync_playwright
from PIL import Image
R = '/home/claude/fotwa-app/android/app/src/main/res'; OUT = '/home/claude/fotwa-app/store'; os.makedirs(OUT, exist_ok=True)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8820'], cwd='/home/claude/fotwa-app', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
def save(data, path, size=None):
  im = Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))); im.save(path); return im
try:
  with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); pg.goto('http://localhost:8820/art/art.html')
    d = lambda k, w, h, u=None: pg.evaluate('([k,w,h,u]) => window.draw(k,w,h,u)', [k, w, h, u])
    if len(sys.argv) > 1 and sys.argv[1] == 'fb': save(d('fbcover', 1640, 624, 'http://localhost:8820/art/fb_bg_20.png'), OUT + '/facebook-cover-1640x624.png'); save(d('fbprofile2', 720, 720, 'http://localhost:8820/art/prof_3_cheer1_0.8.png'), OUT + '/facebook-profile-720.png'); b.close(); raise SystemExit
    save(d('icon', 512, 512), OUT + '/icon-512.png')
    for dens, s, fg in (('mdpi', 48, 108), ('hdpi', 72, 162), ('xhdpi', 96, 216), ('xxhdpi', 144, 324), ('xxxhdpi', 192, 432)):
      save(d('icon', s, s), f'{R}/mipmap-{dens}/ic_launcher.png'); save(d('round', s, s), f'{R}/mipmap-{dens}/ic_launcher_round.png'); save(d('fg', fg, fg), f'{R}/mipmap-{dens}/ic_launcher_foreground.png')
    import glob
    for f in glob.glob(R + '/drawable*/splash.png'):
      w, h = Image.open(f).size; save(d('splash', w, h), f)
    if len(sys.argv) > 1 and sys.argv[1] == 'fb':
      save(d('fbcover', 1640, 624, 'http://localhost:8820/art/fb_bg_20.png'), OUT + '/facebook-cover-1640x624.png'); save(d('fbprofile', 720, 720), OUT + '/facebook-profile-720.png'); sys.exit(0) if False else None
    elif len(sys.argv) > 1: save(d('feature', 1024, 500, sys.argv[1]), OUT + '/feature-1024x500.png')
    b.close()
finally: srv.kill()
