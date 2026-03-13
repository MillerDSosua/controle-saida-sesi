# imagem base
FROM node:20-alpine

# diretório de trabalho dentro do container
WORKDIR /app

# copia apenas dependências primeiro
COPY package*.json ./

# instala dependências
RUN npm install

# copia resto do projeto
COPY . .

# build do next
RUN npm run build

# porta usada pelo Next.js
EXPOSE 3000

# comando que inicia o servidor
CMD ["npm", "start"]