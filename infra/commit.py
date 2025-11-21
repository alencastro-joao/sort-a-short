#!/usr/bin/env python3
"""
Infra minimal commit helper

Usage:
  python infra/commit.py

Flow (minimal):
  - git add .
  - ask for commit message
  - git commit -m "message"
  - git push

No validation, no confirmations, minimal behavior as requested.
"""
import subprocess
import sys


def run(cmd_list):
    subprocess.check_call(cmd_list)


def main():
    try:
        # Stage everything
        run(["git", "add", "."])

        # Ask for message
        msg = input("Mensagem do commit: ")

        # Commit
        run(["git", "commit", "-m", msg])

        # Push
        run(["git", "push"])

    except subprocess.CalledProcessError as e:
        print("Comando git falhou:", e)
        sys.exit(1)


if __name__ == '__main__':
    main()
#!/usr/bin/env python3
"""
commit.py - pequeno utilitário para automatizar git add/commit/push

Uso:
  python commit.py -m "Minha mensagem de commit"
  python commit.py --message "texto" --no-push

O script verifica se está dentro de um repositório git, mostra o status,
faz `git add -A`, cria o commit e faz push (por padrão). É seguro e
exibe mensagens de erro legíveis.
"""
import argparse
import subprocess
import sys
from shutil import which


def run(cmd, capture=False):
    try:
        if capture:
            out = subprocess.check_output(cmd, stderr=subprocess.STDOUT, shell=True, universal_newlines=True)
            return out
        else:
            subprocess.check_call(cmd, shell=True)
            return None
    except subprocess.CalledProcessError as e:
        print(f"Erro executando: {cmd}\n{e.output if hasattr(e, 'output') else e}")
        sys.exit(1)


def inside_git_repo():
    try:
        subprocess.check_call('git rev-parse --is-inside-work-tree', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, shell=True)
        return True
    except subprocess.CalledProcessError:
        return False


def main():
    if which('git') is None:
        print('git não encontrado no PATH. Instale o git e tente novamente.')
        sys.exit(1)

    parser = argparse.ArgumentParser(description='Automatiza git add, commit e push (simples).')
    parser.add_argument('-m', '--message', help='Mensagem do commit', required=False)
    parser.add_argument('--no-push', action='store_true', help='Não executar git push')
    parser.add_argument('--amend', action='store_true', help='Fazer --amend no commit')
    parser.add_argument('--no-verify', action='store_true', help='Passar --no-verify para git commit')
    parser.add_argument('--yes', '-y', action='store_true', help='Não pedir confirmação interativa')
    args = parser.parse_args()

    if not inside_git_repo():
        print('Este diretório não é um repositório git (ou não tem .git). Saindo.')
        sys.exit(1)

    print('Git status (resumo):')
    print('-------------------')
    print(run('git status --short', capture=True) or '(sem mudanças)')

    if not args.yes:
        resp = input('Continuar e adicionar todas as mudanças? [y/N]: ').strip().lower()
        if resp not in ('y', 'yes'):
            print('Abortando.')
            sys.exit(0)

    print('\nAdicionando todos os arquivos (git add -A)...')
    run('git add -A')

    # Determine commit message
    msg = args.message
    if msg:
        # If a message was provided via -m, allow the user to confirm or edit it
        if not args.yes:
            print(f'Mensagem atual do commit: "{msg}"')
            try:
                new = input('Pressione Enter para manter ou digite nova mensagem: ').strip()
            except KeyboardInterrupt:
                print('\nAbortando.')
                sys.exit(1)
            if new:
                msg = new
    else:
        # No message provided: prompt until non-empty (unless -y)
        if args.yes:
            print('Nenhuma mensagem fornecida e modo --yes ativo; abortando para evitar commits sem mensagem.')
            sys.exit(1)
        print('Escreva a mensagem do commit (uma linha) e pressione Enter:')
        try:
            msg = input('> ').strip()
        except KeyboardInterrupt:
            print('\nAbortando.')
            sys.exit(1)
        if not msg:
            print('Mensagem vazia; abortando commit.')
            sys.exit(1)

    commit_cmd = f'git commit -m "{msg.replace("\"", "\\\"")}"'
    if args.amend:
        commit_cmd += ' --amend --no-edit'
    if args.no_verify:
        commit_cmd += ' --no-verify'

    print(f'Executando: {commit_cmd}')
    run(commit_cmd)

    if not args.no_push:
        # detect current branch
        branch = run('git rev-parse --abbrev-ref HEAD', capture=True).strip()
        if branch:
            print(f'Fazendo push para origin/{branch}...')
            run(f'git push origin {branch}')
        else:
            print('Não foi possível determinar a branch atual; fazendo push --all')
            run('git push origin --all')

    print('\nOperação concluída com sucesso.')


if __name__ == '__main__':
    main()
