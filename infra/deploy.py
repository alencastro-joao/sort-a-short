import boto3
from botocore.config import Config
import os
import shutil
import time
import mimetypes
import logging
import subprocess

# --- SUAS CONFIGURAÇÕES (Preencha seus dados) ---
BUCKET_NAME = "sort-a-short"       
LAMBDA_NAME = "sort-a-short-web"         
CLOUDFRONT_ID = "EY2ZYDW8F3P9M"         

# --- DEFINIÇÃO DE CAMINHOS ---
# O script está em /infra. A raiz do projeto é um nível acima (../)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))
APP_DIR = os.path.join(PROJECT_ROOT, "app")

# LISTA DE O QUE VAI PRO S3 (Para não subir lixo como .git ou infra/)
S3_TARGETS = ["shorts.json", "videos", "posters"]

# Clientes AWS
s3 = boto3.client('s3')
lambda_client = boto3.client('lambda', config=Config(connect_timeout=60, read_timeout=300))
cf = boto3.client('cloudfront')

# --- Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)-8s %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger('deploy')


def upload_posters():
    """Upload automático de posters (.jpg / .jpeg).

    Procura posters em vários diretórios possíveis (prioridade):
    - project_root/posters
    - project_root/uploader/input
    - project_root/input
    - project_root/import
    - project_root/uploader/import

    Todos os arquivos `.jpg` e `.jpeg` encontrados são enviados para a chave S3 `posters/{filename}`.
    """
    candidate_dirs = [
        os.path.join(PROJECT_ROOT, 'posters'),
        os.path.join(PROJECT_ROOT, 'uploader', 'input'),
        os.path.join(PROJECT_ROOT, 'input'),
        os.path.join(PROJECT_ROOT, 'import'),
        os.path.join(PROJECT_ROOT, 'uploader', 'import'),
    ]

    found = []  # list of tuples (filename, fullpath)
    seen = set()

    # arquivo de controle para evitar re-envios repetidos
    tracker_path = os.path.join(BASE_DIR, 'posters_uploaded.csv')
    uploaded_seen = set()
    if os.path.exists(tracker_path):
        try:
            with open(tracker_path, 'r', encoding='utf-8') as t:
                for line in t:
                    name = line.strip().split(',')[0]
                    if name:
                        uploaded_seen.add(name)
        except Exception:
            logger.exception("   ⚠️ Falha ao ler arquivo de controle de posters: %s", tracker_path)

    for d in candidate_dirs:
        if not os.path.exists(d):
            continue
        try:
            for f in os.listdir(d):
                # aceitar .jpg e .jpeg (case-insensitive)
                if not (f.lower().endswith('.jpg') or f.lower().endswith('.jpeg')):
                    continue
                if f in seen:
                    continue
                seen.add(f)
                found.append((f, os.path.join(d, f)))
        except Exception:
            logger.exception("   ⚠️ Falha ao listar pasta de posters: %s", d)

    if not found:
        logger.info("   ✅ Nenhum poster encontrado nas pastas verificadas.")
        return

    # filtrar apenas posters novos (não registrados no CSV)
    new_posters = [(f, p) for (f, p) in found if f not in uploaded_seen]
    if not new_posters:
        logger.info("   ✅ Nenhum poster novo para upload (todos já registrados).")
        return

    logger.info("   🖼️  Encontrados %d poster(s) novos para upload (de %d encontrados).", len(new_posters), len(found))

    for poster_file, local_path in new_posters:
        s3_key = f"posters/{poster_file}"
        try:
            logger.info("      → Uploading: %s (from %s)", poster_file, local_path)
            # enviar como image/jpeg para .jpg/.jpeg
            s3.upload_file(local_path, BUCKET_NAME, s3_key, ExtraArgs={'ContentType': 'image/jpeg'})
            logger.info("         ✅ Enviado: %s", poster_file)

            # registrar no CSV de controle
            try:
                with open(tracker_path, 'a', encoding='utf-8') as t:
                    t.write(f"{poster_file},{int(time.time())}\n")
            except Exception:
                logger.exception("         ⚠️ Falha ao gravar registro de poster para %s", poster_file)

        except Exception as e:
            logger.exception("         ❌ Falha no upload de %s: %s", poster_file, e)


def run_uploader():
    """Executa o uploader/main.py para upload automático dos vídeos."""
    uploader_path = os.path.abspath(os.path.join(PROJECT_ROOT, 'uploader', 'main.py'))
    logger.info("🎬 [Uploader] Enviando vídeos automaticamente...")
    # Usamos Popen para poder transmitir saída em tempo real ao terminal.
    try:
        # Forçar saída em UTF-8 para evitar UnicodeEncodeError no Windows
        env = os.environ.copy()
        env['PYTHONIOENCODING'] = 'utf-8'
        env['PYTHONUTF8'] = '1'

        proc = subprocess.Popen(
            ['python', uploader_path],
            cwd=os.path.dirname(uploader_path),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding='utf-8',
            errors='replace',
            bufsize=1,
            env=env
        )

        # Stream linha-a-linha para o logger (e assim para o terminal)
        assert proc.stdout is not None
        for line in proc.stdout:
            print(line.rstrip())
            logger.info("[uploader] %s", line.rstrip())

        proc.wait()
        if proc.returncode == 0:
            logger.info("   ✅ Uploader finalizado com sucesso!")
            return True
        else:
            logger.error("   ❌ Uploader retornou erro! exit=%s", proc.returncode)
            return False
    except Exception as e:
        logger.exception("Falha ao executar uploader: %s", e)
        return False

def sync_s3():
    logger.info("\n📦 [1/3] Sincronizando Mídia com a Raiz do S3...")
    for item in S3_TARGETS:
        try:
            if item == "videos":
                ok = run_uploader()  # Chama o uploader para lidar com vídeos
                if not ok:
                    logger.warning("Uploader reportou problemas ao subir vídeos.")
                continue
            if item == "posters":
                upload_posters()  # Chama a função para fazer upload dos posters
                continue
            local_item_path = os.path.join(PROJECT_ROOT, item)
            if not os.path.exists(local_item_path):
                logger.info("Pular item ausente: %s", item)
                continue
            if os.path.isfile(local_item_path):
                content_type, _ = mimetypes.guess_type(local_item_path)
                if not content_type:
                    if local_item_path.endswith('.json'): content_type = 'application/json'
                    elif local_item_path.endswith('.jpg'): content_type = 'image/jpeg'
                    else: content_type = 'application/octet-stream'
                logger.info("   -> Uploading: %s (%s)", item, content_type)
                try:
                    s3.upload_file(local_item_path, BUCKET_NAME, item, ExtraArgs={'ContentType': content_type})
                    logger.info("      ✅ Uploaded: %s", item)
                except Exception as e:
                    logger.exception("      ❌ Falha upload %s: %s", item, e)
        except Exception as e:
            logger.exception("Erro processando item %s: %s", item, e)

def update_lambda():
    logger.info("\n⚡ [2/3] Atualizando Lambda...")

    # verificar se deve pular atualização de Lambda (útil para testes)
    skip_lambda = os.environ.get('SKIP_LAMBDA', '').lower() in ('1', 'true', 'yes')
    if skip_lambda:
        logger.info("   ⏭️  Pulando atualização de Lambda (SKIP_LAMBDA=1)")
        return

    if not os.path.exists(APP_DIR):
        logger.error("❌ Erro: Pasta %s não encontrada.", APP_DIR)
        return

    zip_filename = os.path.join(BASE_DIR, "app_package")
    logger.info("   📦 Criando arquivo ZIP...")
    shutil.make_archive(zip_filename, 'zip', APP_DIR)
    
    zip_path = f"{zip_filename}.zip"
    try:
        zip_size_mb = os.path.getsize(zip_path) / (1024 * 1024)
        logger.info("      Tamanho do ZIP: %.2f MB", zip_size_mb)

        logger.info("   📤 Fazendo upload para Lambda (isso pode levar alguns minutos)...")
        with open(zip_path, "rb") as f:
            zip_content = f.read()
        
        # definir timeout de 300 segundos (5 minutos) para a operação de update
        lambda_client.update_function_code(
            FunctionName=LAMBDA_NAME, 
            ZipFile=zip_content
        )
        logger.info("   ✅ Código atualizado com sucesso.")
    except Exception as e:
        logger.error("   ❌ Erro ao atualizar Lambda: %s", str(e))
        logger.info("   💡 Dica: se tiver travando, rode novamente com SKIP_LAMBDA=1 para pular e depurar")
    finally:
        if os.path.exists(zip_path):
            os.remove(zip_path)
            logger.info("   🗑️  Arquivo ZIP removido.")

def invalidate_cache():
    logger.info("\n🔄 [3/3] Limpando Cache CloudFront...")
    try:
        cf.create_invalidation(
            DistributionId=CLOUDFRONT_ID,
            InvalidationBatch={
                'Paths': {'Quantity': 1, 'Items': ['/*']},
                'CallerReference': str(time.time())
            }
        )
        logger.info("   ✅ Cache limpo.")
    except Exception as e:
        logger.exception("   ❌ Erro CloudFront: %s", e)

if __name__ == "__main__":
    try:
        logger.info("Iniciando deploy...")
        sync_s3()
        update_lambda()
        invalidate_cache()
        logger.info("\n🚀 DEPLOY FINALIZADO!")
    except Exception as e:
        logger.exception("Erro inesperado durante o deploy: %s", e)