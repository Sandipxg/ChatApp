FROM node:20-alpine

WORKDIR /app

# Copy dependency configs first to leverage Docker layer caching
COPY package*.json ./

RUN npm install

# Copy the rest of the application files
COPY . .

# Expose backend port
EXPOSE 3000

# Start server using the start script
CMD ["npm", "start"]
