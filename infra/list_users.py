import boto3
from boto3.dynamodb.conditions import Attr

# Configuração
TABLE_NAME = "sort-a-short-db"

def listar_tudo():
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(TABLE_NAME)

    print(f"--- USUÁRIOS EM {TABLE_NAME} ---\n")

    # Scaneia apenas os perfis de usuário (Onde sk é 'PROFILE')
    try:
        response = table.scan(
            FilterExpression=Attr('sk').eq('PROFILE'),
            ProjectionExpression="pk, friend_code, username"
        )

        items = response.get('Items', [])
        
        if not items:
            print("Nenhum usuário encontrado.")
        
        for item in items:
            # Remove o prefixo USER# para mostrar só o email
            email = item.get('pk', '').replace('USER#', '')
            code = item.get('friend_code', 'SEM CÓDIGO')
            name = item.get('username', 'Sem Nome')
            
            print(f"Nome: {name:<15} | Email: {email:<30} | Código Amigo: {code}")

    except Exception as e:
        print(f"Erro ao conectar no DynamoDB: {e}")

if __name__ == "__main__":
    listar_tudo()