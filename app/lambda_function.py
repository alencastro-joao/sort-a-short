import boto3
import json
import os
from datetime import datetime
from decimal import Decimal
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key

# --- CONFIGURAÇÃO ---
BUCKET_NAME = "sort-a-short" 
FILE_NAME = "shorts.json"
TABLE_NAME = "sort-a-short-db"
# [IMPORTANTE] Client ID do Cognito
COGNITO_CLIENT_ID = "3i2m7sfkp66qa9uhfvvb7g6d9c" 

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(TABLE_NAME)
cognito = boto3.client('cognito-idp')

# Utilitários
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

# [NOVA FUNÇÃO] Calcula a média de rating de um filme no DynamoDB
def calculate_average_rating(movie_id):
    """Busca todas as notas para um filme (RATING#<id>) e calcula a média."""
    try:
        response = table.query(
            KeyConditionExpression=Key('pk').eq(f"RATING#{movie_id}")
        )
        # Converte as notas (que estão como Decimal no DynamoDB) para float
        ratings = [float(item['rating']) for item in response['Items'] if 'rating' in item]
        
        if not ratings: return 0.0
        return sum(ratings) / len(ratings)
    except Exception as e:
        print(f"Erro ao calcular média: {e}")
        return 0.0

def lambda_handler(event, context):
    raw_path = event.get('rawPath', '/')
    path = event.get('path', raw_path)
    method = event.get('requestContext', {}).get('http', {}).get('method', 'GET')
    
    # Parse do Body (para POSTs)
    body = {}
    if event.get('body'):
        try: 
            # Decodifica Base64 se necessário
            if event.get('isBase64Encoded', False):
                raw_body = base64.b64decode(event.get('body')).decode('utf-8')
            else:
                raw_body = event.get('body')
            body = json.loads(raw_body)
        except Exception as e: 
            print(f"Erro ao ler body: {e}")
            pass

    print(f"DEBUG: {method} {path}")

    # --- ROTA 1: API DE RATING (NOVA) ---
    if path == '/api/rating':
        if method == 'POST':
            # 1. Salvar Rating
            user_email = body.get('email')
            movie_id = body.get('movie_id')
            rating = body.get('rating')
            review = body.get('review', '') # Campo opcional de review
            
            # Validação: Rating deve ser um número e o ID deve existir
            if not user_email or not movie_id or rating is None or not isinstance(rating, (int, float)):
                 return {"statusCode": 400, "body": "Dados de rating inválidos/incompletos"}

            try:
                table.put_item(
                    Item={
                        'pk': f"RATING#{movie_id}",      # Partição por filme
                        'sk': f"USER#{user_email}",      # Ordenação por usuário (garante 1 nota por usuário)
                        'rating': Decimal(str(rating)),  # Salva o rating como Decimal
                        'review': review,
                        'timestamp': datetime.now().isoformat()
                    }
                )
                
                # Opcional: Recalcula a nova média (para retorno imediato ao frontend)
                avg_rating = calculate_average_rating(movie_id)

                return {
                    "statusCode": 200, 
                    "headers": {"Content-Type": "application/json"},
                    "body": json.dumps({"status": "rating saved", "new_average": avg_rating}, cls=DecimalEncoder)
                }
            except Exception as e:
                print(f"Erro DynamoDB Rating: {e}")
                return {"statusCode": 500, "body": str(e)}

        if method == 'GET':
            # 2. Ler Média de Rating
            movie_id = event.get('queryStringParameters', {}).get('movie_id')
            if not movie_id:
                return {"statusCode": 400, "body": "Movie ID required"}
            
            avg_rating = calculate_average_rating(movie_id)
            
            return {
                "statusCode": 200, 
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"average_rating": avg_rating}, cls=DecimalEncoder)
            }


    # --- ROTA 2: AUTENTICAÇÃO E HISTÓRICO (Existente) ---
    
    # 2.1 Cadastro
    if path == '/api/auth/signup' and method == 'POST':
        email = body.get('email')
        password = body.get('password')
        if not email or not password: return {"statusCode": 400, "body": "Email/Senha faltando"}
        try:
            cognito.sign_up(
                ClientId=COGNITO_CLIENT_ID, Username=email, Password=password,
                UserAttributes=[{'Name': 'email', 'Value': email}]
            )
            return {"statusCode": 200, "body": json.dumps({"msg": "Criado"})}
        except ClientError as e: return {"statusCode": 400, "body": str(e)}

    # 2.2 Confirmar Código
    if path == '/api/auth/confirm' and method == 'POST':
        email = body.get('email'); code = body.get('code')
        if not email or not code: return {"statusCode": 400, "body": "Email/Codigo faltando"}
        try:
            cognito.confirm_sign_up(ClientId=COGNITO_CLIENT_ID, Username=email, ConfirmationCode=code)
            return {"statusCode": 200, "body": json.dumps({"msg": "Confirmado"})}
        except ClientError as e: return {"statusCode": 400, "body": str(e)}

    # 2.3 Login
    if path == '/api/auth/signin' and method == 'POST':
        email = body.get('email'); password = body.get('password')
        if not email or not password: return {"statusCode": 400, "body": "Campos vazios"}
        try:
            resp = cognito.initiate_auth(
                ClientId=COGNITO_CLIENT_ID, AuthFlow='USER_PASSWORD_AUTH',
                AuthParameters={'USERNAME': email, 'PASSWORD': password}
            )
            result = resp['AuthenticationResult']
            return { "statusCode": 200, "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"token": result['AccessToken'], "email": email})
            }
        except ClientError as e: return {"statusCode": 400, "body": str(e)}

    # 2.4 Histórico (GET/POST)
    if path == '/api/history':
        if method == 'GET':
            user_email = event.get('queryStringParameters', {}).get('email')
            if not user_email: return {"statusCode": 400, "body": "Email required"}
            try:
                resp = table.get_item(Key={'pk': f"USER#{user_email}", 'sk': 'PROFILE'})
                watched = resp.get('Item', {}).get('watched', [])
                return {"statusCode": 200, "body": json.dumps({"watched": watched}, cls=DecimalEncoder)}
            except Exception as e: return {"statusCode": 500, "body": str(e)}

        if method == 'POST':
            user_email = body.get('email'); movie_id = body.get('movie_id')
            if not user_email or not movie_id: return {"statusCode": 400, "body": "Missing data"}
            try:
                table.update_item(
                    Key={'pk': f"USER#{user_email}", 'sk': 'PROFILE'},
                    UpdateExpression="SET watched = list_append(if_not_exists(watched, :empty), :movie)",
                    ExpressionAttributeValues={':movie': [movie_id], ':empty': []},
                    ReturnValues="UPDATED_NEW"
                )
                return {"statusCode": 200, "body": "Saved"}
            except Exception as e: return {"statusCode": 500, "body": str(e)}


    # --- ROTA 3: SPA FALLBACK (HTML) ---
    html = get_file_content('index.html')
    if not html: return {"statusCode": 500, "body": "Index lost"}

    # SEO Injection Logic
    movie_id_from_path = path.strip('/')
    movie_id = event.get('queryStringParameters', {}).get('movie')

    # Se a URL for /FILMEID, usa o path para SEO
    if len(movie_id_from_path) > 1 and not path.startswith('/api/'):
        movie_id = movie_id_from_path 

    meta = { "t": "Sort a Short", "d": "Assista curtas.", "i": "https://via.placeholder.com/1200" }
    
    if movie_id:
        catalogo = get_catalogo()
        if movie_id in catalogo:
            f = catalogo[movie_id]
            meta = { "t": f"{f.get('titulo')} | Sort a Short", "d": f"{f.get('ano')} - {f.get('diretor')}", "i": f"/posters/{movie_id}.jpg" }

    final_html = html.replace("{{META_TITLE}}", meta["t"]).replace("{{META_DESC}}", meta["d"]).replace("{{META_IMAGE}}", meta["i"])

    return {
        "statusCode": 200,
        "headers": {"Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache"},
        "body": final_html
    }