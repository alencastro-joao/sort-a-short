import boto3
import sys

# --- CONFIGURAÇÃO ---
TABLE_NAME = "sort-a-short-db"
REGION = "us-east-1"  # Verifique se é a mesma região que você está usando

def wipe_table():
    print(f"🔥 INICIANDO LIMPEZA DA TABELA: {TABLE_NAME}...")
    
    # Conecta ao DynamoDB
    dynamodb = boto3.resource('dynamodb', region_name=REGION)
    table = dynamodb.Table(TABLE_NAME)

    try:
        # 1. Escaneia a tabela para pegar apenas as chaves (PK e SK)
        # ProjectionExpression economiza banda lendo só o necessário
        scan = table.scan(ProjectionExpression="pk, sk")
        
        items = scan.get('Items', [])
        deleted_count = 0

        # Gerenciador de Batch (Deleta em lotes para ser rápido)
        with table.batch_writer() as batch:
            for item in items:
                batch.delete_item(Key={'pk': item['pk'], 'sk': item['sk']})
                deleted_count += 1
            
            # Se tiver muitos itens (paginação), continua escaneando
            while 'LastEvaluatedKey' in scan:
                scan = table.scan(
                    ProjectionExpression="pk, sk",
                    ExclusiveStartKey=scan['LastEvaluatedKey']
                )
                for item in scan['Items']:
                    batch.delete_item(Key={'pk': item['pk'], 'sk': item['sk']})
                    deleted_count += 1

        print(f"✅ SUCESSO: {deleted_count} itens foram deletados.")
        print("   O banco de dados está zerado e pronto para testes.")

    except Exception as e:
        print(f"❌ ERRO: {str(e)}")

if __name__ == "__main__":
    # Confirmação de segurança
    confirm = input(f"TEM CERTEZA que quer apagar TUDO de '{TABLE_NAME}'? (digite 'sim'): ")
    if confirm.lower() == 'sim':
        wipe_table()
    else:
        print("Cancelado.")