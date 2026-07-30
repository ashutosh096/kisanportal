FROM node:20-alpine

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies
RUN npm install
RUN cd client && npm install
RUN cd server && npm install

# Copy source code
COPY . .

# Build frontend
RUN npm run build --prefix client

EXPOSE 5050

CMD ["node", "server/index.js"]
