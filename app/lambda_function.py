import boto3
import json
import os
import re
import base64
import mimetypes
from datetime import datetime
from decimal import Decimal
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key, Attr

# --- CONFIGURAÇÃO ---
BUCKET_NAME = "sort-a-short" 
FILE_NAME = "shorts.json"
TABLE_NAME = "sort-a-short-db"
COGNITO_CLIENT_ID = "3i2m7sfkp66qa9uhfvvb7g6d9c" 

# --- HEADERS ANTI-CACHE ---
NO_CACHE_HEADERS = {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
}

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(TABLE_NAME)
cognito = boto3.client('cognito-idp')

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal): return float(obj)
        return super(DecimalEncoder, self).default(obj)

def get_file_content(filename):
    if os.path.exists(filename):
        with open(filename, 'r', encoding='utf-8') as f: return f.read()
    return None

def get_catalogo():
    try:
        response = s3.get_object(Bucket=BUCKET_NAME, Key=FILE_NAME)
        return json.loads(response['Body'].read().decode('utf-8'))
    except: return {}

def lambda_handler(event, context):
    raw_path = event.get('rawPath', '/')
    path = event.get('path', raw_path)
    method = event.get('requestContext', {}).get('http', {}).get('method', 'GET')
    
    body = {}
    if event.get('body'):
        try: body = json.loads(event.get('body'))
        except: pass

    print(f"DEBUG: {method} {path}")

    # --- ROTA 0: ARQUIVOS ESTÁTICOS ---
    clean_path = path.lstrip('/')
    abs_path = os.path.abspath(os.path.join(os.getcwd(), clean_path))
    if os.path.exists(abs_path) and os.getcwd() in abs_path and os.path.isfile(abs_path):
        mime_type = "text/plain"
        if clean_path.endswith(".js"): mime_type = "application/javascript"
        elif clean_path.endswith(".css"): mime_type = "text/css"
        elif clean_path.endswith(".html"): mime_type = "text/html"
        elif clean_path.endswith(".png"): mime_type = "image/png"
        elif clean_path.endswith(".jpg"): mime_type = "image/jpeg"
        elif clean_path.endswith(".ico"): mime_type = "image/x-icon"
        else: mime_type, _ = mimetypes.guess_type(abs_path)
        try:
            read_mode = 'rb' if 'image' in str(mime_type) else 'r'
            encoding = None if 'image' in str(mime_type) else 'utf-8'
            with open(abs_path, read_mode, encoding=encoding) as f: content = f.read()
            is_b64 = False
            if 'image' in str(mime_type):
                content = base64.b64encode(content).decode('utf-8')
                is_b64 = True
            return { "statusCode": 200, "headers": { "Content-Type": str(mime_type), "Cache-Control": "public, max-age=86400" }, "body": content, "isBase64Encoded": is_b64 }
        except: pass

    # --- ROTA 1: RATING ---
    if path == '/api/rating':
        if method == 'POST':
            user_email = body.get('email'); movie_id = body.get('movie_id')
            rating = body.get('rating'); review = body.get('review', '')
            if not user_email or not movie_id or rating is None: return {"statusCode": 400, "body": "Erro dados", "headers": NO_CACHE_HEADERS}
            try:
                timestamp = datetime.now().isoformat()
                table.put_item(Item={'pk': f"RATING#{movie_id}", 'sk': f"USER#{user_email}", 'rating': Decimal(str(rating)), 'review': review, 'timestamp': timestamp})
                review_obj = {'movie_id': movie_id, 'rating': Decimal(str(rating)), 'review': review, 'timestamp': timestamp}
                table.update_item(Key={'pk': f"USER#{user_email}", 'sk': 'PROFILE'}, UpdateExpression="SET reviews = list_append(if_not_exists(reviews, :empty), :r)", ExpressionAttributeValues={':r': [review_obj], ':empty': []})
                return {"statusCode": 200, "body": json.dumps({"status": "ok"}), "headers": NO_CACHE_HEADERS}
            except Exception as e: return {"statusCode": 500, "body": str(e), "headers": NO_CACHE_HEADERS}

    # --- ROTA 2: AUTH ---
    if path == '/api/auth/signup' and method == 'POST':
        try:
            cognito.sign_up(ClientId=COGNITO_CLIENT_ID, Username=body.get('email'), Password=body.get('password'), UserAttributes=[{'Name':'email','Value':body.get('email')}])
            return {"statusCode": 200, "body": json.dumps({"msg": "Criado"}), "headers": NO_CACHE_HEADERS}
        except ClientError as e: return {"statusCode": 400, "body": str(e), "headers": NO_CACHE_HEADERS}
    if path == '/api/auth/confirm' and method == 'POST':
        try:
            cognito.confirm_sign_up(ClientId=COGNITO_CLIENT_ID, Username=body.get('email'), ConfirmationCode=body.get('code'))
            return {"statusCode": 200, "body": json.dumps({"msg": "Confirmado"}), "headers": NO_CACHE_HEADERS}
        except ClientError as e: return {"statusCode": 400, "body": str(e), "headers": NO_CACHE_HEADERS}
    if path == '/api/auth/signin' and method == 'POST':
        try:
            resp = cognito.initiate_auth(ClientId=COGNITO_CLIENT_ID, AuthFlow='USER_PASSWORD_AUTH', AuthParameters={'USERNAME': body.get('email'), 'PASSWORD': body.get('password')})
            return { "statusCode": 200, "body": json.dumps({"token": resp['AuthenticationResult']['AccessToken'], "email": body.get('email')}), "headers": NO_CACHE_HEADERS }
        except ClientError as e: return {"statusCode": 400, "body": str(e), "headers": NO_CACHE_HEADERS}

    # --- ROTA 3: PERFIL (Recuperar Dados) ---
    if path == '/api/history':
        if method == 'GET':
            user_email = event.get('queryStringParameters', {}).get('email')
            if not user_email: return {"statusCode": 400, "body": "Email required", "headers": NO_CACHE_HEADERS}
            try:
                resp = table.get_item(Key={'pk': f"USER#{user_email}", 'sk': 'PROFILE'})
                item = resp.get('Item', {})
                return {
                    "statusCode": 200, 
                    "body": json.dumps({
                        "watched": item.get('watched', []),
                        "reviews": item.get('reviews', []),
                        "username": item.get('username', None),
                        "avatar": int(item.get('avatar', 0)),
                        "color": item.get('color', '#333') # Retorna a cor do usuário
                    }, cls=DecimalEncoder),
                    "headers": NO_CACHE_HEADERS
                }
            except Exception as e: return {"statusCode": 500, "body": str(e), "headers": NO_CACHE_HEADERS}
        if method == 'POST':
            try:
                table.update_item(Key={'pk': f"USER#{body.get('email')}", 'sk': 'PROFILE'}, UpdateExpression="SET watched = list_append(if_not_exists(watched, :empty), :movie)", ExpressionAttributeValues={':movie': [body.get('movie_id')], ':empty': []})
                return {"statusCode": 200, "body": "Saved", "headers": NO_CACHE_HEADERS}
            except Exception as e: return {"statusCode": 500, "body": str(e), "headers": NO_CACHE_HEADERS}

    # --- ROTA 4: ATUALIZAR PERFIL (NOME + AVATAR + COR) ---
    if path == '/api/profile' and method == 'POST':
        email = body.get('email')
        new_username = body.get('username', '').strip().lower()
        new_avatar = int(body.get('avatar', 0))
        new_color = body.get('color', '#333') # Recebe a cor do frontend

        if not re.match("^[a-z0-9_]{3,15}$", new_username): return {"statusCode": 400, "body": "Nome invalido", "headers": NO_CACHE_HEADERS}
        try:
            user_resp = table.get_item(Key={'pk': f"USER#{email}", 'sk': 'PROFILE'})
            old_username = user_resp.get('Item', {}).get('username')
            
            if old_username != new_username:
                try:
                    # Salva avatar e cor na tabela de reserva para a pesquisa funcionar bonito
                    table.put_item(Item={
                        'pk': f"USERNAME#{new_username}", 'sk': 'RESERVED', 
                        'email': email, 'avatar': new_avatar, 'color': new_color
                    }, ConditionExpression='attribute_not_exists(pk)')
                    if old_username:
                        try: table.delete_item(Key={'pk': f"USERNAME#{old_username}", 'sk': 'RESERVED'})
                        except: pass
                except ClientError: return {"statusCode": 409, "body": "Nome ja existe", "headers": NO_CACHE_HEADERS}
            else:
                if new_username:
                    try: table.update_item(Key={'pk': f"USERNAME#{new_username}", 'sk': 'RESERVED'}, UpdateExpression="SET avatar = :a, color = :c", ExpressionAttributeValues={':a': new_avatar, ':c': new_color})
                    except: pass

            # Atualiza perfil completo
            table.update_item(
                Key={'pk': f"USER#{email}", 'sk': 'PROFILE'}, 
                UpdateExpression="SET username = :u, avatar = :a, color = :c", 
                ExpressionAttributeValues={':u': new_username, ':a': new_avatar, ':c': new_color}
            )
            return {"statusCode": 200, "body": json.dumps({"status": "success", "username": new_username}), "headers": NO_CACHE_HEADERS}
        except Exception as e: return {"statusCode": 500, "body": str(e), "headers": NO_CACHE_HEADERS}

    # --- ROTA 5: PESQUISA ---
    if path == '/api/users/search' and method == 'GET':
        query = event.get('queryStringParameters', {}).get('q', '').strip().lower()
        if not query or len(query) < 2: return {"statusCode": 200, "body": json.dumps([]), "headers": NO_CACHE_HEADERS}
        try:
            response = table.scan(FilterExpression=Attr('pk').begins_with('USERNAME#') & Attr('pk').contains(query) & Attr('sk').eq('RESERVED'))
            results = []
            for item in response.get('Items', []):
                clean_name = item['pk'].replace('USERNAME#', '')
                results.append({ 
                    "username": clean_name, 
                    "email": item.get('email'), 
                    "avatar": int(item.get('avatar', 0)),
                    "color": item.get('color', '#333')
                })
            return {"statusCode": 200, "body": json.dumps(results, cls=DecimalEncoder), "headers": NO_CACHE_HEADERS}
        except Exception as e: return {"statusCode": 500, "body": str(e), "headers": NO_CACHE_HEADERS}

    # --- FRONTEND ---
    html = get_file_content('index.html')
    if not html: return {"statusCode": 500, "body": "Index lost"}
    movie_id = event.get('queryStringParameters', {}).get('movie')
    if len(path.strip('/')) > 1 and not path.startswith('/api/') and '.' not in path: movie_id = path.strip('/')
    meta = { "t": "Sort a Short", "d": "Curadoria de animacao.", "i": "" }
    if movie_id:
        cat = get_catalogo()
        if movie_id in cat: meta = { "t": cat[movie_id]['titulo'], "d": cat[movie_id]['ano'], "i": "" }
    final_html = html.replace("{{META_TITLE}}", meta["t"]).replace("{{META_DESC}}", meta["d"]).replace("{{META_IMAGE}}", meta["i"])
    return { "statusCode": 200, "headers": {"Content-Type": "text/html; charset=utf-8"}, "body": final_html }