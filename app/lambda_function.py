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

        # --- ROTA 0: PROXY POSTERS ---
        if path.startswith('/posters/'):
            key = path.lstrip('/')
            try:
                response = s3.get_object(Bucket=BUCKET_NAME, Key=key)
                image_content = response['Body'].read()
                return {
                    "statusCode": 200,
                    "headers": { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400" },
                    "body": base64.b64encode(image_content).decode('utf-8'),
                    "isBase64Encoded": True
                }
            except: return {"statusCode": 404, "body": "Poster not found"}

        # --- ROTA 0.1: ARQUIVOS ESTÁTICOS ---
        clean_path = path.lstrip('/')
        abs_path = os.path.abspath(os.path.join(os.getcwd(), clean_path))
        if os.path.exists(abs_path) and os.getcwd() in abs_path and os.path.isfile(abs_path):
            mime_type = "text/plain"
            if clean_path.endswith(".js"): mime_type = "application/javascript"
            elif clean_path.endswith(".css"): mime_type = "text/css"
            elif clean_path.endswith(".html"): mime_type = "text/html"
            elif clean_path.endswith(".png"): mime_type = "image/png"
            elif clean_path.endswith(".jpg"): mime_type = "image/jpeg"
            else: mime_type, _ = mimetypes.guess_type(abs_path)
            try:
                with open(abs_path, 'rb' if 'image' in str(mime_type) else 'r', encoding=None if 'image' in str(mime_type) else 'utf-8') as f: content = f.read()
                is_b64 = False
                if 'image' in str(mime_type):
                    content = base64.b64encode(content).decode('utf-8')
                    is_b64 = True
                return { "statusCode": 200, "headers": { "Content-Type": str(mime_type), "Cache-Control": "no-cache" }, "body": content, "isBase64Encoded": is_b64 }
            except: pass

        # --- ROTA 1: RATING ---
        if path == '/api/rating':
            if method == 'POST':
                user_email = body.get('email', '').strip().lower()
                movie_id = body.get('movie_id')
                rating = body.get('rating'); review = body.get('review', '')
                if not user_email or not movie_id: return {"statusCode": 400, "body": "Erro dados"}
                try:
                    ts = datetime.now().isoformat()
                    table.put_item(Item={'pk': f"RATING#{movie_id}", 'sk': f"USER#{user_email}", 'rating': Decimal(str(rating)), 'review': review, 'timestamp': ts})
                    prof = table.get_item(Key={'pk': f"USER#{user_email}", 'sk': 'PROFILE'}).get('Item', {})
                    curr_rev = prof.get('reviews', [])
                    new_rev = [r for r in curr_rev if r.get('movie_id') != movie_id]
                    new_rev.append({'movie_id': movie_id, 'rating': Decimal(str(rating)), 'review': review, 'timestamp': ts})
                    table.update_item(Key={'pk': f"USER#{user_email}", 'sk': 'PROFILE'}, UpdateExpression="SET reviews = :r", ExpressionAttributeValues={':r': new_rev})
                    return {"statusCode": 200, "body": json.dumps({"status": "ok"})}
                except Exception as e: return {"statusCode": 500, "body": str(e)}
            if method == 'DELETE':
                user_email = body.get('email', '').strip().lower(); movie_id = body.get('movie_id')
                try:
                    table.delete_item(Key={'pk': f"RATING#{movie_id}", 'sk': f"USER#{user_email}"})
                    prof = table.get_item(Key={'pk': f"USER#{user_email}", 'sk': 'PROFILE'}).get('Item', {})
                    curr_rev = [r for r in prof.get('reviews', []) if r.get('movie_id') != movie_id]
                    table.update_item(Key={'pk': f"USER#{user_email}", 'sk': 'PROFILE'}, UpdateExpression="SET reviews = :r", ExpressionAttributeValues={':r': curr_rev})
                    return {"statusCode": 200, "body": json.dumps({"status": "deleted"})}
                except Exception as e: return {"statusCode": 500, "body": str(e)}

        # --- ROTA 2: AUTH ---
        if path == '/api/auth/signup': 
            email = body.get('email', '').strip().lower()
            cognito.sign_up(ClientId=COGNITO_CLIENT_ID, Username=email, Password=body.get('password'), UserAttributes=[{'Name':'email','Value':email}])
            return {"statusCode": 200, "body": json.dumps({"msg": "Criado"})}
        if path == '/api/auth/confirm':
            email = body.get('email', '').strip().lower()
            cognito.confirm_sign_up(ClientId=COGNITO_CLIENT_ID, Username=email, ConfirmationCode=body.get('code'))
            return {"statusCode": 200, "body": json.dumps({"msg": "Confirmado"})}
        if path == '/api/auth/signin':
            email = body.get('email', '').strip().lower()
            resp = cognito.initiate_auth(ClientId=COGNITO_CLIENT_ID, AuthFlow='USER_PASSWORD_AUTH', AuthParameters={'USERNAME': email, 'PASSWORD': body.get('password')})
            return { "statusCode": 200, "body": json.dumps({"token": resp['AuthenticationResult']['AccessToken'], "email": email}) }

        # --- ROTA 3: PERFIL ---
        if path == '/api/history':
            if method == 'GET':
                email = event.get('queryStringParameters', {}).get('email', '').strip().lower()
                if not email: return {"statusCode": 400, "body": "Email required"}
                try:
                    resp = table.get_item(Key={'pk': f"USER#{email}", 'sk': 'PROFILE'})
                    item = resp.get('Item', {})
                    if 'friend_code' not in item:
                        table.update_item(Key={'pk': f"USER#{email}", 'sk': 'PROFILE'}, UpdateExpression="SET friend_code = :c", ExpressionAttributeValues={':c': str(random.randint(100000, 999999))})
                    real_e, real_ts = calculate_energy(item.get('energy', MAX_ENERGY), item.get('energy_ts', int(time.time())))
                    if real_e != item.get('energy') or real_ts != item.get('energy_ts'):
                        table.update_item(Key={'pk': f"USER#{email}", 'sk': 'PROFILE'}, UpdateExpression="SET energy = :e, energy_ts = :t", ExpressionAttributeValues={':e': real_e, ':t': real_ts})
                    return { "statusCode": 200, "body": json.dumps({ 
                        "watched": item.get('watched', []), "reviews": item.get('reviews', []), "following": item.get('following', []), "followers": item.get('followers', []),
                        "username": item.get('username', None), "avatar": int(item.get('avatar', 0)), "color": item.get('color', '#333'),
                        "friend_code": item.get('friend_code', '000000'), "energy": int(real_e), "energy_ts": int(real_ts) 
                    }, cls=DecimalEncoder), "headers": NO_CACHE_HEADERS }
                except Exception as e: return {"statusCode": 500, "body": str(e)}
            if method == 'POST':
                email = body.get('email', '').strip().lower()
                resp = table.get_item(Key={'pk': f"USER#{email}", 'sk': 'PROFILE'})
                item = resp.get('Item', {})
                real_e, real_ts = calculate_energy(item.get('energy', MAX_ENERGY), item.get('energy_ts', int(time.time())))
                if real_e <= 0: return {"statusCode": 403, "body": json.dumps({"error": "Sem energia"})}
                table.update_item(Key={'pk': f"USER#{email}", 'sk': 'PROFILE'}, UpdateExpression="SET watched = list_append(if_not_exists(watched, :empty), :movie), energy = :e, energy_ts = :t", ExpressionAttributeValues={':movie': [body.get('movie_id')], ':empty': [], ':e': real_e - 1, ':t': real_ts})
                return {"statusCode": 200, "body": json.dumps({"status": "saved", "energy": real_e - 1})}

        # --- ROTA 4: ATUALIZAR PERFIL ---
        if path == '/api/profile' and method == 'POST':
            email = body.get('email', '').strip().lower()
            new_name = body.get('username', '').strip().lower()
            if not re.match("^[a-z0-9_]{3,15}$", new_name): return {"statusCode": 400, "body": "Nome invalido"}
            try:
                table.update_item(Key={'pk': f"USER#{email}", 'sk': 'PROFILE'}, UpdateExpression="SET username = :u, avatar = :a, color = :c", ExpressionAttributeValues={':u': new_name, ':a': int(body.get('avatar', 0)), ':c': body.get('color', '#333')})
                try: table.put_item(Item={'pk': f"USERNAME#{new_name}", 'sk': 'RESERVED', 'email': email, 'avatar': int(body.get('avatar', 0)), 'color': body.get('color', '#333')})
                except: pass
                return {"statusCode": 200, "body": json.dumps({"status": "ok"})}
            except Exception as e: return {"statusCode": 500, "body": str(e)}

        # --- ROTA 5: PESQUISA ---
        if path == '/api/users/search':
            q = event.get('queryStringParameters', {}).get('q', '').strip().lower()
            if len(q) < 2: return {"statusCode": 200, "body": "[]"}
            try:
                resp = table.scan(FilterExpression=Attr('pk').begins_with('USERNAME#') & Attr('pk').contains(q))
                results = [{ "username": i['pk'].replace('USERNAME#', ''), "email": i.get('email'), "avatar": int(i.get('avatar',0)), "color": i.get('color','#333') } for i in resp.get('Items', [])]
                return {"statusCode": 200, "body": json.dumps(results, cls=DecimalEncoder)}
            except: return {"statusCode": 200, "body": "[]"}

        # --- ROTA 6: SEGUIR (COM CÓDIGO) ---
        if path == '/api/social/follow' and method == 'POST':
            my_email = body.get('email', '').strip().lower()
            target_email = body.get('target_email', '').strip().lower() if body.get('target_email') else None
            target_code = body.get('friend_code')
            action = body.get('action')
            
            if not my_email: return {"statusCode": 400, "body": "Erro email"}
            
            try:
                # Se veio código, descobre o email
                if target_code and not target_email:
                    resp = table.scan(FilterExpression=Attr('friend_code').eq(target_code) & Attr('sk').eq('PROFILE'))
                    if resp['Items']: target_email = resp['Items'][0]['pk'].replace('USER#', '')
                
                if not target_email: return {"statusCode": 404, "body": "Usuário não encontrado"}

                if action == 'follow':
                    table.update_item(Key={'pk': f"USER#{my_email}", 'sk': 'PROFILE'}, UpdateExpression="SET following = list_append(if_not_exists(following, :empty), :t)", ExpressionAttributeValues={':t': [target_email], ':empty': []})
                    table.update_item(Key={'pk': f"USER#{target_email}", 'sk': 'PROFILE'}, UpdateExpression="SET followers = list_append(if_not_exists(followers, :empty), :m)", ExpressionAttributeValues={':m': [my_email], ':empty': []})
                elif action == 'unfollow':
                    me = table.get_item(Key={'pk': f"USER#{my_email}", 'sk': 'PROFILE'}).get('Item', {})
                    new_following = [x for x in me.get('following', []) if x != target_email]
                    table.update_item(Key={'pk': f"USER#{my_email}", 'sk': 'PROFILE'}, UpdateExpression="SET following = :f", ExpressionAttributeValues={':f': new_following})
                    tgt = table.get_item(Key={'pk': f"USER#{target_email}", 'sk': 'PROFILE'}).get('Item', {})
                    new_followers = [x for x in tgt.get('followers', []) if x != my_email]
                    table.update_item(Key={'pk': f"USER#{target_email}", 'sk': 'PROFILE'}, UpdateExpression="SET followers = :f", ExpressionAttributeValues={':f': new_followers})

                return {"statusCode": 200, "body": json.dumps({"status": "ok"})}
            except Exception as e: return {"statusCode": 500, "body": str(e)}

        # --- ROTA 7: SOCIAL FEED ---
        if path == '/api/social/feed':
            email = event.get('queryStringParameters', {}).get('email', '').strip().lower()
            try:
                prof = table.get_item(Key={'pk': f"USER#{email}", 'sk': 'PROFILE'}).get('Item', {})
                following_list = prof.get('following', [])
                feed = []
                seen = set()
                for f_email in following_list:
                    try:
                        f_prof = table.get_item(Key={'pk': f"USER#{f_email}", 'sk': 'PROFILE'}).get('Item', {})
                        reviews = f_prof.get('reviews', [])
                        f_data = { "username": f_prof.get('username','User'), "avatar": int(f_prof.get('avatar',0)), "color": f_prof.get('color','#333'), "friend_email": f_email }
                        for r in reviews:
                            k = f"{f_email}#{r.get('timestamp')}"
                            if k not in seen:
                                seen.add(k)
                                item = {**r, **f_data}
                                if isinstance(item.get('rating'), Decimal): item['rating'] = float(item['rating'])
                                feed.append(item)
                    except: pass
                feed.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
                return {"statusCode": 200, "body": json.dumps(feed[:50], cls=DecimalEncoder)}
            except Exception as e: return {"statusCode": 500, "body": str(e)}

        if path == '/api/dev/refill':
            email = body.get('email', '').strip().lower()
            table.update_item(Key={'pk': f"USER#{email}", 'sk': 'PROFILE'}, UpdateExpression="SET energy = :e, energy_ts = :t", ExpressionAttributeValues={':e': 3, ':t': int(time.time())})
            return {"statusCode": 200, "body": json.dumps({"status": "refilled"})}

        if path.endswith('.js') or path.endswith('.css') or path.endswith('.png') or path.endswith('.jpg'):
            return {"statusCode": 404, "body": f"File not found: {path}"}

        html = get_file_content('index.html')
        if not html: return {"statusCode": 500, "body": "Index lost"}
        movie_id = event.get('queryStringParameters', {}).get('movie')
        clean_path = path.strip('/')
        if len(clean_path) > 1 and not path.startswith('/api/') and '.' not in path: movie_id = clean_path
        meta = { "t": "Sort a Short", "d": "Curadoria.", "i": "" }
        if movie_id:
            cat = get_catalogo()
            if movie_id in cat: meta = { "t": cat[movie_id]['titulo'], "d": cat[movie_id]['ano'], "i": "" }
        return { "statusCode": 200, "headers": {"Content-Type": "text/html; charset=utf-8"}, "body": html.replace("{{META_TITLE}}", meta["t"]).replace("{{META_DESC}}", meta["d"]).replace("{{META_IMAGE}}", meta["i"]) }

    except Exception as e: return { "statusCode": 500, "headers": {"Content-Type": "text/plain"}, "body": str(e) }