FROM node:20-alpine

WORKDIR /app

# Install dependencies first (for faster caching)
COPY package.json ./
# Check if package-lock.json exists before copying
COPY package-lock.json* ./

RUN npm install

# Copy source code
COPY . .

EXPOSE 3000

# Next.js by default binds to localhost inside the container.
# We explicitly bind it to 0.0.0.0 so we can access it from the host.
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]
