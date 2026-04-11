# Use the version that matches your local environment
FROM node:22-alpine

# Set the working directory
WORKDIR /app

# Prisma query engine on Alpine needs OpenSSL runtime libraries.
RUN apk add --no-cache openssl

# Copy dependency files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the Prisma folder specifically (important if it's in a subfolder)
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy the rest of your application code
COPY . .

# Next.js listens on 3000 by default
EXPOSE 3000

# Run the production server
CMD ["npm", "start"]
