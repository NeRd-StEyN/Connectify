FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose the frontend port (Vite)
EXPOSE 5173

# Start Vite with --host to allow external access
CMD ["npm", "run", "dev", "--", "--host"]
