# Guia de Deploy

## Executar Deploy Completo

```powershell
cd 'C:\Users\Alencastro\Desktop\Sort a Short'
python infra\deploy.py
```

## Opções de Execução

### 1. **Pular atualização de Lambda** (útil se travando)
Se o deploy ficar travado na etapa "Atualizando Lambda", execute com:

```powershell
$env:SKIP_LAMBDA='1'
python infra\deploy.py
```

Isso faz upload de vídeos e posters, mas pula a atualização do código Lambda. Útil para:
- Depurar problemas sem esperar o upload do Lambda
- Testar apenas conversões de vídeo
- Testes rápidos

### 2. **Deploy Completo** (padrão)
Executa todas as 3 etapas:
1. 📦 Sincroniza mídia (vídeos, posters) com S3
2. ⚡ Atualiza código Lambda
3. 🔄 Limpa cache CloudFront

## Rastreamento de Uploads

### Vídeos
Os vídeos já convertidos são rastreados automaticamente. Apenas novos vídeos são convertidos e enviados.

### Posters
Os posters já enviados são rastreados em `infra/posters_uploaded.csv`. 

Para forçar reenvio de todos os posters:
```powershell
Remove-Item 'C:\Users\Alencastro\Desktop\Sort a Short\infra\posters_uploaded.csv'
python infra\deploy.py
```

## Solução de Problemas

### "Atualizando Lambda" travado
Se ficar preso por mais de 5 minutos na etapa [2/3]:

1. Interrompa a execução (Ctrl+C)
2. Execute com `SKIP_LAMBDA=1` para pular essa etapa
3. Verifique a conexão AWS
4. Tente novamente normalmente

### Nenhum poster sendo enviado
- Verifique se os arquivos `.jpg`/`.jpeg` estão em:
  - `project_root/posters`
  - `project_root/uploader/input`
  - `project_root/input`
  - `project_root/import`
  - `project_root/uploader/import`

- Verifique o arquivo `infra/posters_uploaded.csv` — se o poster está lá, foi enviado antes

### Nenhum vídeo sendo convertido
- Verifique se os vídeos `.mp4` estão em `uploader/input`
- Certifique-se que FFmpeg está instalado ou disponível em `uploader/ffmpeg/bin/ffmpeg.exe`
- Verifique o arquivo `uploader/uploaded_videos.csv` para saber quais vídeos já foram processados
