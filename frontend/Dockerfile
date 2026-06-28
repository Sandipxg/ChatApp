FROM node:20-alpine

WORKDIR /app

# Copy dependency configs
COPY package*.json ./

RUN npm install

# Copy application files
COPY . .

# Expose Vite default dev server port
EXPOSE 5173

# Start Vite server, bound to all network interfaces so it is accessible outside the container
CMD ["npm", "run", "dev", "--", "--host"]
