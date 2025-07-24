FROM node:22.15.1-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package.json
COPY package.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the app
COPY . .

# Expose the app port
EXPOSE 3000

# Start the app
CMD ["node", "index.js"] 