"""Linux descriptor-relative file gateway. No symlink following, no shell, bounded IO."""
import os, sys, json, stat, hashlib, secrets
MAX=100000
DENY={'.ssh','.gnupg','.aws','.config','.git','.npmrc','.pypirc','Cookies','Login Data','Local State'}
def digest(s): return hashlib.sha256(s.encode()).hexdigest()
def execute(req):
 root=req['root']; rel=req.get('path','.')
 if os.path.isabs(rel) or '\x00' in rel: raise ValueError('Absolute path denied')
 parts=rel.split('/')
 if any(p in ('','..') or p in DENY or p.startswith('.env') or p.endswith(('.pem','.key','.sqlite','.sqlite3')) for p in parts): raise ValueError('Protected or traversing path denied')
 rootfd=os.open(root,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW)
 parent=rootfd; leaf=parts[-1]
 try:
  for part in parts[:-1]:
   fd=os.open(part,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW,dir_fd=parent)
   if parent!=rootfd:os.close(parent)
   parent=fd
  def read():
   try: fd=os.open(leaf,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK,dir_fd=parent)
   except FileNotFoundError:return None
   try:
    st=os.fstat(fd)
    if not stat.S_ISREG(st.st_mode) or st.st_nlink!=1 or st.st_size>MAX:raise ValueError('Unsafe file type, hardlink or size')
    with os.fdopen(fd,'rb',closefd=False) as f:return f.read(MAX+1).decode('utf-8')
   finally:os.close(fd)
  if req['op']=='list':
   fd=os.open(leaf,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW,dir_fd=parent)
   try:return {'entries':[p for p in os.listdir(fd) if p not in DENY and not p.startswith('.env')][:300]}
   finally:os.close(fd)
  before=read()
  if req['op']=='read':return {'content':before,'hash':None if before is None else digest(before)}
  if req['op']!='write':raise ValueError('Unknown operation')
  if before!=req['expected']:raise ValueError('Conflict: file changed since preview')
  content=req['content']
  if len(content.encode())>MAX:raise ValueError('File too large')
  temp='.chai-'+secrets.token_hex(12)
  fd=os.open(temp,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600,dir_fd=parent)
  try:
   with os.fdopen(fd,'wb',closefd=False) as f:f.write(content.encode());f.flush();os.fsync(fd)
  finally:os.close(fd)
  try:
   if read()!=before:raise ValueError('Conflict during atomic write')
   os.replace(temp,leaf,src_dir_fd=parent,dst_dir_fd=parent);os.fsync(parent)
  finally:
   try:os.unlink(temp,dir_fd=parent)
   except FileNotFoundError:pass
  return {'before':before,'hash':digest(content),'bytes':len(content.encode())}
 finally:
  if parent!=rootfd:os.close(parent)
  os.close(rootfd)
try:
 print(json.dumps(execute(json.load(sys.stdin))))
except Exception as e:
 print(json.dumps({'error':str(e)}));sys.exit(1)
