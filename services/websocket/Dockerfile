FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p /app/logs

EXPOSE 3001

CMD ["node", "server.js"]