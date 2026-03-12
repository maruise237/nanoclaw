# Dockerfile for NanoClaw Orchestrator
FROM node:20

# Install Docker CLI to allow the orchestrator to spawn agent containers
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null \
    && apt-get update && apt-get install -y docker-ce-cli \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build the project
RUN npm run build

# Create necessary directories for persistence
RUN mkdir -p data groups store logs

# Expose the credential proxy port
EXPOSE 3001

# Start the orchestrator directly with node for cleaner logs
CMD ["node", "dist/index.js"]
