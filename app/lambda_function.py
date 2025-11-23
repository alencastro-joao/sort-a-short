import boto3
import json
import os
import re
import base64
import mimetypes
import time
import traceback
import random
from datetime import datetime
from decimal import Decimal
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key, Attr

# --- CONFIGURAÇÃO ---
BUCKET_NAME = "sort-a-short" 
FILE_NAME = "shorts.json"
TABLE_NAME = "sort-a-short-db"
COGNITO_CLIENT_ID = "3i2m7sfkp66qa9uhfvvb7g6d9c" 

MAX_ENERGY = 3
RECHARGE_SECONDS = 6 * 60 * 60 

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

def calculate_energy(current_val, last_ts):
    now = int(time.time())
    if last_ts is None: last_ts = now
    last_ts = int(last_ts)
    elapsed = now - last_ts
    gained = elapsed // RECHARGE_SECONDS
    new_energy = min(MAX_ENERGY, int(current_val) + gained)
    if new_energy >= MAX_ENERGY: new_ts = now
    else: new_ts = last_ts + (gained * RECHARGE_SECONDS)
    return new_energy, new_ts

def lambda_handler(event, context):
    try:
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
                    # Salva na tabela geral de ratings
                    table.put_item(Item={'pk': f"RATING#{movie_id}", 'sk': f"USER#{user_email}", 'rating': Decimal(str(rating)), 'review': review, 'timestamp': timestamp})
                    # Salva dentro do perfil do usuário para facilitar o feed
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

        # --- ROTA 3: PERFIL ---
        if path == '/api/history':
            if method == 'GET':
                user_email = event.get('queryStringParameters', {}).get('email')
                if not user_email: return {"statusCode": 400, "body": "Email required", "headers": NO_CACHE_HEADERS}
                try:
                    resp = table.get_item(Key={'pk': f"USER#{user_email}", 'sk': 'PROFILE'})
                    item = resp.get('Item', {})
                    friend_code = item.get('friend_code')
                    if not friend_code:
                        friend_code = str(random.randint(100000, 999999))
                        try: table.update_item(Key={'pk': f"USER#{user_email}", 'sk': 'PROFILE'}, UpdateExpression="SET friend_code = :c", ExpressionAttributeValues={':c': friend_code})
                        except: pass
                    
                    db_energy = item.get('energy', MAX_ENERGY)
                    db_ts = item.get('energy_ts', int(time.time()))
                    real_energy, real_ts = calculate_energy(db_energy, db_ts)
                    if real_energy != db_energy or real_ts != db_ts:
                        try: table.update_item(Key={'pk': f"USER#{user_email}", 'sk': 'PROFILE'}, UpdateExpression="SET energy = :e, energy_ts = :t", ExpressionAttributeValues={':e': real_energy, ':t': real_ts})
                        except: pass

                    return { "statusCode": 200, "body": json.dumps({ "watched": item.get('watched', []), "reviews": item.get('reviews', []), "username": item.get('username', None), "avatar": int(item.get('avatar', 0)), "color": item.get('color', '#333'), "friend_code": friend_code, "energy": int(real_energy), "energy_ts": int(real_ts) }, cls=DecimalEncoder), "headers": NO_CACHE_HEADERS }
                except Exception as e: return {"statusCode": 500, "body": str(e), "headers": NO_CACHE_HEADERS}

            if method == 'POST':
                try:
                    email = body.get('email')
                    resp = table.get_item(Key={'pk': f"USER#{email}", 'sk': 'PROFILE'})
                    item = resp.get('Item', {})
                    db_energy = item.get('energy', MAX_ENERGY)
                    db_ts = item.get('energy_ts', int(time.time()))
                    real_energy, real_ts = calculate_energy(db_energy, db_ts)
                    if real_energy <= 0: return {"statusCode": 403, "body": json.dumps({"error": "Sem energia", "ts": real_ts}), "headers": NO_CACHE_HEADERS}
                    
                    new_energy = real_energy - 1
                    table.update_item(Key={'pk': f"USER#{email}", 'sk': 'PROFILE'}, UpdateExpression="SET watched = list_append(if_not_exists(watched, :empty), :movie), energy = :e, energy_ts = :t", ExpressionAttributeValues={':movie': [body.get('movie_id')], ':empty': [], ':e': new_energy, ':t': real_ts})
                    return {"statusCode": 200, "body": json.dumps({"status": "saved", "energy": new_energy}), "headers": NO_CACHE_HEADERS}
                except Exception as e: return {"statusCode": 500, "body": str(e), "headers": NO_CACHE_HEADERS}

        # --- ROTA 4: ATUALIZAR PERFIL ---
        if path == '/api/profile' and method == 'POST':
            email = body.get('email')
            new_username = body.get('username', '').strip().lower()
            new_avatar = int(body.get('avatar', 0))
            new_color = body.get('color', '#333')

            if not re.match("^[a-z0-9_]{3,15}$", new_username): return {"statusCode": 400, "body": "Nome invalido", "headers": NO_CACHE_HEADERS}
            try:
                user_resp = table.get_item(Key={'pk': f"USER#{email}", 'sk': 'PROFILE'})
                old_username = user_resp.get('Item', {}).get('username')
                if old_username != new_username:
                    try:
                        table.put_item(Item={'pk': f"USERNAME#{new_username}", 'sk': 'RESERVED', 'email': email, 'avatar': new_avatar, 'color': new_color}, ConditionExpression='attribute_not_exists(pk)')
                        if old_username:
                            try: table.delete_item(Key={'pk': f"USERNAME#{old_username}", 'sk': 'RESERVED'})
                            except: pass
                    except ClientError: return {"statusCode": 409, "body": "Nome ja existe", "headers": NO_CACHE_HEADERS}
                else:
                    if new_username:
                        try: table.update_item(Key={'pk': f"USERNAME#{new_username}", 'sk': 'RESERVED'}, UpdateExpression="SET avatar = :a, color = :c", ExpressionAttributeValues={':a': new_avatar, ':c': new_color})
                        except: pass
                table.update_item(Key={'pk': f"USER#{email}", 'sk': 'PROFILE'}, UpdateExpression="SET username = :u, avatar = :a, color = :c", ExpressionAttributeValues={':u': new_username, ':a': new_avatar, ':c': new_color})
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
                    avatar = int(item.get('avatar', 0))
                    results.append({ "username": clean_name, "email": item.get('email'), "avatar": avatar, "color": item.get('color', '#333') })
                return {"statusCode": 200, "body": json.dumps(results, cls=DecimalEncoder), "headers": NO_CACHE_HEADERS}
            except Exception as e: return {"statusCode": 500, "body": str(e), "headers": NO_CACHE_HEADERS}

        # --- ROTA 6: ADICIONAR AMIGO ---
        if path == '/api/friends/add' and method == 'POST':
            user_email = body.get('email'); friend_code = body.get('friend_code'); friend_email_direct = body.get('friend_email')
            if not user_email: return {"statusCode": 400, "body": "Erro dados"}
            target_email = friend_email_direct
            if not target_email and friend_code:
                try:
                    resp = table.scan(FilterExpression=Attr('friend_code').eq(friend_code) & Attr('sk').eq('PROFILE'))
                    if resp['Items']: target_email = resp['Items'][0]['pk'].replace('USER#', '')
                except: pass
            if not target_email: return {"statusCode": 404, "body": "Usuario nao encontrado"}
            try:
                table.update_item(Key={'pk': f"USER#{user_email}", 'sk': 'PROFILE'}, UpdateExpression="SET friends = list_append(if_not_exists(friends, :empty), :f)", ExpressionAttributeValues={':f': [target_email], ':empty': []})
                return {"statusCode": 200, "body": json.dumps({"status": "added"}), "headers": NO_CACHE_HEADERS}
            except Exception as e: return {"statusCode": 500, "body": str(e), "headers": NO_CACHE_HEADERS}

        # --- ROTA 7: SOCIAL FEED (NOVO) ---
        if path == '/api/social/feed' and method == 'GET':
            user_email = event.get('queryStringParameters', {}).get('email')
            if not user_email: return {"statusCode": 400, "body": "Email required"}
            try:
                # 1. Pega lista de amigos
                user_resp = table.get_item(Key={'pk': f"USER#{user_email}", 'sk': 'PROFILE'})
                friends = user_resp.get('Item', {}).get('friends', [])
                
                # 2. Itera amigos para pegar reviews (Simplificado para MVP)
                feed = []
                for f_email in friends:
                    try:
                        f_prof = table.get_item(Key={'pk': f"USER#{f_email}", 'sk': 'PROFILE'}).get('Item', {})
                        f_reviews = f_prof.get('reviews', [])
                        f_username = f_prof.get('username', 'Usuário')
                        f_avatar = int(f_prof.get('avatar', 0))
                        f_color = f_prof.get('color', '#333')
                        
                        for r in f_reviews:
                            r['username'] = f_username
                            r['avatar'] = f_avatar
                            r['color'] = f_color
                            r['friend_email'] = f_email
                            feed.append(r)
                    except: pass
                
                # 3. Ordena por data (mais recente primeiro)
                feed.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
                
                return {"statusCode": 200, "body": json.dumps(feed[:50], cls=DecimalEncoder), "headers": NO_CACHE_HEADERS}
            except Exception as e: return {"statusCode": 500, "body": str(e), "headers": NO_CACHE_HEADERS}

        # --- DEBUG ---
        if path == '/api/dev/refill' and method == 'POST':
            email = body.get('email')
            try:
                table.update_item(Key={'pk': f"USER#{email}", 'sk': 'PROFILE'}, UpdateExpression="SET energy = :e, energy_ts = :t", ExpressionAttributeValues={':e': 3, ':t': int(time.time())})
                return {"statusCode": 200, "body": json.dumps({"status": "refilled"}), "headers": NO_CACHE_HEADERS}
            except: return {"statusCode": 500, "body": "error"}

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

    except Exception as crash_err:
        print(f"CRASH: {crash_err}")
        return { "statusCode": 500, "headers": {"Content-Type": "text/plain"}, "body": f"ERRO CRITICO: {str(crash_err)}\n\n{traceback.format_exc()}" }