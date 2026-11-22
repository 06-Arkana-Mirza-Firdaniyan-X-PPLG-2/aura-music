FROM node:20-slim

WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Bundle app source
COPY . .

# Hugging Face Spaces standard port is 7860
ENV PORT=7860
EXPOSE 7860

CMD ["node", "server.js"]
