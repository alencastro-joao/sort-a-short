import os
import csv
import shutil
import subprocess
import boto3
from datetime import datetime
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor

# --- CARREGA VARIÁVEIS DE AMBIENTE ---
load_dotenv()

# ==============================================================================
# ⚙️ CONFIGURAÇÃO
# ==============================================================================

# Cole seu caminho do FFmpeg aqui se necessário, ou deixe apenas 'ffmpeg' se estiver no PATH
FFMPEG_PATH = r"C:\Users\Alencastro\Desktop\Sort a Short\files\uploader\ffmpeg\bin\ffmpeg.exe" 

# Configurações AWS e Pastas
BUCKET_NAME = os.getenv('AWS_BUCKET_NAME')
AWS_REGION = os.getenv('AWS_REGION', 'us-east-1')
INPUT_FOLDER = 'input'
TEMP_OUTPUT_FOLDER = 'temp_dash'
INDEX_FILE = 'index.csv'

# Cliente S3
s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name=AWS_REGION
)

def clean_root_mess():
    """Remove arquivos .m4s ou .mpd que vazaram para a raiz do projeto."""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    for filename in os.listdir(current_dir):
        if filename.endswith('.m4s') or filename.endswith('.mpd'):
            try: os.remove(os.path.join(current_dir, filename))
            except: pass

def load_processed_videos():
    """Lê o CSV e retorna uma lista de arquivos já processados."""
    processed = set()
    if not os.path.exists(INDEX_FILE):
        with open(INDEX_FILE, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['Arquivo Original', 'Data Upload', 'URL Manifesto (S3)'])
        return processed

    with open(INDEX_FILE, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader, None) 
        for row in reader:
            if row: processed.add(row[0])
    return processed

def save_to_index(original_filename, s3_url):
    """Salva o registro no CSV."""
    with open(INDEX_FILE, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([original_filename, datetime.now().strftime("%Y-%m-%d %H:%M:%S"), s3_url])

def convert_to_dash(input_path, output_dir):
    """
    Converte MP4 para DASH.
    CORREÇÃO CRÍTICA: Usa 'cwd' para rodar o comando de dentro da pasta.
    Isso garante links limpos no arquivo .mpd.
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # Define executável
    executable = FFMPEG_PATH if os.path.exists(FFMPEG_PATH) else 'ffmpeg'

    # Caminho absoluto é necessário porque vamos mudar o diretório de trabalho (cwd)
    abs_input_path = os.path.abspath(input_path)

    print(f"   🛠️  Convertendo {os.path.basename(input_path)}...")
    
    # Nomes limpos (apenas o arquivo, sem pastas)
    manifest_name = "playlist.mpd"
    init_seg_name = "init-$RepresentationID$.m4s"
    media_seg_name = "chunk-$RepresentationID$-$Number$.m4s"

    command = [
        executable, '-y', 
        '-i', abs_input_path,
        '-map', '0:v', '-map', '0:a',
        '-c:v', 'libx264', '-b:v', '3000k', '-preset', 'fast',
        '-c:a', 'aac', '-b:a', '128k',
        '-f', 'dash',
        '-use_template', '1',
        '-use_timeline', '1',
        '-seg_duration', '4',
        '-init_seg_name', init_seg_name,
        '-media_seg_name', media_seg_name,
        manifest_name
    ]

    try:
        # cwd=output_dir é o segredo! Roda o FFmpeg "estando dentro" da pasta temp
        result = subprocess.run(
            command, 
            cwd=output_dir, 
            stdout=subprocess.DEVNULL, 
            stderr=subprocess.PIPE
        )
        
        if result.returncode != 0:
            print(f"   ❌ Erro no FFmpeg: {result.stderr.decode('utf-8', errors='ignore')}")
            return False
        return True
    except Exception as e:
        print(f"   ❌ Erro ao rodar FFmpeg: {e}")
        return False

def upload_directory_parallel(local_directory, s3_folder):
    """Faz upload recursivo e paralelo da pasta gerada."""
    print(f"   ☁️  Iniciando upload para s3://{BUCKET_NAME}/{s3_folder}/ ...")
    
    files_to_upload = []
    for root, dirs, files in os.walk(local_directory):
        for file in files:
            local_path = os.path.join(root, file)
            relative_path = os.path.relpath(local_path, local_directory)
            s3_key = f"{s3_folder}/{relative_path}".replace("\\", "/")
            files_to_upload.append((local_path, s3_key))

    with ThreadPoolExecutor(max_workers=15) as executor:
        futures = []
        for path, key in files_to_upload:
            # Define Content-Type correto
            ctype = 'application/octet-stream'
            if path.endswith('.mpd'): ctype = 'application/dash+xml'
            elif path.endswith('.m4s'): ctype = 'video/iso.segment'
            elif path.endswith('.mp4'): ctype = 'video/mp4'

            futures.append(executor.submit(s3_client.upload_file, path, BUCKET_NAME, key, ExtraArgs={'ContentType': ctype}))
        
        # Checa resultados
        for future in futures:
            try:
                future.result()
            except Exception as e:
                print(f"      ❌ Erro no upload: {e}")
                return False
    return True

def main():
    print("🎥 --- INICIANDO UPLOADER (PATH FIX v3) --- 🎥")
    
    # Limpeza inicial
    clean_root_mess()
    
    processed_videos = load_processed_videos()
    
    if not os.path.exists(INPUT_FOLDER):
        os.makedirs(INPUT_FOLDER)
        print(f"Pasta '{INPUT_FOLDER}' criada.")
        return

    files = [f for f in os.listdir(INPUT_FOLDER) if f.endswith('.mp4')]
    files_to_process = [f for f in files if f not in processed_videos]

    if not files_to_process:
        print("✅ Nenhum arquivo novo para processar.")
        return

    print(f"📋 Arquivos na fila: {len(files_to_process)}")

    for filename in files_to_process:
        print(f"\n⏯️  Processando: {filename}")
        
        # Cria slug limpo para a pasta (ex: o_filme_legal)
        video_slug = os.path.splitext(filename)[0].replace(" ", "_").lower()
        
        input_path = os.path.join(INPUT_FOLDER, filename)
        temp_dir = os.path.join(TEMP_OUTPUT_FOLDER, video_slug)
        
        # 1. Converter (Gerando estrutura limpa)
        if convert_to_dash(input_path, temp_dir):
            
            # 2. Upload
            s3_folder = f"videos/{video_slug}"
            if upload_directory_parallel(temp_dir, s3_folder):
                
                # URL Final Limpa
                final_url = f"https://{BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{s3_folder}/playlist.mpd"
                
                save_to_index(filename, final_url)
                print(f"   ✅ Concluído! URL salva no índice.")
                print(f"      👉 {final_url}")
                
                # Limpa pasta temp
                try: shutil.rmtree(temp_dir)
                except: pass
            else:
                print("   ❌ Falha no upload.")
        else:
            print("   ❌ Falha na conversão.")
        
    # Remove pasta temp pai se vazia
    try:
        if os.path.exists(TEMP_OUTPUT_FOLDER) and not os.listdir(TEMP_OUTPUT_FOLDER):
            os.rmdir(TEMP_OUTPUT_FOLDER)
    except: pass

    print("\n🏁 --- FIM ---")

if __name__ == "__main__":
    main()