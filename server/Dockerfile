# Portable container for the Wavelength backend.
# Works on Render, Railway, Fly.io, or any Docker host.
#   docker build -t wavelength-api .
#   docker run -p 4000:4000 --env-file .env wavelength-api
FROM node:20-alpine

WORKDIR /app

# Install production deps only (devDeps are for the in-memory test DB)
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
# The server reads process.env.PORT (hosts set this automatically); 4000 is the local default.
EXPOSE 4000

CMD ["npm", "start"]
