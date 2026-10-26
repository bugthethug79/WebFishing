# Run the WebFishing server in a container:
#   docker build -t webfishing-server .
#   docker run -d -p 8787:8787 -v webfishing-data:/app/data -v $(pwd)/config.json:/app/config.json webfishing-server
FROM node:22-alpine
WORKDIR /app
COPY server.js package.json ./
EXPOSE 8787
CMD ["node", "server.js"]
