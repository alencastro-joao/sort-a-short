
import boto3
import os
from botocore.exceptions import NoCredentialsError, ClientError
from dotenv import load_dotenv

load_dotenv()


def upload_file(file_name, bucket, object_name=None, content_type=None):
    """
    Envia um arquivo para um bucket S3 específico com o ContentType correto.
    """
    if object_name is None:
        object_name = os.path.basename(file_name)

    # Puxa credenciais do .env
    s3_client = boto3.client(
        's3',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name=os.getenv('AWS_REGION', 'us-east-1')
    )

    # Define Content-Type
    if not content_type:
        if file_name.endswith('.html'):
            content_type = 'text/html'
        elif file_name.endswith('.json'):
            content_type = 'application/json'
        else:
            content_type = 'application/octet-stream'

    extra_args = {'ContentType': content_type}

    try:
        print(f"Iniciando upload de '{file_name}' para '{bucket}'...")
        s3_client.upload_file(
            file_name,
            bucket,
            object_name,
            ExtraArgs=extra_args
        )
        print(f"✅ Sucesso: {file_name} enviado para s3://{bucket}/{object_name}")
        return True
    except FileNotFoundError:
        print(f"❌ Erro: O arquivo '{file_name}' não foi encontrado.")
        return False
    except NoCredentialsError:
        print("❌ Erro: Credenciais da AWS não encontradas.")
        return False
    except ClientError as e:
        print(f"❌ Erro na AWS: {e}")
        return False


if __name__ == "__main__":
    uploads = [
        ("../index.html", "sort-a-short-site-beta", "index.html", "text/html"),
        ("../shorts.json", "sort-a-short", "shorts.json", "application/json")
    ]

    print("--- Iniciando Deploy ---")
    for file, bucket, object_name, content_type in uploads:
        abs_path = os.path.abspath(os.path.join(os.path.dirname(__file__), file))
        if os.path.exists(abs_path):
            upload_file(abs_path, bucket, object_name, content_type)
        else:
            print(f"⚠️ Aviso: Arquivo {abs_path} não encontrado.")
    print("--- Fim do Processo ---")