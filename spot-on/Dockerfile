# Use the version that matches your local environment
FROM node:22-alpine

# Set the working directory
WORKDIR /app

# Copy dependency files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the Prisma folder specifically (important if it's in a subfolder)
COPY prisma ./prisma/

# Copy the rest of your application code
COPY . .

# Next.js listens on 3000 by default
EXPOSE 3000

# Run the production server
CMD ["npm", "start"]

# Install Node.js type definitions for TypeScript
RUN npm i --save-dev @types/node
