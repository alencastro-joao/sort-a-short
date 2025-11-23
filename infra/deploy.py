import boto3
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
lambda_client = boto3.client('lambda')
cf = boto3.client('cloudfront')

# --- Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)-8s %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger('deploy')


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

    if not os.path.exists(APP_DIR):
        logger.error("❌ Erro: Pasta %s não encontrada.", APP_DIR)
        return

    zip_filename = os.path.join(BASE_DIR, "app_package")
    shutil.make_archive(zip_filename, 'zip', APP_DIR)

    try:
        with open(f"{zip_filename}.zip", "rb") as f:
            zip_content = f.read()
        lambda_client.update_function_code(FunctionName=LAMBDA_NAME, ZipFile=zip_content)
        logger.info("   ✅ Código atualizado.")
    except Exception as e:
        logger.exception("   ❌ Erro Lambda: %s", e)
    finally:
        if os.path.exists(f"{zip_filename}.zip"):
            os.remove(f"{zip_filename}.zip")

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