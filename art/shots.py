import subprocess, sys, time, json
from playwright.sync_api import sync_playwright
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8821'], cwd='/home/claude/fotwa-app/www', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
OUT = '/home/claude/fotwa-app/store'
try:
  with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    ctx = b.new_context(viewport={'width': 1280, 'height': 720}, device_scale_factor=1.5)
    pg = ctx.new_page(); pg.on('pageerror', lambda e: print('PAGEERR', e, flush=True)); pg.on('requestfailed', lambda r: print('REQFAIL', r.url) if 'favicon' not in r.url else None)
    pg.add_init_script("try{localStorage.setItem('fetwa-quality','high');localStorage.setItem('fetwa-save-v1', JSON.stringify({name:'حسونة', level: 51, coins: 2450, stars: {1:3,2:3,3:2,4:3,5:3,6:2,7:3,8:3,9:2,10:3,11:3,12:2,13:3,14:3}, stats: {fights: 61, wins: 52, losses: 9, kos: 38, hits: 940, bestCombo: 9, rage: 21, grabs: 30, throwHits: 25, perfect: 4}}))}catch(e){}; window.__fetwaPaused = true;")
    pg.goto('http://localhost:8821/index.html'); pg.wait_for_function("document.getElementById('loader').hidden", timeout=900000)
    pg.screenshot(path=f'{OUT}/shot-0-menu.png')
    for i, (n, secs) in enumerate(((8, 5.0), (15, 6.5), (42, 6.0), (35, 5.5), (29, 6.2), (31, 5.0)), 1):
      pg.evaluate(f"window.__fetwaMeta.fight({n})"); pg.wait_for_function("window.__fetwaApi && window.__fetwaApi.state === 'intro'", timeout=600000)
      pg.evaluate(f"(() => {{ const F = window.__fetwa; F.flags.noRender = true; F.sim({secs}); F.flags.noRender = false; F.sim(0.02); document.getElementById('banner').classList.remove('on'); }})()")
      pg.wait_for_timeout(400); pg.screenshot(path=f'{OUT}/shot-{i}-level{n}.png'); print('shot', n, flush=True)
    pg.evaluate("window.__fetwaMeta.openCard()"); pg.wait_for_timeout(2500); pg.screenshot(path=f'{OUT}/shot-7-card.png')
    b.close()
finally: srv.kill()
