"""Windows external encrypted backup pull; dedicated forced-command SSH key."""
import hashlib,json,os,sys,time,logging
from pathlib import Path
from datetime import datetime,timezone
import paramiko

def pull(directory):
    directory=Path(directory).resolve()
    host='164.163.9.7'
    logging.getLogger('paramiko.transport').handlers=[logging.NullHandler()]
    logging.getLogger('paramiko.transport').propagate=False
    client=paramiko.SSHClient()
    client.load_host_keys(str(Path.home()/'.ssh/known_hosts'))
    client.set_missing_host_key_policy(paramiko.RejectPolicy())
    if not client.get_host_keys().lookup(host):raise RuntimeError('Host must already be pinned')
    key=paramiko.Ed25519Key.from_private_key_file(str(directory/'backup-pull-key'))
    try:
        client.connect(host,username='terrania_backup',pkey=key,allow_agent=False,look_for_keys=False,timeout=15)
        _,stdout,stderr=client.exec_command('latest',timeout=60)
        target=directory/'incoming.cms.tmp';digest=hashlib.sha256();size=0
        try:
            with target.open('wb') as output:
                while chunk:=stdout.read(65536):
                    size+=len(chunk)
                    if size>1024**3:raise RuntimeError('Backup exceeds local transfer limit')
                    digest.update(chunk);output.write(chunk)
            if stdout.channel.recv_exit_status()!=0 or size<100:raise RuntimeError('Backup transfer failed')
            # Content address prevents redundant copies of an unchanged snapshot.
            final=directory/('terrania-'+digest.hexdigest()+'.cms')
            if final.exists():target.unlink()
            else:os.replace(target,final)
            result={'success':True,'bytes':size,'sha256':digest.hexdigest(),'file':final.name,
                    'checkedAt':datetime.now(timezone.utc).isoformat()}
            (directory/'last-pull.json').write_text(json.dumps(result,indent=2));return result
        finally:
            if target.exists():target.unlink()
    finally:client.close()

if __name__=='__main__':
    folder=Path(sys.argv[1]).resolve()
    try:print(json.dumps(pull(folder)))
    except Exception as error:
        (folder/'last-pull-error.json').write_text(json.dumps({'success':False,'errorType':type(error).__name__,
            'checkedAt':datetime.now(timezone.utc).isoformat()}));print('Encrypted backup pull failed; see private status file');sys.exit(1)
