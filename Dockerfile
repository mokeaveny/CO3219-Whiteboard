FROM node:12

# To Create nodejsapp directory
WORKDIR /nodejsapp

# To Install All dependencies

COPY package*.json ./

RUN npm install

# To copy all application packages 
COPY . .

# Expose port 3001 and Run the index.js file to start node js application
EXPOSE 3001
CMD [ "node", "index.js" ]