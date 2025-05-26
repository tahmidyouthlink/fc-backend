# Use official Node.js LTS image 
FROM node:18

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install --production

# Copy app source code
COPY . .

# Expose port (Cloud Run uses $PORT env var)
EXPOSE 8080

# Start the app with PORT=8080
CMD ["node", "index.js"]