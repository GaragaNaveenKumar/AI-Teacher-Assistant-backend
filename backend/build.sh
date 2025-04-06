#!/usr/bin/env bash
FROM node:22.14.0

WORKDIR /app

# Install Linux dependencies for pdf-poppler, tesseract.js, and sharp
RUN apt-get update && apt-get install -y \
  poppler-utils \
  tesseract-ocr \
  libvips-dev \
  && rm -rf /var/lib/apt/lists/*

# Copy package files and install Node dependencies
COPY package.json yarn.lock ./
RUN yarn install --production

# Copy the rest of the app
COPY . .

# Expose port (Render will override with process.env.PORT)
EXPOSE 5000

# Start the app
CMD ["node", "server.js"]