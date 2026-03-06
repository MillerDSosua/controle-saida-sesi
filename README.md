# Controle de Saída SESI

Sistema premium de controle de saída de alunos desenvolvido com Next.js e Firebase.

## Configuração do Backend Firebase

1. **Crie um projeto no Firebase Console**:
   Acesse [firebase.google.com](https://firebase.google.com/) e crie um novo projeto chamado `Controle Saída SESI`.

2. **Ative o Firebase Authentication**:
   No menu lateral, vá em *Authentication* > *Get Started* > Selecione *Email/Password* e habilite.

3. **Ative o Cloud Firestore**:
   No menu lateral, vá em *Firestore Database* > *Create Database*. Escolha o local e inicie em **Test Mode** (para desenvolvimento rápido) ou use as regras abaixo.

4. **Regras do Firestore**:
   Cole as seguintes regras na aba *Rules* do Firestore:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // Criado manualmente ou via Admin SDK
    }
    match /students/{studentId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "operator";
    }
    match /classes/{classId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "operator";
    }
    match /calls/{callId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "operator";
    }
  }
}
```

5. **Configuração de Usuários**:
   Vá em *Authentication*, adicione um usuário (ex: `operador@teste.com`).
   Copie o `UID` gerado e vá no *Firestore*. Crie uma coleção `users` e um documento com o ID igual ao `UID` copiado.
   Adicione os campos:
   - `email`: `operador@teste.com`
   - `role`: `operator` (ou `viewer`)

6. **Variáveis de Ambiente**:
   Crie um arquivo `.env.local` na raiz do projeto e preencha com as credenciais do seu projeto (Configurações do Projeto > Apps > Web App).

## Como Rodar

```bash
npm install
npm run dev
```

Abra `http://localhost:9002` no seu navegador.

## Testes

- **Operador**: Pode cadastrar turmas, alunos e realizar chamadas.
- **Visitante**: Visualiza as chamadas em tempo real conforme o operador aciona o botão.