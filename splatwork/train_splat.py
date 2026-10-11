"""Entrena un splat gaussiano 3D del humedal con gsplat desde COLMAP sparse.
Uso: venv312/Scripts/python.exe REN3D/splatwork/train_splat.py
Sale:  REN3D/splatwork/humedal.splat + previews JPG
"""
import math
import os
import random
import sys

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image

import pycolmap
from gsplat import rasterization
from gsplat.strategy import DefaultStrategy
from gsplat.exporter import export_splats

WORK = os.path.join('REN3D', 'splatwork')
IMGDIR = os.path.join(WORK, 'frames')
SPARSE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(WORK, 'sparse', '0')
PREVDIR = os.path.join(WORK, 'preview')
OUT_SPLAT = os.path.join(WORK, 'humedal.splat')
_LOCKFD = None


def _acquire_lock():
    import subprocess
    lp = os.path.join(WORK, 'train.lock')
    if os.path.exists(lp):
        try:
            old = int(open(lp).read().strip().split()[0])
        except Exception:
            old = None
        alive = True
        if old:
            try:
                out = subprocess.run(
                    ['tasklist', '/FI', 'PID eq %d' % old, '/FO', 'CSV'],
                    capture_output=True, text=True, timeout=20).stdout
                alive = ('"%d"' % old) in out
            except Exception:
                alive = True
        if alive:
            print('OTRA INSTANCIA ENTRENANDO (pid %s): salgo sin hacer nada' % old, flush=True)
            raise SystemExit(42)
        try:
            os.remove(lp)
        except OSError:
            pass
    fd = os.open(lp, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    os.write(fd, str(os.getpid()).encode())
    return fd


_LOCKFD = _acquire_lock()
SH_DEGREE = 3
MAX_STEPS = 15000
SH_INTERVAL = 1000
SSIM_LAMBDA = 0.2
cur_deg = [0]


def _gauss_window(ch=3, size=11, sigma=1.5):
    coords = torch.arange(size, dtype=torch.float32) - size // 2
    g = torch.exp(-(coords ** 2) / (2 * sigma ** 2))
    g = g / g.sum()
    w = g[:, None] * g[None, :]
    return w.expand(ch, 1, size, size).contiguous()


_SSIM_WIN = {}


def ssim_loss(img1, img2):
    key = (img1.device, img1.dtype)
    if key not in _SSIM_WIN:
        _SSIM_WIN[key] = _gauss_window().to(img1.device, img1.dtype)
    win = _SSIM_WIN[key]
    C1, C2 = 0.01 ** 2, 0.03 ** 2
    mu1 = F.conv2d(img1, win, padding=5, groups=3)
    mu2 = F.conv2d(img2, win, padding=5, groups=3)
    mu12 = mu1 * mu2
    mu1sq, mu2sq = mu1 * mu1, mu2 * mu2
    s1 = F.conv2d(img1 * img1, win, padding=5, groups=3) - mu1sq
    s2 = F.conv2d(img2 * img2, win, padding=5, groups=3) - mu2sq
    s12 = F.conv2d(img1 * img2, win, padding=5, groups=3) - mu12
    ssim = ((2 * mu12 + C1) * (2 * s12 + C2)) / ((mu1sq + mu2sq + C1) * (s1 + s2 + C2))
    return 1.0 - ssim.mean()
SEED = 7
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)
os.makedirs(PREVDIR, exist_ok=True)
device = torch.device('cuda')
print('device:', torch.cuda.get_device_name(0), flush=True)

SH_C0 = 0.28209479177387814

# ---------- 1. COLMAP ----------
rec = pycolmap.Reconstruction(SPARSE)
print('images:', len(rec.images), 'points:', len(rec.points3D), flush=True)
names, w2cs, Ks, Ws, Hs = [], [], [], [], []
for im_id in sorted(rec.images):
    im = rec.images[im_id]
    cam = rec.cameras[im.camera_id]
    if cam.model_name == 'SIMPLE_PINHOLE':
        f, cx, cy = cam.params
        K = np.array([[f, 0, cx], [0, f, cy], [0, 0, 1]])
    elif cam.model_name == 'PINHOLE':
        fx, fy, cx, cy = cam.params
        K = np.array([[fx, 0, cx], [0, fy, cy], [0, 0, 1]])
    elif cam.model_name == 'SIMPLE_RADIAL':
        f, cx, cy, _k = cam.params
        K = np.array([[f, 0, cx], [0, f, cy], [0, 0, 1]])
    else:
        raise RuntimeError('modelo de camara no soportado: ' + cam.model_name)
    tform = im.cam_from_world() if callable(im.cam_from_world) else im.cam_from_world
    R = tform.rotation.matrix()
    t = np.asarray(tform.translation)
    w2c = np.eye(4)
    w2c[:3, :3] = R
    w2c[:3, 3] = t
    names.append(im.name)
    w2cs.append(w2c)
    Ks.append(K)
    Ws.append(cam.width)
    Hs.append(cam.height)
W0, H0 = Ws[0], Hs[0]
assert all(w == W0 and h == H0 for w, h in zip(Ws, Hs)), 'imagenes de distinto tamano'
TRFactor = 0.8
W0, H0 = int(W0 * TRFactor), int(H0 * TRFactor)
print('resolucion entreno:', W0, 'x', H0, flush=True)
w2cs = torch.from_numpy(np.stack(w2cs)).float().to(device)
Ks = torch.from_numpy(np.stack(Ks)).float().to(device) * TRFactor
Ks[:, 2, 2] = 1.0
with torch.no_grad():
    centers = torch.linalg.inv(w2cs)[:, :3, 3]
    scene_scale = 1.1 * (centers - centers.mean(0)).norm(dim=1).max().item()
print('scene_scale:', round(scene_scale, 3), flush=True)

# imagenes a tensor
ims = []
for n in names:
    im = Image.open(os.path.join(IMGDIR, n)).convert('RGB')
    if im.size != (W0, H0):
        im = im.resize((W0, H0), Image.BILINEAR)
    ims.append(np.asarray(im, dtype=np.float32) / 255.0)
gts = torch.from_numpy(np.stack(ims)).float().to(device)  # (M,H,W,3)
print('gts:', tuple(gts.shape), flush=True)

# ---------- 2. init desde puntos SfM ----------
pts = np.array([p.xyz for p in rec.points3D.values()])
rgb = np.array([p.color for p in rec.points3D.values()], dtype=np.float32) / 255.0
print('puntos SfM:', len(pts), flush=True)
rng = np.random.default_rng(SEED)
n_rand = 25000
pick = rng.integers(0, len(pts), size=n_rand)
sub = pts[rng.choice(len(pts), min(4000, len(pts)), replace=False)]
d2 = ((sub[:, None, :] - sub[None, :, :]) ** 2).sum(-1)
np.fill_diagonal(d2, np.inf)
nn = np.sqrt(d2.min(1))
sig = max(float(np.median(nn)) * 3.0, 0.05)
ru = pts[pick] + rng.normal(0, sig, size=(n_rand, 3))
rgb_u = np.clip(rgb[pick] + rng.normal(0, 0.06, size=(n_rand, 3)), 0, 1)
n_vol = 30000
lo, hi = pts.min(0), pts.max(0)
rv = rng.uniform(lo, hi, size=(n_vol, 3))
rgb_v = np.clip(np.tile(rgb.mean(0, keepdims=True), (n_vol, 1)) + rng.normal(0, 0.08, (n_vol, 3)), 0, 1)
pts = np.concatenate([pts, ru, rv])
rgb = np.concatenate([rgb, rgb_u, rgb_v])
print('puntos + jitter + volumen:', len(pts), 'sig=', round(sig, 3), flush=True)
VOL_START = len(pts) - n_vol
MAX_INIT = 120000
if len(pts) > MAX_INIT:
    sel = np.random.choice(len(pts), MAX_INIT, replace=False)
    pts, rgb = pts[sel], rgb[sel]
means = torch.from_numpy(pts).float().to(device)
del pts
scales = torch.full((len(means), 3), math.log(0.1), device=device)
n_vol_now = len(means) - VOL_START
if n_vol_now > 0:
    scales[VOL_START:] = math.log(0.15)
N = len(means)
quats = torch.rand(N, 4, device=device)
quats = quats / quats.norm(dim=-1, keepdim=True)
opacities = torch.logit(torch.full((N,), 0.1, device=device))
sh0 = ((torch.from_numpy(rgb).float().to(device) - 0.5) / SH_C0)[:, None, :]
shN = torch.zeros(N, (SH_DEGREE + 1) ** 2 - 1, 3, device=device)
params = {
    'means': torch.nn.Parameter(means),
    'scales': torch.nn.Parameter(scales),
    'quats': torch.nn.Parameter(quats),
    'opacities': torch.nn.Parameter(opacities),
    'sh0': torch.nn.Parameter(sh0),
    'shN': torch.nn.Parameter(shN),
}
optimizers = {
    'means': torch.optim.Adam([params['means']], lr=1.6e-4),
    'scales': torch.optim.Adam([params['scales']], lr=5e-3),
    'quats': torch.optim.Adam([params['quats']], lr=1e-3),
    'opacities': torch.optim.Adam([params['opacities']], lr=5e-2),
    'sh0': torch.optim.Adam([params['sh0']], lr=2.5e-3),
    'shN': torch.optim.Adam([params['shN']], lr=2.5e-3 / 20),
}
strategy = DefaultStrategy(verbose=True)
strategy.check_sanity(params, optimizers)
state = strategy.initialize_state(scene_scale=scene_scale)
print('init ok, N =', N, flush=True)
CKPT = os.path.join(WORK, 'ckpt.pt')
start_step = 1
if os.path.exists(CKPT):
    _ck = torch.load(CKPT, map_location='cpu', weights_only=False)
    for _k in params:
        params[_k].data = _ck['params'][_k].to(device)
    start_step = _ck['step'] + 1
    del _ck
    print('resume desde paso', start_step, 'n=', len(params['means']), flush=True)


def save_ckpt(step):
    torch.save({'step': step,
                'params': {k: v.detach().cpu() for k, v in params.items()}}, CKPT)

K_nd = (SH_DEGREE + 1) ** 2
VAL_IDX = 0


def render_one(idx):
    d = cur_deg[0]
    colors = torch.cat([params['sh0'], params['shN'][:, :(d + 1) ** 2 - 1]], dim=1)
    renders, _, _ = rasterization(
        params['means'], params['quats'], torch.exp(params['scales']),
        torch.sigmoid(params['opacities']), colors,
        w2cs[idx:idx + 1], Ks[idx:idx + 1], W0, H0,
        sh_degree=d, packed=False,
    )
    return renders[0]


def save_preview(step):
    with torch.no_grad():
        img = render_one(VAL_IDX).clamp(0, 1).detach().cpu().numpy()
    Image.fromarray((img * 255).astype(np.uint8)).save(
        os.path.join(PREVDIR, 'ep_%05d.jpg' % step))
    print('preview ep_%05d.jpg' % step, flush=True)


# ---------- 3. loop ----------
M = len(names)
for step in range(start_step, MAX_STEPS + 1):
    idx = random.randrange(M)
    for o in optimizers.values():
        o.zero_grad(set_to_none=True)
    # decaimiento exponencial del lr de posiciones
    lr = 1.6e-4 * (1.6e-6 / 1.6e-4) ** (step / MAX_STEPS)
    for pg in optimizers['means'].param_groups:
        pg['lr'] = lr
    cur_deg[0] = min(step // SH_INTERVAL, SH_DEGREE)
    d = cur_deg[0]
    colors = torch.cat([params['sh0'], params['shN'][:, :(d + 1) ** 2 - 1]], dim=1)
    renders, _, info = rasterization(
        params['means'], params['quats'], torch.exp(params['scales']),
        torch.sigmoid(params['opacities']), colors,
        w2cs[idx:idx + 1], Ks[idx:idx + 1], W0, H0,
        sh_degree=d, packed=False,
    )
    pred = renders[0]
    gt = gts[idx]
    loss = torch.lerp(
        F.l1_loss(pred, gt),
        ssim_loss(pred.permute(2, 0, 1).unsqueeze(0), gt.permute(2, 0, 1).unsqueeze(0)),
        SSIM_LAMBDA,
    )
    strategy.step_pre_backward(params, optimizers, state, step, info)
    loss.backward()
    for o in optimizers.values():
        o.step()
        o.zero_grad(set_to_none=True)
    strategy.step_post_backward(params, optimizers, state, step, info)
    if step % 500 == 0:
        print('step %d/%d loss %.5f n=%d' % (step, MAX_STEPS, loss.item(), len(params['means'])), flush=True)
        torch.cuda.empty_cache()
    if step % 2000 == 0:
        save_preview(step)
        save_ckpt(step)

save_preview(MAX_STEPS)
with torch.no_grad():
    export_splats(
        params['means'].detach(), params['scales'].detach(),
        params['quats'].detach(), params['opacities'].detach(),
        params['sh0'].detach(), params['shN'].detach(),
        format='splat', save_to=OUT_SPLAT,
    )
print('OK ->', OUT_SPLAT, os.path.getsize(OUT_SPLAT) / 1048576, 'MB', flush=True)
if os.path.exists(CKPT):
    os.remove(CKPT)
try:
    os.close(_LOCKFD)
except Exception:
    pass
try:
    os.remove(os.path.join(WORK, 'train.lock'))
except OSError:
    pass
