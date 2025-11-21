import boto3
import json
import os
import re
from datetime import datetime
from decimal import Decimal
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key

# --- CONFIGURAÇÃO ---
BUCKET_NAME = "sort-a-short" 
FILE_NAME = "shorts.json"
TABLE_NAME = "sort-a-short-db"
COGNITO_CLIENT_ID = "3i2m7sfkp66qa9uhfvvb7g6d9c" 

# --- HEADERS ANTI-CACHE (NOVO) ---
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

    # --- ROTA 1: RATING ---
    if path == '/api/rating':
        if method == 'POST':
            user_email = body.get('email'); movie_id = body.get('movie_id')
            rating = body.get('rating'); review = body.get('review', '')
            
            if not user_email or not movie_id or rating is None: 
                return {"statusCode": 400, "body": "Erro dados", "headers": NO_CACHE_HEADERS}

            try:
                timestamp = datetime.now().isoformat()
                # 1. Média Geral
                table.put_item(Item={
                    'pk': f"RATING#{movie_id}", 'sk': f"USER#{user_email}",
                    'rating': Decimal(str(rating)), 'review': review, 'timestamp': timestamp
                })
                # 2. Histórico Pessoal
                review_obj = {'movie_id': movie_id, 'rating': Decimal(str(rating)), 'review': review, 'timestamp': timestamp}
                table.update_item(
                    Key={'pk': f"USER#{user_email}", 'sk': 'PROFILE'},
                    UpdateExpression="SET reviews = list_append(if_not_exists(reviews, :empty), :r)",
                    ExpressionAttributeValues={':r': [review_obj], ':empty': []}
                )
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

    # --- ROTA 3: PERFIL E HISTÓRICO ---
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
                        "username": item.get('username', None)
                    }, cls=DecimalEncoder),
                    "headers": NO_CACHE_HEADERS
                }
            except Exception as e: return {"statusCode": 500, "body": str(e), "headers": NO_CACHE_HEADERS}

        if method == 'POST':
            try:
                table.update_item(
                    Key={'pk': f"USER#{body.get('email')}", 'sk': 'PROFILE'},
                    UpdateExpression="SET watched = list_append(if_not_exists(watched, :empty), :movie)",
                    ExpressionAttributeValues={':movie': [body.get('movie_id')], ':empty': []}
                )
                return {"statusCode": 200, "body": "Saved", "headers": NO_CACHE_HEADERS}
            except Exception as e: return {"statusCode": 500, "body": str(e), "headers": NO_CACHE_HEADERS}

    # --- ROTA 4: USERNAME ---
    if path == '/api/username' and method == 'POST':
        email = body.get('email'); new_username = body.get('username', '').strip().lower()
        if not re.match("^[a-z0-9_]{3,15}$", new_username): return {"statusCode": 400, "body": "Nome invalido", "headers": NO_CACHE_HEADERS}
        try:
            user_resp = table.get_item(Key={'pk': f"USER#{email}", 'sk': 'PROFILE'})
            old_username = user_resp.get('Item', {}).get('username')
            table.put_item(Item={'pk': f"USERNAME#{new_username}", 'sk': 'RESERVED', 'email': email}, ConditionExpression='attribute_not_exists(pk)')
            table.update_item(Key={'pk': f"USER#{email}", 'sk': 'PROFILE'}, UpdateExpression="SET username = :u", ExpressionAttributeValues={':u': new_username})
            if old_username and old_username != new_username:
                try: table.delete_item(Key={'pk': f"USERNAME#{old_username}", 'sk': 'RESERVED'})
                except: pass
            return {"statusCode": 200, "body": json.dumps({"status": "success", "username": new_username}), "headers": NO_CACHE_HEADERS}
        except ClientError: return {"statusCode": 409, "body": "Nome ja existe", "headers": NO_CACHE_HEADERS}
        except Exception as e: return {"statusCode": 500, "body": str(e), "headers": NO_CACHE_HEADERS}

    # --- FRONTEND ---
    html = get_file_content('index.html')
    if not html: return {"statusCode": 500, "body": "Index lost"}
    
    movie_id = event.get('queryStringParameters', {}).get('movie')
    if len(path.strip('/')) > 1 and not path.startswith('/api/'): movie_id = path.strip('/')
    meta = { "t": "Sort a Short", "d": "Curadoria de animacao.", "i": "" }
    if movie_id:
        cat = get_catalogo()
        if movie_id in cat: meta = { "t": cat[movie_id]['titulo'], "d": cat[movie_id]['ano'], "i": "" }

    final_html = html.replace("{{META_TITLE}}", meta["t"]).replace("{{META_DESC}}", meta["d"]).replace("{{META_IMAGE}}", meta["i"])
    
    # Headers para HTML (permite cache moderado, mas a API JSON não)
    return { 
        "statusCode": 200, 
        "headers": {"Content-Type": "text/html; charset=utf-8"}, 
        "body": final_html 
    }